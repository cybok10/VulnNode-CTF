const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { isAuthenticated } = require('../middleware/auth');
const axios = require('axios');

// Generate Order Number
function generateOrderNumber() {
    // VULNERABILITY: Predictable order number generation
    const timestamp = Date.now();
    return `ORD-${timestamp}`;
}

// Step 1: Get Checkout Page
router.get('/', isAuthenticated, (req, res) => {
    const userId = req.user.id;
    
    try {
        // Get cart items
        const items = db.prepare(`
            SELECT c.*, p.name, p.price, p.image_url, p.stock,
                   (c.quantity * p.price) as item_total
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `).all(userId);
        
        if (items.length === 0) {
            return res.redirect('/cart');
        }
        
        // Get user addresses
        const addresses = db.prepare(
            'SELECT * FROM addresses WHERE user_id = ?'
        ).all(userId);
        
        const subtotal = items.reduce((sum, item) => sum + parseFloat(item.item_total), 0);
        
        res.render('checkout', {
            user: req.user,
            items: items,
            addresses: addresses,
            subtotal: subtotal,
            title: 'Checkout'
        });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).render('500', {
            user: req.user,
            error: error.message,
            title: 'Error'
        });
    }
});

// Step 2: Process Order
router.post('/process', isAuthenticated, async (req, res) => {
    const {
        address,
        payment_method,
        subtotal,
        shipping_cost,
        tax,
        total
    } = req.body;
    
    const userId = req.user.id;
    
    try {
        // VULNERABILITY: Trusting client-provided totals without server-side recalculation
        // This allows price manipulation
        
        // Get cart items
        const items = db.prepare(`
            SELECT c.*, p.name, p.price, p.sku
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `).all(userId);
        
        if (items.length === 0) {
            return res.json({
                success: false,
                message: 'Cart is empty'
            });
        }
        
        // VULNERABILITY: Not recalculating total on server
        // Using client-provided values directly
        const orderNumber = generateOrderNumber();
        
        // VULNERABILITY: Check for negative total (business logic exploit)
        let flag = null;
        if (total < 0) {
            flag = 'FLAG{bus1n3ss_l0g1c_n3g4t1v3_pr1c3}';
        }
        
        // Create order
        const result = db.prepare(`
            INSERT INTO orders (
                user_id, order_number, total_amount,
                shipping_amount, tax_amount,
                status, payment_method, shipping_address
            ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
        `).run(
            userId,
            orderNumber,
            total || 0, // VULNERABILITY: Can be 0 or negative
            shipping_cost || 0,
            tax || 0,
            payment_method || 'credit_card',
            address || ''
        );
        
        const orderId = result.lastInsertRowid;
        
        // Insert order items
        const insertStmt = db.prepare(`
            INSERT INTO order_items (
                order_id, product_id, quantity, price, subtotal
            ) VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const item of items) {
            // VULNERABILITY: Using client quantity without validation
            const itemTotal = item.quantity * item.price;
            insertStmt.run(orderId, item.product_id, item.quantity, item.price, itemTotal);
        }
        
        // Clear cart
        db.prepare('DELETE FROM cart WHERE user_id = ?').run(userId);
        
        // Update user balance (if negative total, they get money!)
        db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?')
          .run(total, userId);
        
        res.json({
            success: true,
            message: 'Order created successfully',
            orderNumber: orderNumber,
            orderId: orderId,
            total: total,
            flag: flag
        });
    } catch (error) {
        console.error('Process order error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// VULNERABILITY: Generate Invoice with SSRF
router.post('/generate-invoice', isAuthenticated, async (req, res) => {
    const { order_id, template_url } = req.body;
    
    // VULNERABILITY: SSRF - Fetching template from user-provided URL
    // Can be used to scan internal network or access cloud metadata
    
    if (!template_url) {
        return res.status(400).json({ 
            success: false,
            error: 'Template URL required' 
        });
    }
    
    try {
        // VULNERABILITY: No URL validation or whitelist
        const response = await axios.get(template_url, {
            timeout: 5000,
            maxRedirects: 5
        });
        
        // Get order details
        const order = db.prepare(`
            SELECT o.*, u.username, u.email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `).get(order_id);
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        
        // VULNERABILITY: No ownership check
        // Anyone can generate invoice for any order
        
        // Check if SSRF was successful to internal service
        let flag = null;
        if (template_url.includes('localhost') || 
            template_url.includes('127.0.0.1') ||
            template_url.includes('169.254')) {
            flag = 'FLAG{ssrf_1nt3rn4l_n3tw0rk}';
        }
        
        res.json({
            success: true,
            message: 'Invoice generated',
            order: order,
            template: response.data.substring(0, 500), // Truncate
            flag: flag,
            // VULNERABILITY: Exposing response details
            ssrf_response: {
                status: response.status,
                headers: response.headers,
                data_length: response.data.length
            }
        });
    } catch (error) {
        // VULNERABILITY: Exposing detailed error information
        res.status(500).json({
            success: false,
            error: 'Failed to fetch template',
            message: error.message,
            url: template_url,
            details: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText
            } : error.toString()
        });
    }
});

// Get Order Confirmation
router.get('/confirmation/:order_number', (req, res) => {
    const { order_number } = req.params;
    
    try {
        // VULNERABILITY: No authentication required
        // VULNERABILITY: Predictable order numbers
        // Anyone can view any order by guessing order number
        
        const order = db.prepare(`
            SELECT o.*, u.email, u.phone
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.order_number = ?
        `).get(order_number);
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        
        // Get order items
        const items = db.prepare(`
            SELECT oi.*, p.name, p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `).all(order.id);
        
        // VULNERABILITY: Exposing sensitive customer information
        res.json({
            success: true,
            order: order,
            items: items,
            customer: {
                email: order.email,
                phone: order.phone
            }
        });
    } catch (error) {
        console.error('Confirmation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// VULNERABILITY: Update order total after creation
router.post('/update-total', (req, res) => {
    const { order_id, new_total } = req.body;
    
    try {
        // VULNERABILITY: No authentication
        // VULNERABILITY: No authorization check
        // Anyone can modify any order total
        
        db.prepare('UPDATE orders SET total_amount = ? WHERE id = ?')
          .run(new_total, order_id);
        
        let flag = null;
        if (new_total < 0) {
            flag = 'FLAG{bus1n3ss_l0g1c_n3g4t1v3_pr1c3}';
        }
        
        res.json({
            success: true,
            message: 'Order total updated',
            orderId: order_id,
            newTotal: new_total,
            warning: 'This endpoint is intentionally vulnerable!',
            flag: flag
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Integer Overflow Challenge
router.post('/calculate-tax', (req, res) => {
    const { subtotal, tax_rate } = req.body;
    
    // VULNERABILITY: Integer overflow when dealing with large numbers
    // JavaScript numbers have precision limits
    
    const tax = subtotal * (tax_rate / 100);
    const total = subtotal + tax;
    
    // VULNERABILITY: No input validation
    // Can cause NaN or Infinity
    
    res.json({
        success: true,
        subtotal: subtotal,
        tax_rate: tax_rate,
        tax: tax,
        total: total
    });
});

module.exports = router;