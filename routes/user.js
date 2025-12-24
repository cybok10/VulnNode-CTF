const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const secrets = require('../config/secrets');

const db = new sqlite3.Database(secrets.DB_PATH);

// Middleware to ensure login
function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/auth/login');
}

router.use(ensureAuthenticated);

/**
 * GET /user/profile/:id
 * VULNERABILITY: IDOR (Insecure Direct Object Reference)
 */
router.get('/profile/:id', (req, res) => {
    const requestedId = req.params.id;

    // ============================================================
    // VULNERABILITY: IDOR
    // ============================================================
    // We trust the 'id' parameter from the URL completely.
    // Secure code would check: if (req.session.user.id !== requestedId) return 403;
    // Here, we just query the DB for whoever is asked for.

    const query = "SELECT id, username, email, isAdmin, profile_pic FROM users WHERE id = ?";
    
    db.get(query, [requestedId], (err, user) => {
        if (err || !user) {
            return res.status(404).send("User not found");
        }
        
        // VULNERABILITY: Information Disclosure
        // We render the 'dashboard' view with the target user's data.
        res.render('dashboard', { 
            profileUser: user, 
            currentUser: req.session.user 
        });
    });
});

module.exports = router;