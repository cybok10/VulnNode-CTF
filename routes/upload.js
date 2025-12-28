const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { isAuthenticated } = require('../middleware/auth');

// ============================================================
// FILE UPLOAD ROUTES WITH VULNERABILITIES
// ============================================================
// Insecure file upload allowing webshell deployment

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
const productsDir = path.join(uploadsDir, 'products');
const ticketsDir = path.join(uploadsDir, 'tickets');

[uploadsDir, avatarsDir, productsDir, ticketsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ============================================================
// VULNERABLE FILE UPLOAD CONFIGURATION
// ============================================================

// VULNERABILITY: No file type validation
// VULNERABILITY: Preserves original file extension
// VULNERABILITY: Predictable filenames
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = avatarsDir;
        
        if (req.body.upload_type === 'product') {
            uploadPath = productsDir;
        } else if (req.body.upload_type === 'ticket') {
            uploadPath = ticketsDir;
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // VULNERABILITY: Preserves original extension without validation
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const timestamp = Date.now();
        
        // VULNERABILITY: Predictable filename pattern
        cb(null, `${name}_${timestamp}${ext}`);
    }
});

// VULNERABILITY: No file size limits
// VULNERABILITY: No file type filtering
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB - Very large limit
    }
    // NO fileFilter - accepts any file type!
});

// ============================================================
// UPLOAD ENDPOINTS
// ============================================================

// --- UPLOAD AVATAR ---
router.post('/avatar', isAuthenticated, upload.single('avatar'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file uploaded' 
            });
        }

        const fileUrl = `/uploads/avatars/${req.file.filename}`;

        // Update user avatar in database
        db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(fileUrl, req.user.id);

        // VULNERABILITY: Returns full file path and system information
        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                path: req.file.path, // VULNERABILITY: Exposes full system path
                url: fileUrl,
                uploadedBy: req.user.username,
                uploadedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Upload failed',
            error: error.message,
            stack: error.stack // VULNERABILITY: Stack trace exposure
        });
    }
});

// --- UPLOAD PRODUCT IMAGE (VENDOR/ADMIN) ---
router.post('/product', isAuthenticated, upload.single('product_image'), (req, res) => {
    try {
        // VULNERABILITY: Weak authorization check
        if (req.user.role !== 'vendor' && req.user.username !== 'admin') {
            // But can be bypassed by modifying user object
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file uploaded' 
            });
        }

        const fileUrl = `/uploads/products/${req.file.filename}`;
        const { product_id } = req.body;

        if (product_id) {
            // Update product image
            db.prepare('UPDATE products SET image_url = ? WHERE id = ?').run(fileUrl, product_id);
        }

        res.json({
            success: true,
            message: 'Product image uploaded successfully',
            file: {
                filename: req.file.filename,
                size: req.file.size,
                url: fileUrl,
                systemPath: req.file.path // VULNERABILITY: Path disclosure
            }
        });
    } catch (error) {
        console.error('Product upload error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// --- UPLOAD TICKET ATTACHMENT ---
router.post('/ticket-attachment', isAuthenticated, upload.single('attachment'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file uploaded' 
            });
        }

        const fileUrl = `/uploads/tickets/${req.file.filename}`;
        const { ticket_id } = req.body;

        // Store attachment reference
        if (ticket_id) {
            db.prepare(`
                INSERT INTO ticket_messages (ticket_id, user_id, message, is_admin)
                VALUES (?, ?, ?, 0)
            `).run(ticket_id, req.user.id, `Attachment: ${fileUrl}`);
        }

        res.json({
            success: true,
            message: 'Attachment uploaded successfully',
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                url: fileUrl
            }
        });
    } catch (error) {
        console.error('Attachment upload error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// --- MULTIPLE FILE UPLOAD ---
router.post('/multiple', isAuthenticated, upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No files uploaded' 
            });
        }

        const uploadedFiles = req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            url: `/uploads/avatars/${file.filename}`,
            systemPath: file.path // VULNERABILITY: Path disclosure
        }));

        res.json({
            success: true,
            message: `${req.files.length} files uploaded successfully`,
            files: uploadedFiles
        });
    } catch (error) {
        console.error('Multiple upload error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// --- LIST UPLOADED FILES (DIRECTORY LISTING VULNERABILITY) ---
router.get('/list', isAuthenticated, (req, res) => {
    try {
        const { directory } = req.query;

        // VULNERABILITY: Directory traversal
        // User can list any directory by providing path
        let targetDir = avatarsDir;

        if (directory) {
            // DANGEROUS: No path sanitization
            targetDir = path.join(uploadsDir, directory);
        }

        // Read directory contents
        const files = fs.readdirSync(targetDir).map(filename => {
            const filePath = path.join(targetDir, filename);
            const stats = fs.statSync(filePath);

            return {
                filename: filename,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                isDirectory: stats.isDirectory(),
                path: filePath // VULNERABILITY: Full path exposure
            };
        });

        res.json({
            success: true,
            directory: targetDir,
            files: files
        });
    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            requestedPath: req.query.directory // VULNERABILITY: Path disclosure in error
        });
    }
});

// --- DOWNLOAD FILE (PATH TRAVERSAL VULNERABILITY) ---
router.get('/download', isAuthenticated, (req, res) => {
    try {
        const { file } = req.query;

        if (!file) {
            return res.status(400).json({ 
                success: false, 
                message: 'File parameter required' 
            });
        }

        // VULNERABILITY: No path sanitization - Path Traversal
        // User can download any file using ../../../etc/passwd
        const filePath = path.join(uploadsDir, file);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ 
                success: false, 
                message: 'File not found',
                attemptedPath: filePath // VULNERABILITY: Path disclosure
            });
        }

        // Send file
        res.download(filePath);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// --- DELETE FILE ---
router.delete('/delete', isAuthenticated, (req, res) => {
    try {
        const { file } = req.body;

        if (!file) {
            return res.status(400).json({ 
                success: false, 
                message: 'File parameter required' 
            });
        }

        // VULNERABILITY: No ownership validation
        // User can delete any uploaded file
        const filePath = path.join(uploadsDir, file);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ 
                success: false, 
                message: 'File not found' 
            });
        }

        // Delete file
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: 'File deleted successfully',
            deletedFile: file
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// --- VIEW FILE METADATA ---
router.get('/info', isAuthenticated, (req, res) => {
    try {
        const { file } = req.query;

        if (!file) {
            return res.status(400).json({ 
                success: false, 
                message: 'File parameter required' 
            });
        }

        // VULNERABILITY: Path traversal
        const filePath = path.join(uploadsDir, file);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ 
                success: false, 
                message: 'File not found' 
            });
        }

        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8').substring(0, 500); // VULNERABILITY: Reads file content

        res.json({
            success: true,
            file: {
                name: path.basename(filePath),
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                isDirectory: stats.isDirectory(),
                permissions: stats.mode,
                fullPath: filePath, // VULNERABILITY: Path disclosure
                preview: content    // VULNERABILITY: Content disclosure
            }
        });
    } catch (error) {
        console.error('File info error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;