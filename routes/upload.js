const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');

/**
 * File Upload Routes
 * Contains intentional vulnerabilities:
 * - Unrestricted file upload (shell upload)
 * - Path traversal
 * - No file size limits
 * - Weak file validation
 * - Directory listing
 * - LFI (Local File Inclusion)
 */

// VULNERABILITY: Insecure file storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = req.body.uploadDir || 'uploads';
        // VULNERABILITY: Path traversal - can upload to any directory
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // VULNERABILITY: No filename sanitization
        const filename = req.body.filename || file.originalname;
        cb(null, filename);
    }
});

// VULNERABILITY: No file type or size restrictions
const upload = multer({ 
    storage: storage,
    // No fileFilter - accepts ANY file type including .php, .jsp, .exe
    // No limits - can upload huge files (up to server memory)
});

// Upload avatar/profile picture
router.post('/avatar', isAuthenticated, upload.single('avatar'), (req, res) => {
    try {
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No file uploaded' 
            });
        }

        // VULNERABILITY: No file type validation
        // Accepts .php, .jsp, .exe, shell scripts, etc.
        const fileName = req.file.filename;
        
        // Update user's avatar in database
        db.prepare('UPDATE users SET avatar = ? WHERE id = ?')
          .run(fileName, userId);

        // Check if dangerous file uploaded
        let flag = null;
        const dangerousExtensions = ['.php', '.jsp', '.asp', '.exe', '.sh', '.py', '.rb'];
        if (dangerousExtensions.some(ext => fileName.toLowerCase().endsWith(ext))) {
            flag = 'FLAG{unr3str1ct3d_f1l3_upl04d}';
        }

        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            filename: fileName,
            path: `/uploads/${fileName}`,
            hint: 'Try uploading a PHP shell or other executable files...',
            flag: flag
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Upload product image (vendor/admin only)
router.post('/product-image', isAuthenticated, upload.single('image'), (req, res) => {
    try {
        // VULNERABILITY: Weak authorization check
        if (!req.user.isAdmin && req.user.username !== 'admin') {
            return res.status(403).json({ 
                success: false,
                error: 'Admin access required',
                hint: '<!-- Manipulate your session to change role -->'
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No file uploaded' 
            });
        }

        res.json({
            success: true,
            message: 'Product image uploaded',
            filename: req.file.filename,
            path: `/uploads/products/${req.file.filename}`
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Upload support ticket attachment
router.post('/ticket-attachment', isAuthenticated, upload.single('attachment'), (req, res) => {
    try {
        const userId = req.user.id;
        const ticketId = req.body.ticket_id;

        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No file uploaded' 
            });
        }

        // VULNERABILITY: No validation of file content
        // Can upload malicious files disguised as PDFs, images, etc.
        
        res.json({
            success: true,
            message: 'Attachment uploaded',
            filename: req.file.filename,
            path: `/uploads/tickets/${req.file.filename}`,
            flag_hint: 'Upload a webshell and access it...'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Multiple file upload
router.post('/bulk', isAuthenticated, upload.array('files', 10), (req, res) => {
    try {
        const userId = req.user.id;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'No files uploaded' 
            });
        }

        const uploadedFiles = req.files.map(file => ({
            filename: file.filename,
            path: `/uploads/${file.filename}`,
            size: file.size
        }));

        res.json({
            success: true,
            message: `${req.files.length} files uploaded`,
            files: uploadedFiles
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// List uploaded files - VULNERABILITY: Directory listing
router.get('/list', (req, res) => {
    try {
        // VULNERABILITY: No authentication required
        const directory = req.query.dir || 'uploads';
        
        // VULNERABILITY: Path traversal
        const dirPath = path.join(__dirname, '..', directory);
        
        fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
            if (err) {
                return res.status(500).json({ 
                    success: false,
                    error: err.message,
                    path: dirPath // Information disclosure
                });
            }

            const fileList = files.map(file => ({
                name: file.name,
                isDirectory: file.isDirectory(),
                path: `/${directory}/${file.name}`
            }));

            let flag = null;
            if (directory.includes('..')) {
                flag = 'FLAG{d1r3ct0ry_tr4v3rs4l}';
            }

            res.json({
                success: true,
                directory: directory,
                files: fileList,
                count: fileList.length,
                hint: 'Try directory traversal with ?dir=../',
                flag: flag
            });
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Download file - VULNERABILITY: Path traversal
router.get('/download', (req, res) => {
    try {
        const filename = req.query.file;
        
        if (!filename) {
            return res.status(400).json({ 
                success: false,
                error: 'Filename required' 
            });
        }

        // VULNERABILITY: No path sanitization - can access any file
        const filePath = path.join(__dirname, '..', 'uploads', filename);
        
        // VULNERABILITY: No authentication check
        res.download(filePath, (err) => {
            if (err) {
                res.status(404).json({ 
                    success: false,
                    error: 'File not found',
                    path: filePath, // Information disclosure
                    hint: 'Try path traversal: ?file=../../database/vuln_app.db'
                });
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// View file - VULNERABILITY: LFI (Local File Inclusion)
router.get('/view', (req, res) => {
    try {
        const filename = req.query.file;
        
        if (!filename) {
            return res.status(400).json({ 
                success: false,
                error: 'Filename required' 
            });
        }

        // VULNERABILITY: Direct file read without sanitization
        const filePath = path.join(__dirname, '..', 'uploads', filename);
        
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).json({ 
                    success: false,
                    error: err.message,
                    path: filePath,
                    hint: 'Try: ?file=../../package.json'
                });
            }

            let flag = null;
            if (filename.includes('..')) {
                flag = 'FLAG{local_file_inclusion_achieved}';
            }

            res.json({
                success: true,
                filename: filename,
                content: data,
                size: data.length,
                flag: flag
            });
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Delete file - VULNERABILITY: IDOR + Path traversal
router.delete('/delete', (req, res) => {
    try {
        const filename = req.query.file;
        
        if (!filename) {
            return res.status(400).json({ 
                success: false,
                error: 'Filename required' 
            });
        }

        // VULNERABILITY: No authentication or authorization
        // VULNERABILITY: Path traversal - can delete any file
        const filePath = path.join(__dirname, '..', 'uploads', filename);
        
        fs.unlink(filePath, (err) => {
            if (err) {
                return res.status(500).json({ 
                    success: false,
                    error: err.message 
                });
            }

            res.json({
                success: true,
                message: 'File deleted',
                filename: filename,
                hint: 'You can delete any file in uploads!',
                warning: 'Be careful with this power!'
            });
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get file metadata
router.get('/info', (req, res) => {
    try {
        const filename = req.query.file;
        
        if (!filename) {
            return res.status(400).json({ 
                success: false,
                error: 'Filename required' 
            });
        }

        // VULNERABILITY: Path traversal
        const filePath = path.join(__dirname, '..', 'uploads', filename);
        
        fs.stat(filePath, (err, stats) => {
            if (err) {
                return res.status(404).json({ 
                    success: false,
                    error: 'File not found' 
                });
            }

            res.json({
                success: true,
                filename: filename,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                permissions: stats.mode.toString(8)
            });
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

module.exports = router;
