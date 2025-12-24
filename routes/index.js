const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const secrets = require('../config/secrets');
const { weakSanitize } = require('../utils/helper');

// Connect to the database
const db = new sqlite3.Database(secrets.DB_PATH);

/**
 * GET /
 * Home Page - Lists products
 */
router.get('/', (req, res) => {
    const query = "SELECT * FROM products";
    
    db.all(query, [], (err, products) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database Error");
        }
        res.render('index', { 
            products: products, 
            user: req.session.user,
            searchTerm: '' 
        });
    });
});

/**
 * GET /search
 * Search functionality vulnerable to SQL Injection and XSS
 */
router.get('/search', (req, res) => {
    const searchTerm = req.query.q;

    if (!searchTerm) {
        return res.redirect('/');
    }

    // ============================================================
    // VULNERABILITY: SQL INJECTION (Union-Based / Error-Based)
    // ============================================================
    // The input 'searchTerm' is concatenated directly into the query string.
    // An attacker can input: ' UNION SELECT 1, name, value, 4 FROM secrets --
    // This would append the secret flags to the product list.
    
    const query = "SELECT * FROM products WHERE name LIKE '%" + searchTerm + "%'";

    console.log(`[DEBUG] Executing Query: ${query}`); // VULNERABILITY: Info Leak in logs

    db.all(query, [], (err, products) => {
        if (err) {
            // VULNERABILITY: Verbose Error Message (helps SQLi enumeration)
            return res.status(500).send(`
                <h3>Database Error</h3>
                <p>Query Failed: ${query}</p>
                <pre>${err.message}</pre>
                <!-- FLAG{verbose_sql_errors_are_bad} -->
            `);
        }

        // VULNERABILITY: REFLECTED XSS
        // We are passing 'searchTerm' back to the view. 
        // If the view renders this with <%- %> instead of <%= %>, scripts will execute.
        // Example payload: <script>alert(1)</script>
        
        res.render('index', { 
            products: products, 
            user: req.session.user,
            searchTerm: searchTerm 
        });
    });
});

module.exports = router;