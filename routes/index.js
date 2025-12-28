const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { optionalAuth } = require('../middleware/auth');

// Use separate sqlite3 connection for async operations in this route
// (Better-sqlite3 in database/db.js is for sync operations)
const db = new sqlite3.Database('./database/vuln_app.db', (err) => {
    if (err) {
        console.error('[routes/index.js] Database connection error:', err.message);
    } else {
        console.log('[routes/index.js] Connected to SQLite database (async mode)');
    }
});

// Apply optional auth (works for both logged in and guest users)
router.use(optionalAuth);

// Home Page - Lists Products
router.get('/', (req, res) => {
    // Simplified query to work with existing database schema
    const query = "SELECT * FROM products WHERE is_hidden = 0 ORDER BY is_featured DESC, id DESC";
    
    db.all(query, [], (err, products) => {
        if (err) {
            console.error('Database error:', err);
            return res.render('index', {
                user: req.user,
                products: [],
                title: 'Home'
            });
        }
        res.render('index', { 
            user: req.user, 
            products: products || [], 
            title: 'VulnNode Shop - Home' 
        });
    });
});

// VULNERABILITY: SQL Injection via 'q' parameter
// The user input is concatenated directly into the query string.
router.get('/search', (req, res) => {
    const searchQuery = req.query.q || '';
    
    if (!searchQuery) {
        return res.redirect('/');
    }
    
    // UNSAFE QUERY CONSTRUCTION (intentional vulnerability)
    // Simplified to work with existing schema
    const sql = `SELECT * FROM products WHERE name LIKE '%${searchQuery}%' OR description LIKE '%${searchQuery}%'`;

    db.all(sql, [], (err, products) => {
        if (err) {
            // VULNERABILITY: Error based SQL Injection - Sending the DB error back to the user
            return res.status(500).send(`
                <div style="background: #1a1a1a; color: #ff6b6b; padding: 20px; font-family: monospace;">
                    <h2>Database Error</h2>
                    <pre>${err.message}</pre>
                    <p style="color: #ffd93d;">💡 Hint: Try SQL injection payloads in the search box</p>
                    <p style="color: #888; font-size: 12px;">Example: ' UNION SELECT * FROM secrets--</p>
                    <a href="/" style="color: #6bcf7f;">← Back to Home</a>
                </div>
            `);
        }
        
        // Check if user found the SQL injection flag
        let flag = null;
        if (searchQuery.toLowerCase().includes('union') || 
            searchQuery.toLowerCase().includes('secrets')) {
            flag = 'FLAG{sql_1nj3ct10n_m4st3r}';
        }
        
        res.render('search-results', { 
            user: req.user, 
            products: products || [], 
            searchQuery: searchQuery,
            flag: flag,
            title: `Search Results: ${searchQuery}` 
        });
    });
});

// Report Page (SSRF/XSS Trigger)
router.get('/report', (req, res) => {
    res.render('report', { 
        user: req.user, 
        title: 'Report Issue' 
    });
});

// POST Route for the Admin Bot (SSRF Vulnerability)
router.post('/report', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({
            success: false,
            message: 'URL is required'
        });
    }

    // VULNERABILITY: SSRF - No validation on URL
    // User can make the server request internal URLs
    try {
        const bot = require('../utils/bot');
        bot.visitUrl(url).catch(err => console.error('[BOT ERROR]:', err));
        
        res.json({
            success: true,
            message: 'Report submitted successfully. Admin will review your link shortly.',
            hint: 'Try accessing internal services like http://localhost or file:// URLs'
        });
    } catch (err) {
        console.error('[BOT] Bot module not found or error:', err.message);
        
        res.json({
            success: true,
            message: 'Your report has been logged. Admin will review it soon.',
            note: 'Bot feature not configured'
        });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'running',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        vulnerabilities: 'MANY - This is intentional!',
        ctf_challenges: 10
    });
});

module.exports = router;
