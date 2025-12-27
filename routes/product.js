const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/vuln_app.db');

router.get('/:id', (req, res) => {
    const id = req.params.id;
    
    // Get product details
    db.get("SELECT * FROM products WHERE id = ?", [id], (err, product) => {
        if (err || !product) {
            return res.status(404).render('partials/header', { 
                user: req.session.user, 
                title: 'Product Not Found' 
            });
        }
        
        // Get reviews for this product (with XSS vulnerability)
        db.all(`SELECT r.*, u.username 
                FROM reviews r 
                JOIN users u ON r.user_id = u.id 
                WHERE r.product_id = ? 
                ORDER BY r.created_at DESC`, 
            [id], (err, reviews) => {
            
            res.render('product', { 
                user: req.session.user, 
                product: product,
                reviews: reviews || [], // Pass reviews to template
                title: product.name 
            });
        });
    });
});

// VULNERABILITY: Logic Flaw - Negative Quantity Purchase
router.post('/buy', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    const { productId, quantity } = req.body;
    
    // FLAW: No check for negative quantity
    // If user sends -5, and price is 100, total is -500. 
    // Balance = Balance - (-500) => Balance + 500. User gets richer.
    
    db.get("SELECT price FROM products WHERE id = ?", [productId], (err, product) => {
        if (!product) return res.send("Product not found");

        const totalCost = product.price * quantity;

        // Simple update without validation
        const newBalance = req.session.user.balance - totalCost;
        
        db.run("UPDATE users SET balance = ? WHERE id = ?", [newBalance, req.session.user.id], (err) => {
            if (err) return res.send("Transaction failed");
            
            req.session.user.balance = newBalance; // Update session
            res.send(`Ordered successfully! New Balance: $${newBalance}`);
        });
    });
});

module.exports = router;