const express = require('express');
const router = express.Router();
const db = require('../database/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Weak MD5 hash function (intentionally vulnerable - for backward compatibility)
function md5(password) {
    return crypto.createHash('md5').update(password).digest('hex');
}

router.get('/login', (req, res) => {
    res.render('login', { 
        user: null, 
        title: 'Login' 
    });
});

router.get('/register', (req, res) => {
    res.render('register', { 
        user: null, 
        title: 'Register' 
    });
});

// Register
router.post('/register', (req, res) => {
    const { username, password, email } = req.body;
    
    try {
        // Use bcrypt for new registrations (matching database standard)
        const hash = bcrypt.hashSync(password, 10);

        // Insert new user
        db.prepare(
            'INSERT INTO users (username, password, email) VALUES (?, ?, ?)'
        ).run(username, hash, email);
        
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Register error:', error);
        return res.render('register', { 
            user: null, 
            title: 'Register', 
            error: 'Username or email already taken' 
        });
    }
});

// Login logic (VULNERABILITY: Weak password hashing)
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    try {
        // VULNERABILITY: Verbose error messages aid attackers
        const user = db.prepare(
            'SELECT * FROM users WHERE username = ?'
        ).get(username);
        
        if (!user) {
            // VULNERABILITY: Reveals username doesn't exist
            return res.render('login', { 
                user: null, 
                title: 'Login', 
                error: 'Invalid credentials' 
            });
        }

        // Check password with bcrypt (primary method)
        let isValidPassword = false;
        
        try {
            // Try bcrypt first (for passwords created by init_db.js or new registrations)
            isValidPassword = bcrypt.compareSync(password, user.password);
        } catch (e) {
            // If bcrypt fails, try MD5 (for legacy/CTF purposes)
            const passwordHash = md5(password);
            isValidPassword = (passwordHash === user.password);
        }
        
        if (isValidPassword) {
            // Set session
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin || 0,
                balance: user.balance || 0,
                avatar: user.avatar || '/img/avatars/default.png',
                loyalty_points: user.loyalty_points || 0
            };
            
            // VULNERABILITY: Generate a predictable admin token cookie
            if (user.isAdmin) {
                res.cookie('admin_token', 'admin_secret_token_12345');
            }

            // VULNERABILITY: Store sensitive info in cookie
            res.cookie('user_id', user.id);
            res.cookie('username', user.username);

            // Update last login
            db.prepare(
                "UPDATE users SET last_login = datetime('now') WHERE id = ?"
            ).run(user.id);

            // Log successful login (information disclosure)
            console.log(`[+] User logged in: ${user.username} from ${req.ip}`);

            return res.redirect('/');
        } else {
            // VULNERABILITY: Reveals password is incorrect
            return res.render('login', { 
                user: null, 
                title: 'Login', 
                error: 'Invalid credentials' 
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).render('login', { 
            user: null, 
            title: 'Login', 
            error: 'Database error occurred' 
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    const username = req.session.user ? req.session.user.username : 'unknown';
    console.log(`[-] User logged out: ${username}`);
    
    req.session.destroy();
    res.clearCookie('connect.sid');
    res.clearCookie('admin_token');
    res.clearCookie('user_id');
    res.clearCookie('username');
    res.redirect('/');
});

// Password reset (VULNERABILITY: No token verification)
router.get('/reset-password', (req, res) => {
    res.render('reset-password', { 
        user: null, 
        title: 'Reset Password' 
    });
});

router.post('/reset-password', (req, res) => {
    const { email, new_password } = req.body;
    
    try {
        // VULNERABILITY: No email verification, anyone can reset any account
        const hash = bcrypt.hashSync(new_password, 10);
        
        const result = db.prepare(
            'UPDATE users SET password = ? WHERE email = ?'
        ).run(hash, email);
        
        if (result.changes === 0) {
            return res.render('reset-password', { 
                user: null, 
                title: 'Reset Password', 
                error: 'Email not found' 
            });
        }
        
        res.render('login', { 
            user: null, 
            title: 'Login', 
            success: 'Password reset successful! You can now login.' 
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return res.render('reset-password', { 
            user: null, 
            title: 'Reset Password', 
            error: 'An error occurred' 
        });
    }
});

module.exports = router;
