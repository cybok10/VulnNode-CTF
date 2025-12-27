const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/vuln_app.db');
const crypto = require('crypto');

// Weak MD5 hash function (intentionally vulnerable - matches database)
function md5(password) {
    return crypto.createHash('md5').update(password).digest('hex');
}

router.get('/login', (req, res) => res.render('login', { user: null, title: 'Login' }));
router.get('/register', (req, res) => res.render('register', { user: null, title: 'Register' }));

// Register
router.post('/register', (req, res) => {
    const { username, password, email } = req.body;
    // VULNERABILITY: No password complexity check
    const hash = md5(password);

    // VULNERABILITY: SQL Injection possible if input not sanitized
    db.run("INSERT INTO users (username, password, password_md5, email) VALUES (?, ?, ?, ?)", 
        [username, hash, hash, email], function(err) {
        if (err) {
            return res.render('register', { 
                user: null, 
                title: 'Register', 
                error: 'Username or email already taken' 
            });
        }
        res.redirect('/auth/login');
    });
});

// Login logic (VULNERABILITY: Weak password hashing)
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // VULNERABILITY: Verbose error messages aid attackers
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).render('login', { 
                user: null, 
                title: 'Login', 
                error: 'Database error occurred' 
            });
        }
        
        if (!user) {
            // VULNERABILITY: Reveals username doesn't exist
            return res.render('login', { 
                user: null, 
                title: 'Login', 
                error: 'Invalid credentials' 
            });
        }

        // VULNERABILITY: MD5 password hashing (weak)
        const passwordHash = md5(password);
        
        if (passwordHash === user.password || passwordHash === user.password_md5) {
            // Set session
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
                balance: user.balance,
                avatar: user.avatar,
                loyalty_points: user.loyalty_points
            };
            
            // VULNERABILITY: Generate a predictable admin token cookie
            if (user.isAdmin) {
                res.cookie('admin_token', 'admin_secret_token_12345');
            }

            // VULNERABILITY: Store sensitive info in cookie
            res.cookie('user_id', user.id);
            res.cookie('username', user.username);

            // Update last login
            db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [user.id]);

            // Log successful login (information disclosure)
            console.log(`[+] User logged in: ${user.username} from ${req.ip}`);

            // FIXED: Redirect to homepage instead of dashboard
            return res.redirect('/');
        } else {
            // VULNERABILITY: Reveals password is incorrect
            return res.render('login', { 
                user: null, 
                title: 'Login', 
                error: 'Invalid credentials' 
            });
        }
    });
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
    res.render('reset-password', { user: null, title: 'Reset Password' });
});

router.post('/reset-password', (req, res) => {
    const { email, new_password } = req.body;
    
    // VULNERABILITY: No email verification, anyone can reset any account
    const hash = md5(new_password);
    
    db.run("UPDATE users SET password = ?, password_md5 = ? WHERE email = ?", 
        [hash, hash, email], function(err) {
        if (err || this.changes === 0) {
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
    });
});

module.exports = router;