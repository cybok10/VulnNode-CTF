const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/vuln_app.db');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Admin Dashboard
router.get('/dashboard', isAdmin, (req, res) => {
    // Get various statistics
    db.all(`
        SELECT 
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM products) as total_products,
            (SELECT COUNT(*) FROM orders) as total_orders,
            (SELECT SUM(total_amount) FROM orders WHERE payment_status = 'completed') as total_revenue,
            (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') as open_tickets
    `, (err, stats) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            dashboard: stats[0],
            timestamp: new Date().toISOString()
        });
    });
});

// Get All Users
router.get('/users', isAdmin, (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    
    let query = 'SELECT id, username, email, first_name, last_name, isAdmin, isVendor, balance, created_at FROM users';
    const params = [];
    
    // VULNERABILITY: SQL Injection in search
    if (search) {
        query += ` WHERE username LIKE '%${search}%' OR email LIKE '%${search}%'`;
    }
    
    const offset = (page - 1) * limit;
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    db.all(query, params, (err, users) => {
        if (err) {
            return res.status(500).json({ error: err.message, query: query });
        }
        
        res.json({ users: users });
    });
});

// Get User Details - IDOR
router.get('/users/:user_id', isAdmin, (req, res) => {
    const { user_id } = req.params;
    
    db.get('SELECT * FROM users WHERE id = ?', [user_id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // VULNERABILITY: Exposing password hashes
        // VULNERABILITY: Exposing API keys
        // VULNERABILITY: Exposing sensitive PII
        
        res.json({ user: user });
    });
});

// Update User - Mass Assignment
router.put('/users/:user_id', isAdmin, (req, res) => {
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
        return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(user_id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    
    db.run(query, values, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ 
            message: 'User updated',
            affected: this.changes
        });
    });
});

// Delete User
router.delete('/users/:user_id', isAdmin, (req, res) => {
    const { user_id } = req.params;
    
    // VULNERABILITY: No check to prevent deleting yourself
    // VULNERABILITY: No cascading delete handling
    
    db.run('DELETE FROM users WHERE id = ?', [user_id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ message: 'User deleted' });
    });
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
        command = 'free -m';
    } else if (check === 'processes') {
        command = 'ps aux';
    } else if (check) {
        // VULNERABILITY: Direct command execution from user input
        command = check;
    } else {
        command = 'uptime';
    }
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ 
                error: error.message,
                command: command
            });
        }
        
        res.json({
            check: check || 'uptime',
            output: stdout,
            stderr: stderr,
            command: command // Exposing executed command
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
                error: err.message,
                attempted_path: logPath
            });
        }
        
        // Get last N lines
        const logLines = data.split('\n').slice(-parseInt(lines));
        
        res.json({
            file: file,
            lines: logLines,
            total_lines: data.split('\n').length,
            path: logPath // Exposing file path
        });
    });
});

// Database Logs from Table
router.get('/db-logs', isAdmin, (req, res) => {
    const { log_type, limit = 100 } = req.query;
    
    let query = 'SELECT * FROM logs';
    const params = [];
    
    // VULNERABILITY: SQL Injection
    if (log_type) {
        query += ` WHERE log_type = '${log_type}'`;
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(query, params, (err, logs) => {
        if (err) {
            return res.status(500).json({ error: err.message, query: query });
        }
        
        // VULNERABILITY: Logs may contain sensitive information
        res.json({ logs: logs });
    });
});

// Execute Database Query - EXTREME SQL INJECTION
router.post('/db-query', isAdmin, (req, res) => {
    const { query } = req.body;
    
    if (!query) {
        return res.status(400).json({ error: 'Query required' });
    }
    
    // VULNERABILITY: Direct SQL execution from user input
    // Admin can execute ANY SQL query
    
    db.all(query, (err, results) => {
        if (err) {
            return res.status(500).json({ 
                error: err.message,
                query: query
            });
        }
        
        res.json({
            message: 'Query executed',
            results: results,
            row_count: results.length
        });
    });
});

// Backup Database - Command Injection
router.post('/backup', isAdmin, (req, res) => {
    const { filename } = req.body;
    
    // VULNERABILITY: Command injection via filename
    const backupName = filename || `backup_${Date.now()}.db`;
    const command = `cp ./database/vuln_app.db ./backups/${backupName}`;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ 
                error: error.message,
                command: command
            });
        }
        
        res.json({
            message: 'Database backed up',
            filename: backupName,
            command: command
        });
    });
});

// Restore Database - Arbitrary File Read
router.post('/restore', isAdmin, (req, res) => {
    const { filename } = req.body;
    
    if (!filename) {
        return res.status(400).json({ error: 'Filename required' });
    }
    
    // VULNERABILITY: Path traversal
    const backupPath = path.join(__dirname, '../backups/', filename);
    
    // VULNERABILITY: No validation of file content
    const command = `cp ${backupPath} ./database/vuln_app.db`;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        res.json({ message: 'Database restored' });
    });
});

// Clear Cache - Command Injection
router.post('/clear-cache', isAdmin, (req, res) => {
    const { cache_type } = req.body;
    
    // VULNERABILITY: Command injection
    let command;
    
    switch(cache_type) {
        case 'all':
            command = 'rm -rf ./cache/*';
            break;
        case 'images':
            command = 'rm -rf ./cache/images/*';
            break;
        default:
            // VULNERABILITY: User-controlled command
            command = `rm -rf ./cache/${cache_type}/*`;
    }
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        res.json({ 
            message: 'Cache cleared',
            command: command
        });
    });
});

// Run Maintenance Script - RCE
router.post('/maintenance', isAdmin, (req, res) => {
    const { script, args } = req.body;
    
    // VULNERABILITY: Remote code execution
    // Admin can execute any script with any arguments
    
    const scriptPath = path.join(__dirname, '../scripts/', script || 'maintenance.sh');
    const command = `${scriptPath} ${args || ''}`;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ 
                error: error.message,
                command: command
            });
        }
        
        res.json({
            message: 'Script executed',
            output: stdout,
            stderr: stderr
        });
    });
});

// Export Users - Mass Data Exposure
router.get('/export-users', isAdmin, (req, res) => {
    db.all('SELECT * FROM users', (err, users) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // VULNERABILITY: Exporting passwords, API keys, everything
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=users_export.json');
        res.json({ 
            users: users,
            exported_at: new Date().toISOString(),
            warning: 'This export contains sensitive data including password hashes!'
        });
    });
});

// Server Info - Information Disclosure
router.get('/server-info', isAdmin, (req, res) => {
    // VULNERABILITY: Exposing sensitive server information
    res.json({
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        cwd: process.cwd(),
        env: process.env, // CRITICAL: Exposing all environment variables
        versions: process.versions
    });
});

// Evaluate Code - EXTREME RCE
router.post('/eval', isAdmin, (req, res) => {
    const { code } = req.body;
    
    if (!code) {
        return res.status(400).json({ error: 'Code required' });
    }
    
    // VULNERABILITY: Direct code evaluation
    // Allows complete system compromise
    
    try {
        const result = eval(code);
        res.json({
            message: 'Code executed',
            result: result,
            warning: 'This endpoint allows arbitrary code execution!'
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            code: code
        });
    }
});

// Update Application Settings - Arbitrary File Write
router.post('/settings', isAdmin, (req, res) => {
    const settings = req.body;
    
    // VULNERABILITY: Writing user input directly to file
    const settingsPath = path.join(__dirname, '../config/settings.json');
    
    fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ message: 'Settings updated' });
    });
});

// Get Application Settings
router.get('/settings', isAdmin, (req, res) => {
    const settingsPath = path.join(__dirname, '../config/settings.json');
    
    fs.readFile(settingsPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        try {
            const settings = JSON.parse(data);
            res.json({ settings: settings });
        } catch (e) {
            res.status(500).json({ error: 'Invalid settings file' });
        }
    });
});

// Privilege Escalation via Mass Assignment
router.post('/promote-user', (req, res) => {
    const { user_id, api_key } = req.body;
    
    // VULNERABILITY: Weak API key check
    if (api_key === 'VN_ADMIN_KEY_12345') {
        // VULNERABILITY: Anyone with admin API key can promote users
        db.run('UPDATE users SET isAdmin = 1 WHERE id = ?', [user_id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({ 
                message: 'User promoted to admin',
                warning: 'API key authentication is weak!'
            });
        });
    } else {
        res.status(403).json({ error: 'Invalid API key' });
    }
});

module.exports = router;