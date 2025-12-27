const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/vuln_app.db');
const { isAuthenticated } = require('../middleware/auth');
const axios = require('axios');
const crypto = require('crypto');

// Generate Order Number
function generateOrderNumber() {
    // VULNERABILITY: Predictable order number generation
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${new Date().getFullYear()}-${timestamp}${random}`;
}

// Step 1: Get Checkout Page
router.get('/', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    
    // Get cart items
    db.all(`
        SELECT c.*, p.name, p.price, p.image, p.stock_quantity,
               (c.quantity * p.price) as item_total
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `, [userId], (err, items) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }
        
        // Get user addresses
        db.all('SELECT * FROM addresses WHERE user_id = ?', [userId], (err, addresses) => {
            const subtotal = items.reduce((sum, item) => sum + parseFloat(item.item_total), 0);
            
            res.json({
                items: items,
                addresses: addresses,
                subtotal: subtotal,
                appliedCoupon: req.session.appliedCoupon || null
            });
        });
    });
});

// Step 2: Validate Stock and Calculate Total
router.post('/validate', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    
    db.all(`
        SELECT c.*, p.name, p.price, p.stock_quantity,
               (c.quantity * p.price) as item_total
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `, [userId], (err, items) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // VULNERABILITY: Weak stock validation
        const stockIssues = [];
        items.forEach(item => {
            // VULNERABILITY: Allows negative quantities to pass
            if (item.quantity > item.stock_quantity && item.quantity > 0) {
                stockIssues.push({
                    product: item.name,
                    requested: item.quantity,
                    available: item.stock_quantity
                });
            }
        });
        
        if (stockIssues.length > 0) {
            return res.status(400).json({
                error: 'Some items are out of stock',
                issues: stockIssues
            });
        }
        
        res.json({ message: 'Stock validated', items: items });
    });
});

// Step 3: Process Order
router.post('/process', isAuthenticated, async (req, res) => {
    const {
        shipping_address_id,
        billing_address_id,
        payment_method,
        card_token,
        subtotal,
        discount,
        shipping_cost,
        tax,
        total
    } = req.body;
    
    const userId = req.session.user.id;
    
    // VULNERABILITY: Trusting client-provided totals without server-side recalculation
    // This allows price manipulation
    
    // Get cart items
    db.all(`
        SELECT c.*, p.name, p.price, p.sku
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    `, [userId], async (err, items) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }
        
        // VULNERABILITY: Not recalculating total on server
        // Using client-provided values directly
        const orderNumber = generateOrderNumber();
        
        // VULNERABILITY: Payment processing bypass
        let paymentStatus = 'pending';
        
        if (payment_method === 'credit_card') {
            // VULNERABILITY: Weak payment validation
            if (card_token && card_token.length > 5) {
                // Accepting any token without actual validation
                paymentStatus = 'completed';
            }
        } else if (payment_method === 'paypal') {
            // VULNERABILITY: No actual PayPal integration
            paymentStatus = 'completed';
        } else if (payment_method === 'wallet') {
            // VULNERABILITY: No balance check
            paymentStatus = 'completed';
        }
        
        // Create order
        db.run(`
            INSERT INTO orders (
                order_number, user_id, total_amount, subtotal,
                discount_amount, shipping_cost, tax_amount,
                coupon_code, payment_method, payment_status,
                order_status, shipping_address_id, billing_address_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `, [
            orderNumber,
            userId,
            total || 0, // VULNERABILITY: Can be 0 or negative
            subtotal || 0,
            discount || 0,
            shipping_cost || 0,
            tax || 0,
            req.session.appliedCoupon ? req.session.appliedCoupon.code : null,
            payment_method,
            paymentStatus,
            shipping_address_id,
            billing_address_id
        ], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const orderId = this.lastID;
            
            // Insert order items
            const insertPromises = items.map(item => {
                return new Promise((resolve, reject) => {
                    // VULNERABILITY: Using client quantity without validation
                    const itemTotal = item.quantity * item.price;
                    
                    db.run(`
                        INSERT INTO order_items (
                            order_id, product_id, product_name,
                            quantity, unit_price, total_price, sku
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [
                        orderId,
                        item.product_id,
                        item.name,
                        item.quantity,
                        item.price,
                        itemTotal,
                        item.sku
                    ], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
            
            Promise.all(insertPromises)
                .then(() => {
                    // Clear cart
                    db.run('DELETE FROM cart WHERE user_id = ?', [userId]);
                    
                    // Clear coupon from session
                    delete req.session.appliedCoupon;
                    
                    res.json({
                        message: 'Order created successfully',
                        order_number: orderNumber,
                        order_id: orderId,
                        total: total,
                        payment_status: paymentStatus
                    });
                })
                .catch(err => {
                    res.status(500).json({ error: err.message });
                });
        });
    });
});

// VULNERABILITY: Generate Invoice with SSRF
router.post('/generate-invoice', isAuthenticated, async (req, res) => {
    const { order_id, template_url } = req.body;
    
    // VULNERABILITY: SSRF - Fetching template from user-provided URL
    // Can be used to scan internal network or access cloud metadata
    
    if (!template_url) {
        return res.status(400).json({ error: 'Template URL required' });
    }
    
    try {
        // VULNERABILITY: No URL validation or whitelist
        const response = await axios.get(template_url, {
            timeout: 5000,
            // VULNERABILITY: Following redirects
            maxRedirects: 5
        });
        
        // Get order details
        db.get(`
            SELECT o.*, u.username, u.email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `, [order_id], (err, order) => {
            if (err || !order) {
                return res.status(404).json({ error: 'Order not found' });
            }
            
            // VULNERABILITY: No ownership check
            // Anyone can generate invoice for any order
            
            res.json({
                message: 'Invoice generated',
                order: order,
                template: response.data,
                // VULNERABILITY: Exposing response details
                ssrf_response: {
                    status: response.status,
                    headers: response.headers,
                    data_length: response.data.length
                }
            });
        });
    } catch (error) {
        // VULNERABILITY: Exposing detailed error information
        res.status(500).json({
            error: 'Failed to fetch template',
            message: error.message,
            url: template_url,
            // Exposing internal network information
            details: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                headers: error.response.headers
            } : error.toString()
        });
    }
});

// Apply Promo Code During Checkout
router.post('/apply-promo', isAuthenticated, (req, res) => {
    const { promo_code, subtotal } = req.body;
    
    // VULNERABILITY: SQL Injection
    const query = `SELECT * FROM coupons WHERE code = '${promo_code}' AND is_active = 1`;
    
    db.get(query, (err, coupon) => {
        if (err) {
            return res.status(500).json({ error: err.message, query: query });
        }
        
        if (!coupon) {
            return res.status(404).json({ error: 'Invalid promo code' });
        }
        
        // VULNERABILITY: Race condition - can use same coupon multiple times
        // No atomic increment of used_count
        
        let discount = 0;
        
        if (coupon.discount_type === 'percentage') {
            discount = subtotal * (coupon.discount_value / 100);
            // VULNERABILITY: No max_discount check
        } else if (coupon.discount_type === 'fixed') {
            discount = coupon.discount_value;
        }
        
        // VULNERABILITY: Not checking usage_limit or user_limit
        
        res.json({
            message: 'Promo code applied',
            discount: discount,
            coupon: coupon
        });
    });
});

// Get Order Confirmation
router.get('/confirmation/:order_number', (req, res) => {
    const { order_number } = req.params;
    
    // VULNERABILITY: No authentication required
    // VULNERABILITY: Predictable order numbers
    // Anyone can view any order by guessing order number
    
    db.get(`
        SELECT o.*, u.email, u.phone
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.order_number = ?
    `, [order_number], (err, order) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Get order items
        db.all(`
            SELECT * FROM order_items WHERE order_id = ?
        `, [order.id], (err, items) => {
            // VULNERABILITY: Exposing sensitive customer information
            res.json({
                order: order,
                items: items,
                // Exposing PII
                customer: {
                    email: order.email,
                    phone: order.phone
                }
            });
        });
    });
});

// VULNERABILITY: Update order total after creation
router.post('/update-total', (req, res) => {
    const { order_id, new_total } = req.body;
    
    // VULNERABILITY: No authentication
    // VULNERABILITY: No authorization check
    // Anyone can modify any order total
    
    db.run(`UPDATE orders SET total_amount = ? WHERE id = ?`, [new_total, order_id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            message: 'Order total updated',
            order_id: order_id,
            new_total: new_total,
            warning: 'This endpoint is intentionally vulnerable!'
        });
    });
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
        subtotal: subtotal,
        tax_rate: tax_rate,
        tax: tax,
        total: total
    });
});

module.exports = router;