const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { optionalAuth, isAuthenticated } = require('../middleware/auth');

/**
 * REST API ROUTES
 * Contains IDOR, Mass Assignment, and API vulnerabilities
 */

// API Status
router.get('/status', (req, res) => {
    res.json({
        status: 'online',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        vulnerabilities: 'MANY!',
        ctf_mode: true
    });
});

// VULNERABILITY: IDOR - Get any user details
router.get('/users/:id', optionalAuth, (req, res) => {
    try {
        const userId = req.params.id;
        
        // VULNERABILITY: No authorization check - can view ANY user
        const user = db.prepare(`
            SELECT id, username, email, balance, avatar, 
                   loyalty_points, created_at, last_login
            FROM users 
            WHERE id = ?
        `).get(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }
        
        // VULNERABILITY: Leaking sensitive data
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

// VULNERABILITY: Mass Assignment / Parameter Tampering
router.post('/update-profile', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;
        
        // VULNERABILITY: Mass assignment - can update ANY field
        // Including balance, isAdmin, etc.
        
        const fields = [];
        const values = [];
        
        Object.keys(updates).forEach(key => {
            // No whitelist - accepts ANY field!
            fields.push(`${key} = ?`);
            values.push(updates[key]);
        });
        
        if (fields.length === 0) {
            return res.json({
                success: false,
                message: 'No fields to update'
            });
        }
        
        values.push(userId);
        const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
        
        db.prepare(sql).run(...values);
        
        // Check if exploited admin privilege
        let flag = null;
        if (updates.isAdmin || updates.balance) {
            flag = 'FLAG{m4ss_4ss1gnm3nt_vuln}';
        }
        
        res.json({ 
            success: true,
            message: 'Profile updated',
            updated: Object.keys(updates),
            flag: flag
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get all users (with pagination)
router.get('/users', optionalAuth, (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        const users = db.prepare(`
            SELECT id, username, email, avatar, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `).all(parseInt(limit), offset);
        
        const total = db.prepare('SELECT COUNT(*) as count FROM users').get();
        
        res.json({
            success: true,
            users: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total.count,
                pages: Math.ceil(total.count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get products API
router.get('/products', optionalAuth, (req, res) => {
    try {
        const { category, min_price, max_price, search } = req.query;
        
        let sql = 'SELECT * FROM products WHERE 1=1';
        const params = [];
        
        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }
        
        if (min_price) {
            sql += ' AND price >= ?';
            params.push(parseFloat(min_price));
        }
        
        if (max_price) {
            sql += ' AND price <= ?';
            params.push(parseFloat(max_price));
        }
        
        if (search) {
            sql += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        sql += ' ORDER BY is_featured DESC, id DESC';
        
        const products = db.prepare(sql).all(...params);
        
        res.json({
            success: true,
            products: products,
            count: products.length
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// VULNERABILITY: API Key bypass - Weak authentication
router.post('/admin/users', (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        
        // VULNERABILITY: Hardcoded API key
        if (apiKey !== 'VN_ADMIN_KEY_12345') {
            return res.status(403).json({ 
                success: false,
                error: 'Invalid API key',
                hint: 'Check the source code for hardcoded keys...'
            });
        }
        
        // Get all users with sensitive data
        const users = db.prepare('SELECT * FROM users').all();
        
        res.json({
            success: true,
            users: users,
            flag: 'FLAG{ap1_k3y_bypass}'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get user orders (IDOR)
router.get('/users/:id/orders', optionalAuth, (req, res) => {
    try {
        const userId = req.params.id;
        
        // VULNERABILITY: No authorization - can view any user's orders
        const orders = db.prepare(`
            SELECT * FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC
        `).all(userId);
        
        res.json({
            success: true,
            orders: orders,
            count: orders.length
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// JWT Token generation (for API access)
router.post('/auth/token', isAuthenticated, (req, res) => {
    try {
        // VULNERABILITY: Weak token generation
        const token = Buffer.from(`${req.user.id}:${req.user.username}:${Date.now()}`).toString('base64');
        
        res.json({
            success: true,
            token: token,
            user: req.user.username,
            warning: 'This token is weakly generated!',
            hint: 'Try decoding it...'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Verify token (weak verification)
router.get('/auth/verify', (req, res) => {
    try {
        const token = req.headers['authorization']?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'No token provided' 
            });
        }
        
        // VULNERABILITY: Base64 decode only, no signature verification
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        const [userId, username, timestamp] = decoded.split(':');
        
        res.json({
            success: true,
            valid: true,
            userId: userId,
            username: username,
            timestamp: timestamp,
            warning: 'Token verification is weak!'
        });
    } catch (error) {
        res.status(400).json({ 
            success: false,
            error: 'Invalid token' 
        });
    }
});

// Search API with SQL Injection
router.get('/search', optionalAuth, (req, res) => {
    try {
        const { q, type = 'products' } = req.query;
        
        if (!q) {
            return res.json({
                success: false,
                message: 'Query parameter required'
            });
        }
        
        let results = [];
        
        if (type === 'products') {
            // VULNERABILITY: SQL Injection
            const sql = `SELECT * FROM products WHERE name LIKE '%${q}%' OR description LIKE '%${q}%'`;
            results = db.prepare(sql).all();
        } else if (type === 'users') {
            // VULNERABILITY: SQL Injection
            const sql = `SELECT id, username, avatar FROM users WHERE username LIKE '%${q}%'`;
            results = db.prepare(sql).all();
        }
        
        res.json({
            success: true,
            results: results,
            count: results.length,
            query: q,
            type: type
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message,
            hint: 'SQL injection opportunity here!'
        });
    }
});

// Health check with system info
router.get('/health', (req, res) => {
    try {
        const dbStats = db.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM products) as products,
                (SELECT COUNT(*) FROM orders) as orders
        `).get();
        
        res.json({
            success: true,
            status: 'healthy',
            database: 'connected',
            stats: dbStats,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

module.exports = router;
