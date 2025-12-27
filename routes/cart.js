const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/vuln_app.db');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');

// View Cart
router.get('/', optionalAuth, (req, res) => {
    // VULNERABILITY: Cart accessible even without authentication via session
    const userId = req.session.user ? req.session.user.id : req.session.guestId;
    
    if (!userId) {
        req.session.guestId = Date.now(); // Predictable guest ID
        return res.json({ cart: [], total: 0 });
    }
    
    const query = `
        SELECT c.*, p.name, p.price, p.image, p.stock_quantity,
               (c.quantity * p.price) as item_total
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `;
    
    db.all(query, [userId], (err, items) => {
        if (err) {
            // VULNERABILITY: Exposing SQL error
            return res.status(500).json({ error: err.message, query: query });
        }
        
        // VULNERABILITY: Client-side total calculation
        const total = items.reduce((sum, item) => sum + parseFloat(item.item_total), 0);
        
        res.json({
            cart: items,
            total: total,
            itemCount: items.length
        });
    });
});

// Add to Cart
router.post('/add', optionalAuth, (req, res) => {
    const { product_id, quantity } = req.body;
    const userId = req.session.user ? req.session.user.id : (req.session.guestId || Date.now());
    
    // VULNERABILITY: No input validation on quantity
    // Allows negative quantities, extremely large numbers, etc.
    const qty = parseInt(quantity) || 1;
    
    // VULNERABILITY: No stock check before adding to cart
    // Check if item already in cart
    db.get('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [userId, product_id], (err, existing) => {
        if (existing) {
            // Update quantity
            // VULNERABILITY: Direct addition without validation
            const newQty = existing.quantity + qty;
            
            db.run('UPDATE cart SET quantity = ? WHERE id = ?', [newQty, existing.id], (err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Cart updated', quantity: newQty });
            });
        } else {
            // Insert new item
            db.run('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                [userId, product_id, qty],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ message: 'Item added to cart', cartId: this.lastID });
                }
            );
        }
    });
});

// Update Cart Item
router.post('/update', optionalAuth, (req, res) => {
    const { cart_id, quantity } = req.body;
    
    // VULNERABILITY: No ownership check - anyone can update any cart item
    // VULNERABILITY: Accepts negative quantities
    const qty = parseInt(quantity);
    
    if (qty === 0) {
        // Remove item
        db.run('DELETE FROM cart WHERE id = ?', [cart_id], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Item removed' });
        });
    } else {
        // Update quantity
        db.run('UPDATE cart SET quantity = ? WHERE id = ?', [qty, cart_id], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Cart updated', quantity: qty });
        });
    }
});

// Remove from Cart
router.post('/remove', optionalAuth, (req, res) => {
    const { cart_id } = req.body;
    
    // VULNERABILITY: No ownership validation - IDOR vulnerability
    db.run('DELETE FROM cart WHERE id = ?', [cart_id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Cart item not found' });
        }
        
        res.json({ message: 'Item removed from cart' });
    });
});

// Clear Cart
router.post('/clear', optionalAuth, (req, res) => {
    const userId = req.session.user ? req.session.user.id : req.session.guestId;
    
    if (!userId) {
        return res.status(400).json({ error: 'No cart to clear' });
    }
    
    db.run('DELETE FROM cart WHERE user_id = ?', [userId], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Cart cleared' });
    });
});

// Apply Coupon - MAJOR VULNERABILITIES
router.post('/apply-coupon', optionalAuth, (req, res) => {
    const { coupon_code } = req.body;
    const userId = req.session.user ? req.session.user.id : req.session.guestId;
    
    if (!userId) {
        return res.status(400).json({ error: 'Cart is empty' });
    }
    
    // VULNERABILITY: SQL Injection in coupon code lookup
    const query = `SELECT * FROM coupons WHERE code = '${coupon_code}' AND is_active = 1`;
    
    db.get(query, (err, coupon) => {
        if (err) {
            // VULNERABILITY: Exposing SQL errors
            return res.status(500).json({ error: err.message, sql: query });
        }
        
        if (!coupon) {
            return res.status(404).json({ error: 'Invalid or expired coupon' });
        }
        
        // Get cart total
        db.all(`
            SELECT c.*, p.price, (c.quantity * p.price) as item_total
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `, [userId], (err, items) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const subtotal = items.reduce((sum, item) => sum + parseFloat(item.item_total), 0);
            
            // VULNERABILITY: No check for minimum purchase amount
            // VULNERABILITY: No check for usage limits
            // VULNERABILITY: No check for user-specific limits
            // VULNERABILITY: Race condition - multiple uses possible
            
            let discount = 0;
            
            if (coupon.discount_type === 'percentage') {
                discount = subtotal * (coupon.discount_value / 100);
                // VULNERABILITY: No max discount check
            } else if (coupon.discount_type === 'fixed') {
                discount = coupon.discount_value;
            } else if (coupon.discount_type === 'shipping') {
                // Free shipping
                discount = 0; // Applied later
            }
            
            // Store coupon in session
            req.session.appliedCoupon = {
                code: coupon.code,
                discount: discount,
                type: coupon.discount_type
            };
            
            res.json({
                message: 'Coupon applied successfully',
                coupon: coupon.code,
                discount: discount,
                subtotal: subtotal,
                total: Math.max(0, subtotal - discount)
            });
        });
    });
});

// Remove Coupon
router.post('/remove-coupon', optionalAuth, (req, res) => {
    if (req.session.appliedCoupon) {
        delete req.session.appliedCoupon;
    }
    res.json({ message: 'Coupon removed' });
});

// Get Cart Summary with Pricing
router.get('/summary', optionalAuth, (req, res) => {
    const userId = req.session.user ? req.session.user.id : req.session.guestId;
    
    if (!userId) {
        return res.json({
            subtotal: 0,
            discount: 0,
            shipping: 0,
            tax: 0,
            total: 0,
            items: []
        });
    }
    
    db.all(`
        SELECT c.*, p.name, p.price, p.image,
               (c.quantity * p.price) as item_total
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `, [userId], (err, items) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // VULNERABILITY: All calculations done client-side or in this endpoint
        // Can be manipulated before checkout
        let subtotal = items.reduce((sum, item) => sum + parseFloat(item.item_total), 0);
        let discount = 0;
        let shipping = 10.00; // Flat shipping
        let tax = 0; // VULNERABILITY: No tax calculation
        
        // Apply coupon if exists
        if (req.session.appliedCoupon) {
            if (req.session.appliedCoupon.type === 'percentage') {
                discount = subtotal * (req.session.appliedCoupon.discount / 100);
            } else if (req.session.appliedCoupon.type === 'fixed') {
                discount = req.session.appliedCoupon.discount;
            } else if (req.session.appliedCoupon.type === 'shipping') {
                shipping = 0;
            }
        }
        
        // VULNERABILITY: Free shipping if subtotal > $50 (can be bypassed)
        if (subtotal > 50) {
            shipping = 0;
        }
        
        const total = Math.max(0, subtotal - discount + shipping + tax);
        
        res.json({
            subtotal: subtotal.toFixed(2),
            discount: discount.toFixed(2),
            shipping: shipping.toFixed(2),
            tax: tax.toFixed(2),
            total: total.toFixed(2),
            items: items,
            itemCount: items.length,
            appliedCoupon: req.session.appliedCoupon || null
        });
    });
});

// VULNERABILITY: Direct price manipulation endpoint (should not exist)
router.post('/update-price', (req, res) => {
    const { cart_id, new_price } = req.body;
    
    // This is intentionally vulnerable - allows price manipulation
    // In a real app, prices should never be stored in cart, only product_id
    
    res.json({ 
        message: 'Price update accepted',
        warning: 'This endpoint is intentionally vulnerable!',
        cart_id: cart_id,
        new_price: new_price
    });
});

// Merge Guest Cart to User Cart (after login)
router.post('/merge', isAuthenticated, (req, res) => {
    const { guestId } = req.body;
    const userId = req.session.user.id;
    
    if (!guestId) {
        return res.status(400).json({ error: 'Guest ID required' });
    }
    
    // VULNERABILITY: No validation of guestId ownership
    // Can merge anyone's cart
    
    db.run('UPDATE cart SET user_id = ? WHERE user_id = ?', [userId, guestId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ 
            message: 'Cart merged successfully',
            itemsMerged: this.changes
        });
    });
});

module.exports = router;