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
 * GET /order
 * Page to place a new order (Simulated Cart)
 */
router.get('/', (req, res) => {
    // Fetch products to populate dropdown
    db.all("SELECT * FROM products", [], (err, products) => {
        if (err) {
            console.error("DB Error:", err);
            return res.status(500).send("Database Error");
        }
        res.render('order', { 
            products: products,
            user: req.session.user
        });
    });
});

/**
 * POST /order/checkout
 * VULNERABILITY: BUSINESS LOGIC FLAW (Negative Quantity)
 */
router.post('/checkout', (req, res) => {
    const { product_id, quantity } = req.body;
    
    // Ensure session user is valid
    if (!req.session.user || !req.session.user.id) {
        return res.redirect('/auth/login');
    }
    
    const userId = req.session.user.id;

    // Fetch product price
    db.get("SELECT * FROM products WHERE id = ?", [product_id], (err, product) => {
        if (err || !product) return res.status(404).send("Product not found");

        // ============================================================
        // VULNERABILITY: LOGIC FLAW
        // ============================================================
        // We rely on client-side validation (HTML 'min="1"').
        // A proxy (Burp/Zap) can bypass this and send negative numbers.
        
        let qty = parseInt(quantity);
        
        // DYNAMIC DIFFICULTY CHECK
        // Level 3 (Advanced) patches this specific flaw
        const securityLevel = req.session.difficulty || 1;
        
        if (securityLevel >= 3) {
            if (qty <= 0) {
                return res.status(400).send(`
                    <div style="color: red; text-align: center; margin-top: 50px;">
                        <h1>🚫 WAF Blocked 🚫</h1>
                        <p>Malicious input detected: Negative or Zero Quantity.</p>
                        <p><em>Switch to Beginner/Intermediate difficulty to exploit this.</em></p>
                        <a href="/order">Go Back</a>
                    </div>
                `);
            }
        }

        const totalPrice = product.price * qty;

        // Get fresh user balance
        db.get("SELECT balance FROM users WHERE id = ?", [userId], (err, row) => {
            if (err) return res.status(500).send("DB Error");
            
            const currentBalance = row ? row.balance : 0;

            // Check if user has enough balance.
            // THE FLAW: If totalPrice is negative (e.g. -500), 
            // currentBalance (100) is > -500, so this check PASSES.
            if (currentBalance < totalPrice) {
                return res.send(`
                    <h3>Transaction Failed</h3>
                    <p>Insufficient funds. You have $${currentBalance.toFixed(2)} but need $${totalPrice.toFixed(2)}.</p>
                    <a href="/order">Try again</a>
                `);
            }

            // Deduct balance (or add if negative due to math rule: - - = +)
            const newBalance = currentBalance - totalPrice;

            // Update User Balance in DB
            db.run("UPDATE users SET balance = ? WHERE id = ?", [newBalance, userId], (err) => {
                if (err) return res.status(500).send("Transaction failed during update");

                // Record Order in History
                db.run("INSERT INTO orders (user_id, product_id, quantity, total_price) VALUES (?, ?, ?, ?)", 
                    [userId, product.id, qty, totalPrice], 
                    (err) => {
                        // Update session object so UI updates immediately
                        req.session.user.balance = newBalance;
                        
                        let responseHtml = `
                            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
                            <div class="container mt-5 text-center">
                                <div class="card">
                                    <div class="card-body">
                                        <h2 class="text-success">Order Successful!</h2>
                                        <p>Item: ${product.name}</p>
                                        <p>Quantity: ${qty}</p>
                                        <p>Total: $${totalPrice.toFixed(2)}</p>
                                        <hr>
                                        <h4>New Balance: $${newBalance.toFixed(2)}</h4>
                        `;

                        // CHECK FOR EXPLOIT SUCCESS
                        // If user "paid" a negative amount (meaning they stole money)
                        if (totalPrice < 0) {
                            responseHtml += `
                                <div class="alert alert-warning mt-4">
                                    <h4>💰 Business Logic Flaw Exploited!</h4>
                                    <p>You tricked the system into refunding you for items you didn't buy.</p>
                                    <p><strong>Flag:</strong> <code>FLAG{business_logic_negative_math}</code></p>
                                </div>
                            `;
                            
                            // Optional: Auto-mark challenge as solved in DB for scoreboard
                            // In a real automated CTF, we might do this via an internal API call here.
                        }

                        responseHtml += `
                                        <a href="/order" class="btn btn-primary mt-3">Buy More</a>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        res.send(responseHtml);
                    }
                );
            });
        });
    });
});

module.exports = router;