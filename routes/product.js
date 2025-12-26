const express = require('express');
const router = express.Router();
const db = require('../utils/db');

router.get('/:id', (req, res) => {
    const id = req.params.id;
    
    // Standard query
    db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
        if (err || !row) {
            return res.render('partials/header', { user: req.session.user, title: 'Not Found' });
        }
        res.render('product', { 
            user: req.session.user, 
            product: row, 
            title: row.name 
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