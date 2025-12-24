const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Middleware to check if user is admin
// VULNERABILITY: If the session token was forged (JWT 'none' algo), this check passes.
function ensureAdmin(req, res, next) {
    if (req.session.user && req.session.user.isAdmin) {
        return next();
    }
    res.status(403).send("<h1>403 Forbidden</h1><p>Admins only.</p>");
}

// Apply middleware
router.use(ensureAdmin);

/**
 * GET /admin
 * Admin Dashboard
 */
router.get('/', (req, res) => {
    res.render('admin', { 
        user: req.session.user,
        output: null 
    });
});

/**
 * POST /admin/system-health
 * VULNERABILITY: COMMAND INJECTION
 */
router.post('/system-health', (req, res) => {
    const ip = req.body.ip;

    // ============================================================
    // VULNERABILITY: OS COMMAND INJECTION
    // ============================================================
    // The input 'ip' is concatenated directly into a shell command.
    // Payload: 127.0.0.1; cat /etc/passwd
    // Payload: 127.0.0.1; cat config/secrets.js

    exec(`ping -c 1 ${ip}`, (error, stdout, stderr) => {
        let output = stdout;
        if (error) {
            output += `\nError: ${stderr}`;
        }
        
        res.render('admin', { 
            user: req.session.user,
            output: output 
        });
    });
});

/**
 * GET /admin/logs
 * VULNERABILITY: LOCAL FILE INCLUSION (LFI) / PATH TRAVERSAL
 */
router.get('/logs', (req, res) => {
    const filename = req.query.file;

    // Default to a dummy log if none provided
    if (!filename) {
        return res.render('admin', { user: req.session.user, output: "Select a log file to view." });
    }

    // ============================================================
    // VULNERABILITY: PATH TRAVERSAL
    // ============================================================
    // No validation prevents "../" characters.
    // Payload: /admin/logs?file=../../package.json
    // Payload: /admin/logs?file=../../database/vuln_app.db (Download DB)

    const logPath = path.join(__dirname, '../logs', filename); // Intention: only look in logs/

    // We use readFile instead of render to allow reading non-template files
    fs.readFile(logPath, 'utf8', (err, data) => {
        if (err) {
            return res.render('admin', { user: req.session.user, output: `Could not read file: ${err.message}` });
        }
        res.render('admin', { user: req.session.user, output: data });
    });
});

// ============================================================
// VULNERABILITY: UNRESTRICTED FILE UPLOAD
// ============================================================
// We allow any file type. If the server was PHP, this would be game over immediately.
// Since it's Node, attackers might upload a new .js route or overwrite existing files 
// if they can guess the path (File Overwrite).
// Or they upload HTML/SVG to achieve Stored XSS on the admin domain.

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        // VULNERABILITY: We keep the original name. 
        // Setup for Directory Traversal via filename if library was older, 
        // but here it helps knowing where the file went.
        cb(null, file.originalname)
    }
});

const upload = multer({ storage: storage });

router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.send(`File uploaded successfully! Access it at <a href="/uploads/${req.file.originalname}">/uploads/${req.file.originalname}</a>`);
});

module.exports = router;