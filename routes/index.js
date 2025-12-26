const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const bot = require('../utils/bot');

// Home Page - Lists Products
router.get('/', (req, res) => {
    const query = "SELECT * FROM products";
    db.all(query, [], (err, products) => {
        if (err) {
            return res.status(500).send("Database error");
        }
        res.render('index', { 
            user: req.session.user, 
            products: products, 
            title: 'Home' 
        });
    });
});

// VULNERABILITY: SQL Injection via 'q' parameter
// The user input is concatenated directly into the query string.
router.get('/search', (req, res) => {
    const searchQuery = req.query.q;
    
    // UNSAFE QUERY CONSTRUCTION
    const sql = `SELECT * FROM products WHERE name LIKE '%${searchQuery}%'`;

    db.all(sql, [], (err, products) => {
        if (err) {
            // Error based SQL Injection: Sending the DB error back to the user
            return res.status(500).send(`Database Error: ${err.message}`);
        }
        res.render('index', { 
            user: req.session.user, 
            products: products, 
            title: `Search: ${searchQuery}` 
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
    if (!url) return res.status(400).send("URL is required");

    // In background, trigger the bot
    bot.visitUrl(url).catch(err => console.error(err));

    res.send("Admin has been notified and will review your link shortly.");
});

module.exports = router;