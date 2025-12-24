const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const secrets = require('../config/secrets');

const db = new sqlite3.Database(secrets.DB_PATH);

/**
 * GET /api/users
 * VULNERABILITY: Excessive Data Exposure
 */
router.get('/users', (req, res) => {
    // ============================================================
    // VULNERABILITY: LEAKING SENSITIVE DATA
    // ============================================================
    // We select * from users. This includes 'password' (md5 hash) and 'isAdmin'.
    // A secure API should use a DTO (Data Transfer Object) or select specific fields.
    
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

/**
 * PUT /api/users/:id
 * VULNERABILITY: Broken Object Level Authorization (BOLA) & Mass Assignment
 */
router.post('/users/:id', (req, res) => {
    // Note: Using POST to make it easier to test via HTML forms or simple Curl, 
    // though PUT is semantically correct for REST.
    
    const id = req.params.id;
    const updates = req.body; // e.g., { "email": "hacker@evil.com", "isAdmin": 1 }

    // ============================================================
    // VULNERABILITY: BOLA / IDOR
    // ============================================================
    // No check if req.session.user.id == id. Any user can update any user.

    // ============================================================
    // VULNERABILITY: MASS ASSIGNMENT
    // ============================================================
    // We iterate over the input keys and construct the SQL update dynamically.
    // If the attacker sends "isAdmin": 1, it gets added to the query.
    
    let sql = "UPDATE users SET ";
    let params = [];
    let keys = Object.keys(updates);
    
    if (keys.length === 0) return res.status(400).json({error: "No fields to update"});

    keys.forEach((key, index) => {
        sql += `${key} = ?`;
        params.push(updates[key]);
        if (index < keys.length - 1) sql += ", ";
    });
    
    sql += " WHERE id = ?";
    params.push(id);

    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
            message: "User updated successfully", 
            changes: this.changes,
            hint: "Did you just become admin?" 
        });
    });
});

module.exports = router;