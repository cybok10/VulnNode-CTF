const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();

// Use separate sqlite3 connection for async operations in this route
// (Better-sqlite3 in database/db.js is for sync operations)
const db = new sqlite3.Database('./database/vuln_app.db', (err) => {
    if (err) {
        console.error('[routes/index.js] Database connection error:', err.message);
    } else {
        console.log('[routes/index.js] Connected to SQLite database (async mode)');
    }
});

// Home Page - Lists Products
router.get('/', (req, res) => {
    // Simplified query to work with existing database schema
    const query = "SELECT * FROM products ORDER BY id DESC";
    
    db.all(query, [], (err, products) => {
        if (err) {
            console.error('Database error:', err);
            return res.render('index', {
                user: req.session.user,
                products: [],
                title: 'Home'
            });
        }
        res.render('index', { 
            user: req.session.user, 
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
        res.render('index', { 
            user: req.session.user, 
            products: products || [], 
            title: `Search Results: ${searchQuery}` 
        });
    });
});

// Report Page (XSS Trigger)
router.get('/report', (req, res) => {
    res.render('report', { user: req.session.user, title: 'Report Issue' });
});

// POST Route for the Admin Bot
router.post('/report', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).send("URL is required");
    }

    // In background, trigger the bot (if bot.js exists)
    try {
        const bot = require('../utils/bot');
        bot.visitUrl(url).catch(err => console.error('[BOT ERROR]:', err));
        res.send(`
            <div style="background: #1a1a1a; color: #6bcf7f; padding: 30px; text-align: center; font-family: Arial;">
                <h2>✓ Report Submitted</h2>
                <p>Admin has been notified and will review your link shortly.</p>
                <a href="/" style="color: #6bcf7f; text-decoration: none;">← Back to Home</a>
            </div>
        `);
    } catch (err) {
        console.error('[BOT] Bot module not found or error:', err.message);
        res.send(`
            <div style="background: #1a1a1a; color: #6bcf7f; padding: 30px; text-align: center; font-family: Arial;">
                <h2>✓ Report Submitted</h2>
                <p>Your report has been logged. Admin will review it soon.</p>
                <p style="color: #888; font-size: 12px;">(Bot feature not configured)</p>
                <a href="/" style="color: #6bcf7f; text-decoration: none;">← Back to Home</a>
            </div>
        `);
    }
});

module.exports = router;
