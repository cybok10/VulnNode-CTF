const express = require('express');
const router = express.Router();
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/vuln_app.db');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Enable file upload
router.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB - too large!
    abortOnLimit: false,
    // VULNERABILITY: No file type restrictions at middleware level
}));

// Upload Avatar - UNRESTRICTED FILE UPLOAD
router.post('/avatar', isAuthenticated, (req, res) => {
    if (!req.files || !req.files.avatar) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const avatar = req.files.avatar;
    const userId = req.session.user.id;
    
    // VULNERABILITY: No file type validation
    // VULNERABILITY: No file size check (can upload large files)
    // VULNERABILITY: Using original filename (path traversal)
    
    // VULNERABILITY: Weak filename sanitization
    const filename = avatar.name.replace(/\s+/g, '_');
    const uploadPath = path.join(__dirname, '../uploads/avatars/', filename);
    
    // VULNERABILITY: Not checking if file already exists
    // VULNERABILITY: No content-type verification
    
    avatar.mv(uploadPath, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Update user avatar path
        const avatarUrl = `/uploads/avatars/${filename}`;
        
        db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, userId], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                message: 'Avatar uploaded successfully',
                avatar_url: avatarUrl,
                filename: filename,
                warning: 'No file type validation!'
            });
        });
    });
});

// Upload Product Image - Vendor Feature
router.post('/product-image', isAuthenticated, (req, res) => {
    if (!req.files || !req.files.image) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const image = req.files.image;
    const { product_id } = req.body;
    
    // VULNERABILITY: No vendor verification
    // VULNERABILITY: No file extension whitelist
    // VULNERABILITY: Trusting client-provided MIME type
    
    const ext = path.extname(image.name);
    const filename = `product_${product_id}_${Date.now()}${ext}`;
    const uploadPath = path.join(__dirname, '../uploads/products/', filename);
    
    image.mv(uploadPath, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const imageUrl = `/uploads/products/${filename}`;
        
        // Update product image
        db.run('UPDATE products SET image = ? WHERE id = ?', [imageUrl, product_id], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                message: 'Product image uploaded',
                image_url: imageUrl
            });
        });
    });
});

// Upload Ticket Attachment
router.post('/ticket-attachment', isAuthenticated, (req, res) => {
    if (!req.files || !req.files.attachment) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const attachment = req.files.attachment;
    const { ticket_id } = req.body;
    
    // VULNERABILITY: No file type restriction
    // Can upload executable files, scripts, etc.
    
    // VULNERABILITY: Using MD5 for filename (weak hash)
    const hash = crypto.createHash('md5').update(attachment.name + Date.now()).digest('hex');
    const ext = path.extname(attachment.name);
    const filename = `${hash}${ext}`;
    const uploadPath = path.join(__dirname, '../uploads/attachments/', filename);
    
    attachment.mv(uploadPath, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            message: 'Attachment uploaded',
            file_url: `/uploads/attachments/${filename}`,
            original_name: attachment.name,
            size: attachment.size,
            mime_type: attachment.mimetype
        });
    });
});

// Download File - PATH TRAVERSAL VULNERABILITY
router.get('/download/:filename', (req, res) => {
    const { filename } = req.params;
    const { type = 'avatars' } = req.query;
    
    // VULNERABILITY: No authentication required
    // VULNERABILITY: Path traversal via filename parameter
    // Can use ../../../etc/passwd
    
    const filePath = path.join(__dirname, '../uploads/', type, filename);
    
    // VULNERABILITY: No validation of file path
    if (fs.existsSync(filePath)) {
        res.download(filePath, (err) => {
            if (err) {
                res.status(500).json({ error: 'Download failed' });
            }
        });
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// List Uploaded Files - Information Disclosure
router.get('/files', isAuthenticated, (req, res) => {
    const { directory = 'avatars' } = req.query;
    
    // VULNERABILITY: No directory validation
    // Can list any directory on the system
    
    const dirPath = path.join(__dirname, '../uploads/', directory);
    
    fs.readdir(dirPath, (err, files) => {
        if (err) {
            // VULNERABILITY: Exposing file system errors
            return res.status(500).json({ 
                error: err.message,
                path: dirPath
            });
        }
        
        // VULNERABILITY: Exposing all files in directory
        const fileDetails = files.map(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            
            return {
                filename: file,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                url: `/uploads/${directory}/${file}`
            };
        });
        
        res.json({ 
            directory: directory,
            files: fileDetails
        });
    });
});

// Delete File - IDOR
router.delete('/files/:filename', isAuthenticated, (req, res) => {
    const { filename } = req.params;
    const { type = 'avatars' } = req.query;
    
    // VULNERABILITY: No ownership check
    // Any user can delete any file
    
    const filePath = path.join(__dirname, '../uploads/', type, filename);
    
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ message: 'File deleted' });
    });
});

// Admin: Bulk Upload
router.post('/admin/bulk-upload', isAdmin, (req, res) => {
    if (!req.files) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // VULNERABILITY: No file type validation
    // VULNERABILITY: Can upload multiple malicious files
    
    const files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
    const uploaded = [];
    
    files.forEach(file => {
        const filename = file.name;
        const uploadPath = path.join(__dirname, '../uploads/admin/', filename);
        
        // VULNERABILITY: Synchronous file operations (DoS)
        file.mv(uploadPath, (err) => {
            if (!err) {
                uploaded.push({
                    filename: filename,
                    url: `/uploads/admin/${filename}`
                });
            }
        });
    });
    
    // VULNERABILITY: Response sent before files are moved
    setTimeout(() => {
        res.json({
            message: 'Files uploaded',
            files: uploaded
        });
    }, 1000);
});

// Upload with Custom Path - EXTREME VULNERABILITY
router.post('/custom-upload', isAuthenticated, (req, res) => {
    if (!req.files || !req.files.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const file = req.files.file;
    const { path: customPath } = req.body;
    
    // VULNERABILITY: User-controlled file path
    // Can write files anywhere on the system
    
    if (!customPath) {
        return res.status(400).json({ error: 'Custom path required' });
    }
    
    // VULNERABILITY: No path sanitization
    const uploadPath = path.join(__dirname, '../uploads/', customPath);
    
    file.mv(uploadPath, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            message: 'File uploaded to custom location',
            path: uploadPath,
            warning: 'This endpoint allows arbitrary file writes!'
        });
    });
});

// Check File Existence - Information Disclosure
router.get('/check/:filename', (req, res) => {
    const { filename } = req.params;
    const { type = 'avatars' } = req.query;
    
    // VULNERABILITY: No authentication
    // Can enumerate files on the system
    
    const filePath = path.join(__dirname, '../uploads/', type, filename);
    
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        
        // VULNERABILITY: Exposing file metadata
        res.json({
            exists: true,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            is_directory: stats.isDirectory()
        });
    } else {
        res.json({ exists: false });
    }
});

// Read File Content - LFI VULNERABILITY
router.get('/read/:filename', (req, res) => {
    const { filename } = req.params;
    const { type = 'avatars' } = req.query;
    
    // VULNERABILITY: Path traversal + LFI
    // Can read any file on the system
    
    const filePath = path.join(__dirname, '../uploads/', type, filename);
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ 
                error: err.message,
                attempted_path: filePath
            });
        }
        
        // VULNERABILITY: Serving file content directly
        res.send(data);
    });
});

// ZIP File Upload and Extract - COMMAND INJECTION
router.post('/upload-zip', isAuthenticated, (req, res) => {
    if (!req.files || !req.files.zipfile) {
        return res.status(400).json({ error: 'No ZIP file uploaded' });
    }
    
    const zipfile = req.files.zipfile;
    const filename = `upload_${Date.now()}.zip`;
    const uploadPath = path.join(__dirname, '../uploads/temp/', filename);
    
    zipfile.mv(uploadPath, (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // VULNERABILITY: Command injection via unzip
        const { exec } = require('child_process');
        const extractPath = path.join(__dirname, '../uploads/extracted/');
        
        // VULNERABILITY: No input sanitization
        const command = `unzip ${uploadPath} -d ${extractPath}`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ 
                    error: error.message,
                    command: command // Exposing command
                });
            }
            
            res.json({
                message: 'ZIP extracted',
                output: stdout,
                extract_path: extractPath
            });
        });
    });
});

// Image Resize - SSRF via Image URL
router.post('/resize-image', isAuthenticated, (req, res) => {
    const { image_url, width, height } = req.body;
    
    // VULNERABILITY: SSRF via image_url
    // Can fetch internal resources
    
    const axios = require('axios');
    
    axios.get(image_url, { responseType: 'arraybuffer' })
        .then(response => {
            // VULNERABILITY: No actual image validation
            // Just returning the fetched content
            
            res.json({
                message: 'Image fetched (resize not implemented)',
                size: response.data.length,
                content_type: response.headers['content-type'],
                warning: 'This endpoint has SSRF vulnerability!'
            });
        })
        .catch(error => {
            res.status(500).json({ 
                error: error.message,
                url: image_url
            });
        });
});

module.exports = router;