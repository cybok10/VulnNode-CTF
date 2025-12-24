const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const secrets = require('../config/secrets');
const { md5 } = require('../utils/helper');

const db = new sqlite3.Database(secrets.DB_PATH);

// GET Login Page
router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// GET Register Page
router.get('/register', (req, res) => {
    res.render('register', { error: null });
});

/**
 * POST /auth/login
 * Vulnerable to SQL Injection Auth Bypass
 */
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // ============================================================
    // VULNERABILITY: SQL INJECTION AUTH BYPASS
    // ============================================================
    // Inputting "admin' --" as the username comments out the password check.
    // Inputting " ' OR '1'='1' -- " logs in as the first user in DB (usually Admin).

    const hashedPassword = md5(password);
    
    // INTENTIONAL FLAW: Not using parameterized queries (?)
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${hashedPassword}'`;

    console.log(`[DEBUG] Login Query: ${query}`);

    db.get(query, (err, user) => {
        if (err) {
            return res.status(500).send(err.message);
        }

        if (!user) {
            // VULNERABILITY: User Enumeration
            // We should give a generic message, but we explicitly say "Invalid credentials" 
            // However, a different error logic often leaks if the username exists vs password wrong.
            // Here, the SQLi allows bypassing the check entirely.
            return res.render('login', { error: 'Invalid username or password' });
        }

        // ============================================================
        // VULNERABILITY: WEAK SESSION / JWT CONFIGURATION
        // ============================================================
        
        // 1. We are using a weak, hardcoded secret from config
        // 2. We are including sensitive data (isAdmin) directly in the token payload (trusting the token too much)
        const token = jwt.sign({
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin
        }, secrets.JWT_SECRET, { expiresIn: '1h' });

        // Set session
        req.session.user = user;
        req.session.token = token;

        // VULNERABILITY: Open Redirect (if a 'next' param existed, we aren't validating it)
        // For now, just redirect to dashboard or home
        if (user.isAdmin) {
            res.redirect('/admin');
        } else {
            res.redirect('/');
        }
    });
});

/**
 * POST /auth/register
 * Vulnerable to weak password hashing and lack of complexity checks
 */
router.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password) {
        return res.render('register', { error: 'Username and Password are required' });
    }

    // VULNERABILITY: WEAK PASSWORD POLICY
    // We accept any password, even "123"
    
    const hashedPassword = md5(password); // MD5 is broken

    const query = `INSERT INTO users (username, password, email) VALUES (?, ?, ?)`;
    
    db.run(query, [username, hashedPassword, email], function(err) {
        if (err) {
            // VULNERABILITY: SQL Error Leakage (Unique constraint violation reveals if user exists)
            return res.render('register', { error: err.message });
        }
        
        // Auto login after register
        res.redirect('/auth/login');
    });
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;