const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * ADMIN PANEL - EXTREMELY VULNERABLE BY DESIGN
 * Contains: RCE, SQLi, LFI, Command Injection, etc.
 * This is for CTF educational purposes!
 */

// Admin Dashboard
router.get('/dashboard', isAdmin, (req, res) => {
    try {
        const stats = db.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM products) as total_products,
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed') as total_revenue,
                (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') as open_tickets
        `).get();
        
        res.json({
            success: true,
            dashboard: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get All Users
router.get('/users', isAdmin, (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        
        let query = 'SELECT id, username, email, first_name, last_name, isAdmin, balance, created_at FROM users';
        
        // VULNERABILITY: SQL Injection in search
        if (search) {
            query += ` WHERE username LIKE '%${search}%' OR email LIKE '%${search}%'`;
        }
        
        const offset = (page - 1) * limit;
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        
        const users = db.prepare(query).all(parseInt(limit), offset);
        
        res.json({ 
            success: true,
            users: users 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message,
            query: req.query 
        });
    }
});

// Get User Details - IDOR
router.get('/users/:user_id', isAdmin, (req, res) => {
    try {
        const { user_id } = req.params;
        
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }
        
        // VULNERABILITY: Exposing password hashes
        // VULNERABILITY: Exposing sensitive PII
        
        res.json({ 
            success: true,
            user: user 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Update User - Mass Assignment
router.put('/users/:user_id', isAdmin, (req, res) => {
    try {
        const { user_id } = req.params;
        const updates = req.body;
        
        // VULNERABILITY: Mass assignment
        // Admin can update any field, including isAdmin, balance, etc.
        
        const fields = [];
        const values = [];
        
        Object.keys(updates).forEach(key => {
            fields.push(`${key} = ?`);
            values.push(updates[key]);
        });
        
        if (fields.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'No fields to update' 
            });
        }
        
        values.push(user_id);
        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
        
        const result = db.prepare(query).run(...values);
        
        res.json({ 
            success: true,
            message: 'User updated',
            affected: result.changes
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Delete User
router.delete('/users/:user_id', isAdmin, (req, res) => {
    try {
        const { user_id } = req.params;
        
        // VULNERABILITY: No check to prevent deleting yourself
        
        const result = db.prepare('DELETE FROM users WHERE id = ?').run(user_id);
        
        res.json({ 
            success: true,
            message: 'User deleted',
            affected: result.changes
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// System Health Check - COMMAND INJECTION
router.get('/health', isAdmin, (req, res) => {
    const { check } = req.query;
    
    // VULNERABILITY: Command injection via check parameter
    // Can execute arbitrary system commands
    
    let command;
    
    if (check === 'disk') {
        command = 'df -h';
    } else if (check === 'memory') {
        command = 'free -m || echo "Not Linux"';
    } else if (check === 'processes') {
        command = 'ps aux || tasklist';
    } else if (check) {
        // VULNERABILITY: Direct command execution from user input
        command = check;
    } else {
        command = 'uptime || echo "Uptime not available"';
    }
    
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
        let flag = null;
        if (check && !['disk', 'memory', 'processes'].includes(check)) {
            flag = 'FLAG{c0mm4nd_1nj3ct10n_rce}';
        }
        
        res.json({
            success: !error,
            check: check || 'uptime',
            output: stdout || error?.message,
            stderr: stderr,
            command: command, // Exposing executed command
            flag: flag
        });
    });
});

// View Logs - LFI VULNERABILITY
router.get('/logs', isAdmin, (req, res) => {
    const { file = 'app.log', lines = 100 } = req.query;
    
    // VULNERABILITY: Path traversal via file parameter
    // Can read any file on the system
    
    const logPath = path.join(__dirname, '../logs/', file);
    
    // VULNERABILITY: No file path validation
    fs.readFile(logPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message,
                attempted_path: logPath,
                hint: 'Try path traversal like ../../../etc/passwd'
            });
        }
        
        // Get last N lines
        const logLines = data.split('\n').slice(-parseInt(lines));
        
        let flag = null;
        if (file.includes('..')) {
            flag = 'FLAG{lf1_p4th_tr4v3rs4l}';
        }
        
        res.json({
            success: true,
            file: file,
            lines: logLines,
            total_lines: data.split('\n').length,
            path: logPath, // Exposing file path
            flag: flag
        });
    });
});

// Execute Database Query - EXTREME SQL INJECTION
router.post('/db-query', isAdmin, (req, res) => {
    const { query } = req.body;
    
    if (!query) {
        return res.status(400).json({ 
            success: false,
            error: 'Query required' 
        });
    }
    
    try {
        // VULNERABILITY: Direct SQL execution from user input
        // Admin can execute ANY SQL query
        
        const results = db.prepare(query).all();
        
        res.json({
            success: true,
            message: 'Query executed',
            results: results,
            row_count: results.length,
            flag: 'FLAG{sql_4dm1n_qu3ry_3x3c}'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message,
            query: query
        });
    }
});

// Backup Database - Command Injection
router.post('/backup', isAdmin, (req, res) => {
    const { filename } = req.body;
    
    // VULNERABILITY: Command injection via filename
    const backupName = filename || `backup_${Date.now()}.db`;
    const command = `cp ./database/vuln_app.db ./backups/${backupName} || echo "Backup feature"`;
    
    exec(command, (error, stdout, stderr) => {
        res.json({
            success: !error,
            message: error ? 'Backup command failed' : 'Database backup attempted',
            filename: backupName,
            command: command,
            output: stdout || stderr || error?.message
        });
    });
});

// Evaluate Code - EXTREME RCE
router.post('/eval', isAdmin, (req, res) => {
    const { code } = req.body;
    
    if (!code) {
        return res.status(400).json({ 
            success: false,
            error: 'Code required' 
        });
    }
    
    // VULNERABILITY: Direct code evaluation
    // Allows complete system compromise
    
    try {
        const result = eval(code);
        res.json({
            success: true,
            message: 'Code executed',
            result: result,
            warning: 'This endpoint allows arbitrary code execution!',
            flag: 'FLAG{3v4l_rc3_c0mpl3t3}'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message,
            code: code
        });
    }
});

// Export Users - Mass Data Exposure
router.get('/export-users', isAdmin, (req, res) => {
    try {
        const users = db.prepare('SELECT * FROM users').all();
        
        // VULNERABILITY: Exporting passwords, everything
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=users_export.json');
        res.json({ 
            success: true,
            users: users,
            exported_at: new Date().toISOString(),
            warning: 'This export contains sensitive data including password hashes!'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Server Info - Information Disclosure
router.get('/server-info', isAdmin, (req, res) => {
    // VULNERABILITY: Exposing sensitive server information
    res.json({
        success: true,
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        cwd: process.cwd(),
        env: process.env, // CRITICAL: Exposing all environment variables
        versions: process.versions,
        flag: 'FLAG{1nf0rm4t10n_d1scl0sur3}'
    });
});

// Privilege Escalation via Mass Assignment
router.post('/promote-user', (req, res) => {
    const { user_id, api_key } = req.body;
    
    try {
        // VULNERABILITY: Weak API key check
        if (api_key === 'VN_ADMIN_KEY_12345') {
            // VULNERABILITY: Anyone with admin API key can promote users
            db.prepare('UPDATE users SET isAdmin = 1 WHERE id = ?').run(user_id);
            
            res.json({ 
                success: true,
                message: 'User promoted to admin',
                warning: 'API key authentication is weak!',
                flag: 'FLAG{pr1v1l3g3_3sc4l4t10n}'
            });
        } else {
            res.status(403).json({ 
                success: false,
                error: 'Invalid API key',
                hint: 'Check the source code for hardcoded keys...'
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

module.exports = router;
