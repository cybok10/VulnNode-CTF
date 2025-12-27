const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Get cart contents
router.get('/', optionalAuth, async (req, res) => {
    try {
        let cartItems = [];
        let total = 0;
        
        if (req.user) {
            // Database cart for logged-in users
            const query = `
                SELECT c.*, p.name, p.price, p.image, p.stock_quantity 
                FROM cart c 
                JOIN products p ON c.product_id = p.id 
                WHERE c.user_id = ${req.user.id}
            `;
            
            cartItems = await db.allAsync(query);
            
            cartItems.forEach(item => {
                // VULNERABILITY: Price calculation done on client side
                total += item.price * item.quantity;
            });
        } else {
            // Session cart for guests
            cartItems = req.session.cart || [];
        }
        
        res.json({
            success: true,
            items: cartItems,
            total: total,
            itemCount: cartItems.length
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            stack: error.stack // VULNERABILITY: Stack trace exposure
        });
    }
});

// Add item to cart
router.post('/add', optionalAuth, async (req, res) => {
    try {
        // VULNERABILITY: No input validation on quantity
        const { product_id, quantity, price } = req.body;
        
        // VULNERABILITY: Client can manipulate price
        const clientPrice = price || null;
        
        if (req.user) {
            // Check if item already in cart
            const existing = await db.getAsync(
                'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
                [req.user.id, product_id]
            );
            
            if (existing) {
                // VULNERABILITY: No check for integer overflow
                await db.runAsync(
                    'UPDATE cart SET quantity = quantity + ? WHERE id = ?',
                    [quantity, existing.id]
                );
            } else {
                await db.runAsync(
                    'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                    [req.user.id, product_id, quantity]
                );
            }
        } else {
            // Session cart
            if (!req.session.cart) {
                req.session.cart = [];
            }
            
            const product = await db.getAsync(
                'SELECT * FROM products WHERE id = ?',
                [product_id]
            );
            
            // VULNERABILITY: Uses client-provided price if available
            const itemPrice = clientPrice || product.price;
            
            req.session.cart.push({
                product_id,
                quantity: quantity || 1,
                price: itemPrice, // VULNERABILITY: Stores manipulated price
                name: product.name,
                image: product.image
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Item added to cart',
            cartCount: req.session.cart ? req.session.cart.length : 1
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update cart item quantity
router.put('/update/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        // VULNERABILITY: Allows negative quantities
        const { quantity } = req.body;
        
        if (req.user) {
            // VULNERABILITY: No ownership check (IDOR)
            await db.runAsync(
                'UPDATE cart SET quantity = ? WHERE id = ?',
                [quantity, id]
            );
        } else {
            // Update session cart
            if (req.session.cart && req.session.cart[id]) {
                req.session.cart[id].quantity = quantity;
            }
        }
        
        res.json({ success: true, message: 'Cart updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove item from cart
router.delete('/remove/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (req.user) {
            // VULNERABILITY: No ownership verification (IDOR)
            await db.runAsync('DELETE FROM cart WHERE id = ?', [id]);
        } else {
            if (req.session.cart) {
                req.session.cart.splice(id, 1);
            }
        }
        
        res.json({ success: true, message: 'Item removed from cart' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear entire cart
router.delete('/clear', optionalAuth, async (req, res) => {
    try {
        if (req.user) {
            await db.runAsync('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
        } else {
            req.session.cart = [];
        }
        
        res.json({ success: true, message: 'Cart cleared' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Apply coupon code
router.post('/coupon/apply', requireAuth, async (req, res) => {
    try {
        const { code } = req.body;
        
        // VULNERABILITY: SQL Injection
        const query = `SELECT * FROM coupons WHERE code = '${code}' AND is_active = 1`;
        const coupon = await db.getAsync(query);
        
        if (!coupon) {
            return res.status(404).json({ 
                error: 'Invalid or expired coupon code',
                providedCode: code // VULNERABILITY: Reflects user input
            });
        }
        
        // VULNERABILITY: Race condition - no atomic check
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            return res.status(400).json({ error: 'Coupon usage limit reached' });
        }
        
        // Check validity dates
        const now = new Date();
        const validFrom = new Date(coupon.valid_from);
        const validUntil = new Date(coupon.valid_until);
        
        if (now < validFrom || now > validUntil) {
            return res.status(400).json({ error: 'Coupon is not valid at this time' });
        }
        
        // VULNERABILITY: Race condition - increment happens separately
        await db.runAsync(
            'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?',
            [coupon.id]
        );
        
        // Store in session
        req.session.appliedCoupon = coupon;
        
        res.json({
            success: true,
            message: 'Coupon applied successfully',
            coupon: {
                code: coupon.code,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value,
                description: coupon.description
            }
        });
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            sqlError: error // VULNERABILITY: Exposes SQL errors
        });
    }
});

// Remove coupon
router.post('/coupon/remove', requireAuth, (req, res) => {
    // VULNERABILITY: Doesn't decrement usage count
    delete req.session.appliedCoupon;
    res.json({ success: true, message: 'Coupon removed' });
});

// Calculate cart total
router.get('/total', optionalAuth, async (req, res) => {
    try {
        let subtotal = 0;
        let discount = 0;
        let shipping = 0;
        let tax = 0;
        
        // Get cart items
        let cartItems = [];
        if (req.user) {
            cartItems = await db.allAsync(`
                SELECT c.*, p.price 
                FROM cart c 
                JOIN products p ON c.product_id = p.id 
                WHERE c.user_id = ?
            `, [req.user.id]);
        } else {
            cartItems = req.session.cart || [];
        }
        
        // VULNERABILITY: Client-side price calculation can be manipulated
        cartItems.forEach(item => {
            subtotal += item.price * item.quantity;
        });
        
        // Apply coupon if exists
        if (req.session.appliedCoupon) {
            const coupon = req.session.appliedCoupon;
            
            if (coupon.discount_type === 'percentage') {
                // VULNERABILITY: No max discount check
                discount = (subtotal * coupon.discount_value) / 100;
            } else if (coupon.discount_type === 'fixed') {
                discount = coupon.discount_value;
            } else if (coupon.discount_type === 'shipping') {
                shipping = 0;
            }
        } else {
            // VULNERABILITY: Shipping calculation bypass
            shipping = subtotal > 50 ? 0 : 9.99;
        }
        
        // VULNERABILITY: Tax calculation can be manipulated
        tax = (subtotal - discount) * 0.08; // 8% tax
        
        const total = subtotal - discount + shipping + tax;
        
        res.json({
            subtotal,
            discount,
            shipping,
            tax,
            total,
            appliedCoupon: req.session.appliedCoupon ? req.session.appliedCoupon.code : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;