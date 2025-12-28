const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { isAuthenticated } = require('../middleware/auth');

// Use correct database path
const db = new sqlite3.Database('./database/vuln_app.db');

// Apply authentication middleware
router.use(isAuthenticated);

/**
 * GET /orders
 * List all orders for the logged-in user
 */
router.get('/', (req, res) => {
    const userId = req.user.id;
    
    const query = `
        SELECT 
            o.id,
            o.order_number,
            o.total,
            o.status,
            o.created_at,
            COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `;
    
    db.all(query, [userId], (err, orders) => {
        if (err) {
            console.error('Orders error:', err);
            return res.status(500).render('500', {
                user: req.user,
                error: err.message,
                title: 'Error'
            });
        }
        
        res.render('orders', {
            user: req.user,
            orders: orders || [],
            title: 'My Orders'
        });
    });
});

/**
 * GET /orders/:id
 * VULNERABILITY: IDOR - Order details
 * Users can view other users' orders by changing the ID
 */
router.get('/:id', (req, res) => {
    const orderId = req.params.id;
    
    // VULNERABLE: No check if order belongs to current user
    const orderQuery = `
        SELECT 
            o.*,
            u.username,
            u.email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
    `;
    
    db.get(orderQuery, [orderId], (err, order) => {
        if (err) {
            console.error('Order detail error:', err);
            return res.status(500).send('Database error');
        }
        
        if (!order) {
            return res.status(404).render('404', {
                user: req.user,
                title: 'Order Not Found'
            });
        }
        
        // Get order items
        const itemsQuery = `
            SELECT 
                oi.*,
                p.name as product_name,
                p.image as product_image
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `;
        
        db.all(itemsQuery, [orderId], (err, items) => {
            if (err) {
                console.error('Order items error:', err);
                return res.status(500).send('Database error');
            }
            
            // IDOR FLAG: If viewing someone else's order
            let idorFlag = null;
            if (order.user_id !== req.user.id) {
                idorFlag = 'FLAG{1d0r_v13w_0th3r_us3r_0rd3rs}';
            }
            
            res.render('order-detail', {
                user: req.user,
                order: order,
                items: items || [],
                idorFlag: idorFlag,
                title: `Order #${order.order_number}`
            });
        });
    });
});

/**
 * POST /orders/place
 * Place a new order (from cart)
 */
router.post('/place', (req, res) => {
    const userId = req.user.id;
    
    // Get cart items
    const cartQuery = `
        SELECT 
            c.*,
            p.name,
            p.price,
            p.stock
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `;
    
    db.all(cartQuery, [userId], (err, cartItems) => {
        if (err || !cartItems || cartItems.length === 0) {
            return res.json({
                success: false,
                message: 'Cart is empty'
            });
        }
        
        // Calculate total
        let total = 0;
        for (let item of cartItems) {
            // VULNERABILITY: Business logic flaw - negative quantities
            total += item.price * item.quantity;
        }
        
        // Check user balance
        db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, user) => {
            if (err) {
                return res.json({
                    success: false,
                    message: 'Database error'
                });
            }
            
            // VULNERABLE: Allows negative totals to pass
            if (user.balance < total && total > 0) {
                return res.json({
                    success: false,
                    message: 'Insufficient balance'
                });
            }
            
            // Generate order number
            const orderNumber = 'ORD-' + Date.now();
            
            // Create order
            db.run(
                'INSERT INTO orders (user_id, order_number, total, status) VALUES (?, ?, ?, ?)',
                [userId, orderNumber, total, 'pending'],
                function(err) {
                    if (err) {
                        return res.json({
                            success: false,
                            message: 'Failed to create order'
                        });
                    }
                    
                    const orderId = this.lastID;
                    
                    // Insert order items
                    const stmt = db.prepare(
                        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)'
                    );
                    
                    cartItems.forEach(item => {
                        stmt.run(orderId, item.product_id, item.quantity, item.price);
                    });
                    
                    stmt.finalize();
                    
                    // Update user balance
                    const newBalance = user.balance - total;
                    db.run('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId]);
                    
                    // Clear cart
                    db.run('DELETE FROM cart WHERE user_id = ?', [userId]);
                    
                    // Check for business logic exploit
                    let flag = null;
                    if (total < 0) {
                        flag = 'FLAG{bus1n3ss_l0g1c_n3g4t1v3_pr1c3}';
                    }
                    
                    res.json({
                        success: true,
                        message: 'Order placed successfully',
                        orderNumber: orderNumber,
                        orderId: orderId,
                        total: total,
                        newBalance: newBalance,
                        flag: flag
                    });
                }
            );
        });
    });
});

module.exports = router;