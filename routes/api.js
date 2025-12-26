const express = require('express');
const router = express.Router();
const db = require('../utils/db');

// VULNERABILITY: IDOR (Insecure Direct Object Reference)
// Returns user details including sensitive info (email, balance) based on ID.
// No check to see if the requesting user is the owner of the ID.
router.get('/users/:id', (req, res) => {
    const userId = req.params.id;

    db.get("SELECT id, username, email, balance, avatar FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        if (!row) {
            return res.status(404).json({ error: "User not found" });
        }
        // Leak sensitive data
        res.json(row);
    });
});

// VULNERABILITY: Mass Assignment / Parameter Tampering (Simulated)
// Allows updating balance if 'balance' is passed in body, even if it shouldn't be allowed.
router.post('/update-profile', (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized");

    const { email, balance } = req.body;
    let sql = "UPDATE users SET email = ? WHERE id = ?";
    let params = [email, req.session.user.id];

    // If attacker sends 'balance', it updates it.
    if (balance) {
        sql = "UPDATE users SET email = ?, balance = ? WHERE id = ?";
        params = [email, balance, req.session.user.id];
    }

    db.run(sql, params, (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true, message: "Profile Updated" });
    });
});

module.exports = router;