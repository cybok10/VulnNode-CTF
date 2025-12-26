const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const bcrypt = require('bcryptjs');

router.get('/login', (req, res) => res.render('login', { user: null, title: 'Login' }));
router.get('/register', (req, res) => res.render('register', { user: null, title: 'Register' }));

// Register
router.post('/register', (req, res) => {
    const { username, password, email } = req.body;
    // Weakness: No password complexity check
    const hash = bcrypt.hashSync(password, 10);

    const stmt = db.prepare("INSERT INTO users (username, password, email) VALUES (?, ?, ?)");
    stmt.run(username, hash, email, (err) => {
        if (err) {
            return res.render('register', { user: null, title: 'Register', error: 'Username taken' });
        }
        res.redirect('/auth/login');
    });
    stmt.finalize();
});

// Login logic
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
        if (err) return res.status(500).send("Error");
        
        if (!row) {
            return res.render('login', { user: null, title: 'Login', error: 'Invalid credentials' });
        }

        const valid = bcrypt.compareSync(password, row.password);
        if (valid) {
            // Set session
            req.session.user = {
                id: row.id,
                username: row.username,
                isAdmin: row.isAdmin,
                balance: row.balance,
                avatar: row.avatar
            };
            
            // Generate a fake 'admin token' cookie if user is admin (for ease of CTF exploitation)
            if(row.isAdmin) {
                res.cookie('token', require('../config/secrets').adminToken);
            }

            return res.redirect('/user/dashboard');
        } else {
            return res.render('login', { user: null, title: 'Login', error: 'Invalid credentials' });
        }
    });
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;