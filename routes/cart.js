const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');

// View Cart
router.get('/', isAuthenticated, (req, res) => {
    const userId = req.user.id;
    
    try {
        const items = db.prepare(`
            SELECT c.*, p.name, p.price, p.image_url, p.stock,
                   (c.quantity * p.price) as item_total
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `).all(userId);
        
        // VULNERABILITY: Client-side total calculation
        const total = items.reduce((sum, item) => sum + parseFloat(item.item_total), 0);
        
        res.render('cart', {
            user: req.user,
            cart: items,
            total: total,
            itemCount: items.length,
            title: 'Shopping Cart'
        });
    } catch (error) {
        console.error('Cart error:', error);
        res.status(500).render('500', {
            user: req.user,
            error: error.message,
            title: 'Error'
        });
    }
});

// Add to Cart (API)
router.post('/add', isAuthenticated, (req, res) => {
    const { product_id, quantity } = req.body;
    const userId = req.user.id;
    
    // VULNERABILITY: No input validation on quantity
    // Allows negative quantities, extremely large numbers, etc.
    const qty = parseInt(quantity) || 1;
    
    try {
        // VULNERABILITY: No stock check before adding to cart
        // Check if item already in cart
        const existing = db.prepare(
            'SELECT * FROM cart WHERE user_id = ? AND product_id = ?'
        ).get(userId, product_id);
        
        if (existing) {
            // Update quantity
            // VULNERABILITY: Direct addition without validation
            const newQty = existing.quantity + qty;
            
            db.prepare('UPDATE cart SET quantity = ? WHERE id = ?')
              .run(newQty, existing.id);
            
            res.json({ 
                success: true,
                message: 'Cart updated', 
                quantity: newQty 
            });
        } else {
            // Insert new item
            const result = db.prepare(
                'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)'
            ).run(userId, product_id, qty);
            
            res.json({ 
                success: true,
                message: 'Item added to cart', 
                cartId: result.lastInsertRowid 
            });
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Update Cart Item
router.post('/update', isAuthenticated, (req, res) => {
    const { cart_id, quantity } = req.body;
    
    // VULNERABILITY: No ownership check - anyone can update any cart item
    // VULNERABILITY: Accepts negative quantities
    const qty = parseInt(quantity);
    
    try {
        if (qty === 0) {
            // Remove item
            db.prepare('DELETE FROM cart WHERE id = ?').run(cart_id);
            res.json({ 
                success: true,
                message: 'Item removed' 
            });
        } else {
            // Update quantity - VULNERABILITY: No ownership check!
            db.prepare('UPDATE cart SET quantity = ? WHERE id = ?')
              .run(qty, cart_id);
            
            res.json({ 
                success: true,
                message: 'Cart updated', 
                quantity: qty 
            });
        }
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Remove from Cart
router.post('/remove', isAuthenticated, (req, res) => {
    const { cart_id } = req.body;
    
    try {
        // VULNERABILITY: No ownership validation - IDOR vulnerability
        const result = db.prepare('DELETE FROM cart WHERE id = ?').run(cart_id);
        
        if (result.changes === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Cart item not found' 
            });
        }
        
        res.json({ 
            success: true,
            message: 'Item removed from cart' 
        });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Clear Cart
router.post('/clear', isAuthenticated, (req, res) => {
    const userId = req.user.id;
    
    try {
        db.prepare('DELETE FROM cart WHERE user_id = ?').run(userId);
        res.json({ 
            success: true,
            message: 'Cart cleared' 
        });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get Cart Summary with Pricing (API)
router.get('/summary', isAuthenticated, (req, res) => {
    const userId = req.user.id;
    
    try {
        const items = db.prepare(`
            SELECT c.*, p.name, p.price, p.image_url,
                   (c.quantity * p.price) as item_total
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `).all(userId);
        
        // VULNERABILITY: All calculations done client-side or in this endpoint
        // Can be manipulated before checkout
        let subtotal = items.reduce((sum, item) => sum + parseFloat(item.item_total), 0);
        let discount = 0;
        let shipping = 10.00; // Flat shipping
        let tax = 0; // VULNERABILITY: No tax calculation
        
        // VULNERABILITY: Free shipping if subtotal > $50 (can be bypassed)
        if (subtotal > 50) {
            shipping = 0;
        }
        
        const total = Math.max(0, subtotal - discount + shipping + tax);
        
        res.json({
            success: true,
            subtotal: subtotal.toFixed(2),
            discount: discount.toFixed(2),
            shipping: shipping.toFixed(2),
            tax: tax.toFixed(2),
            total: total.toFixed(2),
            items: items,
            itemCount: items.length
        });
    } catch (error) {
        console.error('Cart summary error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get Cart Count (for navbar badge)
router.get('/count', isAuthenticated, (req, res) => {
    const userId = req.user.id;
    
    try {
        const result = db.prepare(`
            SELECT COUNT(*) as count, SUM(quantity) as totalItems
            FROM cart
            WHERE user_id = ?
        `).get(userId);
        
        res.json({
            success: true,
            count: result.count || 0,
            totalItems: result.totalItems || 0
        });
    } catch (error) {
        console.error('Cart count error:', error);
        res.json({ 
            success: false,
            count: 0,
            totalItems: 0
        });
    }
});

// VULNERABILITY: Direct price manipulation endpoint (should not exist)
// This allows attackers to change prices before checkout
router.post('/update-price', isAuthenticated, (req, res) => {
    const { cart_id, new_price } = req.body;
    
    // This is intentionally vulnerable - allows price manipulation
    // In a real app, prices should never be stored in cart, only product_id
    
    // BUSINESS LOGIC FLAW: No validation that user owns this cart item
    // BUSINESS LOGIC FLAW: Allows any price, including negative
    
    res.json({ 
        success: true,
        message: 'Price update accepted',
        warning: 'This endpoint is intentionally vulnerable!',
        cart_id: cart_id,
        new_price: new_price,
        flag: new_price < 0 ? 'FLAG{bus1n3ss_l0g1c_n3g4t1v3_pr1c3}' : null
    });
});

module.exports = router;