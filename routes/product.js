const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { optionalAuth, isAuthenticated } = require('../middleware/auth');

/**
 * SINGLE PRODUCT ROUTES
 * Contains Stored XSS and Business Logic vulnerabilities
 */

// View Single Product Page
router.get('/:id', optionalAuth, (req, res) => {
    try {
        const productId = req.params.id;
        
        // Get product details
        const product = db.prepare(
            'SELECT * FROM products WHERE id = ?'
        ).get(productId);
        
        if (!product) {
            return res.status(404).render('404', { 
                user: req.user,
                message: 'Product not found',
                title: 'Product Not Found' 
            });
        }
        
        // Get reviews for this product (with STORED XSS vulnerability)
        const reviews = db.prepare(`
            SELECT r.*, u.username, u.avatar
            FROM reviews r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.product_id = ? 
            ORDER BY r.created_at DESC
        `).all(productId);
        
        // Get average rating
        const ratingResult = db.prepare(`
            SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
            FROM reviews
            WHERE product_id = ?
        `).get(productId);
        
        res.render('product', { 
            user: req.user, 
            product: product,
            reviews: reviews,
            avgRating: ratingResult.avg_rating || 0,
            reviewCount: ratingResult.review_count || 0,
            title: product.name 
        });
    } catch (error) {
        console.error('Product view error:', error);
        res.status(500).render('500', {
            user: req.user,
            error: error.message,
            title: 'Error'
        });
    }
});

// Add Product Review (Stored XSS)
router.post('/:id/review', isAuthenticated, (req, res) => {
    try {
        const productId = req.params.id;
        const { rating, title, comment } = req.body;
        const userId = req.user.id;
        
        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }
        
        // VULNERABILITY: Stored XSS - No sanitization of title and comment
        // User can inject JavaScript that executes when others view the review
        
        const result = db.prepare(`
            INSERT INTO reviews (product_id, user_id, rating, title, comment)
            VALUES (?, ?, ?, ?, ?)
        `).run(productId, userId, rating, title || '', comment || '');
        
        // Check for XSS payload
        let flag = null;
        const xssPatterns = ['<script>', 'onerror=', 'onload=', 'javascript:'];
        const hasXSS = xssPatterns.some(pattern => 
            (title && title.toLowerCase().includes(pattern)) ||
            (comment && comment.toLowerCase().includes(pattern))
        );
        
        if (hasXSS) {
            flag = 'FLAG{st0r3d_xss_1n_r3v13ws}';
        }
        
        res.json({
            success: true,
            message: 'Review submitted successfully',
            reviewId: result.lastInsertRowid,
            flag: flag
        });
    } catch (error) {
        console.error('Review submission error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// VULNERABILITY: Business Logic Flaw - Negative Quantity Purchase
router.post('/buy', isAuthenticated, (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user.id;
        
        // VULNERABILITY: No validation for negative quantity
        // If user sends -5, and price is 100, total is -500
        // Balance = Balance - (-500) => Balance + 500 (User gets richer!)
        
        const product = db.prepare(
            'SELECT id, name, price, stock FROM products WHERE id = ?'
        ).get(productId);
        
        if (!product) {
            return res.json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // VULNERABILITY: No stock check for negative quantities
        const qty = parseInt(quantity);
        const totalCost = product.price * qty;
        
        // Get current user balance
        const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);
        
        // VULNERABILITY: Allows negative total cost
        const newBalance = user.balance - totalCost;
        
        // Update balance (no validation!)
        db.prepare('UPDATE users SET balance = ? WHERE id = ?')
          .run(newBalance, userId);
        
        // Update stock (allows negative stock!)
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?')
          .run(qty, productId);
        
        // Check if exploited
        let flag = null;
        if (qty < 0) {
            flag = 'FLAG{bus1n3ss_l0g1c_n3g4t1v3_qu4nt1ty}';
        }
        
        // Update session
        req.session.user.balance = newBalance;
        
        res.json({
            success: true,
            message: `Purchase successful! Quantity: ${qty}`,
            product: product.name,
            totalCost: totalCost,
            newBalance: newBalance,
            flag: flag
        });
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Quick Add to Cart
router.post('/:id/add-to-cart', isAuthenticated, (req, res) => {
    try {
        const productId = req.params.id;
        const { quantity = 1 } = req.body;
        const userId = req.user.id;
        
        // Check if product exists
        const product = db.prepare(
            'SELECT id, name, price FROM products WHERE id = ?'
        ).get(productId);
        
        if (!product) {
            return res.json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Check if already in cart
        const existing = db.prepare(
            'SELECT * FROM cart WHERE user_id = ? AND product_id = ?'
        ).get(userId, productId);
        
        if (existing) {
            // Update quantity
            db.prepare('UPDATE cart SET quantity = quantity + ? WHERE id = ?')
              .run(quantity, existing.id);
        } else {
            // Add new item
            db.prepare('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)')
              .run(userId, productId, quantity);
        }
        
        res.json({
            success: true,
            message: 'Added to cart',
            product: product.name
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete Review (IDOR vulnerability)
router.delete('/review/:review_id', isAuthenticated, (req, res) => {
    try {
        const reviewId = req.params.review_id;
        
        // VULNERABILITY: No ownership check - can delete any review
        const result = db.prepare('DELETE FROM reviews WHERE id = ?').run(reviewId);
        
        if (result.changes === 0) {
            return res.json({
                success: false,
                message: 'Review not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Review deleted'
        });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
