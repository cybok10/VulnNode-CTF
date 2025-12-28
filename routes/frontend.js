const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');

// ============================================================
// FRONTEND UI ROUTES
// ============================================================
// These routes render EJS templates for the user-facing pages
// Includes intentional vulnerabilities for CTF challenges

// --- CART PAGE ---
router.get('/cart', optionalAuth, (req, res) => {
    try {
        let cartItems = [];
        let cartTotal = 0;
        let discount = 0;
        let appliedCoupon = null;

        if (req.user) {
            // Logged in user - fetch cart from database
            cartItems = db.prepare(`
                SELECT c.*, p.name, p.price, p.image_url, p.stock
                FROM cart c
                JOIN products p ON c.product_id = p.id
                WHERE c.user_id = ?
            `).all(req.user.id);

            // Calculate total
            cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // Check for applied coupon in session
            if (req.session.coupon) {
                appliedCoupon = req.session.coupon;
                discount = calculateDiscount(cartTotal, appliedCoupon);
            }
        } else {
            // Guest user - use session cart
            cartItems = req.session.cart || [];
            cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }

        const finalTotal = cartTotal - discount;

        res.render('cart', {
            user: req.user,
            title: 'Shopping Cart',
            cartItems: cartItems,
            cartTotal: cartTotal,
            discount: discount,
            finalTotal: finalTotal,
            appliedCoupon: appliedCoupon,
            csrfToken: req.csrfToken
        });
    } catch (error) {
        console.error('Cart page error:', error);
        res.status(500).render('error', {
            user: req.user,
            title: 'Error',
            message: 'Unable to load cart',
            error: error // VULNERABILITY: Verbose error disclosure
        });
    }
});

// --- CHECKOUT PAGE ---
router.get('/checkout', isAuthenticated, (req, res) => {
    try {
        // Fetch cart items
        const cartItems = db.prepare(`
            SELECT c.*, p.name, p.price, p.image_url
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `).all(req.user.id);

        if (cartItems.length === 0) {
            return res.redirect('/cart');
        }

        // Calculate totals
        const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discount = req.session.coupon ? calculateDiscount(subtotal, req.session.coupon) : 0;
        const tax = (subtotal - discount) * 0.1; // 10% tax
        const shippingCost = subtotal > 50 ? 0 : 5.99; // Free shipping over $50
        const total = subtotal - discount + tax + shippingCost;

        // Fetch user addresses
        const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ?').all(req.user.id);
        
        // Fetch saved payment methods
        const paymentMethods = db.prepare('SELECT * FROM payment_methods WHERE user_id = ?').all(req.user.id);

        res.render('checkout', {
            user: req.user,
            title: 'Checkout',
            cartItems: cartItems,
            subtotal: subtotal,
            discount: discount,
            tax: tax,
            shippingCost: shippingCost,
            total: total,
            addresses: addresses,
            paymentMethods: paymentMethods,
            csrfToken: req.csrfToken
        });
    } catch (error) {
        console.error('Checkout page error:', error);
        res.status(500).render('error', {
            user: req.user,
            title: 'Error',
            message: 'Unable to load checkout',
            error: error // VULNERABILITY: Verbose error disclosure
        });
    }
});

// --- ORDER CONFIRMATION PAGE ---
router.get('/order-confirmation/:order_number', (req, res) => {
    try {
        const { order_number } = req.params;

        // VULNERABILITY: No authentication check - IDOR
        // Anyone can view any order by guessing the order number
        const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(order_number);

        if (!order) {
            return res.status(404).render('404', {
                user: req.user,
                title: '404 - Order Not Found',
                message: 'Order not found'
            });
        }

        // Fetch order items
        const orderItems = db.prepare(`
            SELECT oi.*, p.name, p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `).all(order.id);

        // VULNERABILITY: PII Exposure - Shows all user details
        const customer = db.prepare('SELECT * FROM users WHERE id = ?').get(order.user_id);

        res.render('order-confirmation', {
            user: req.user,
            title: 'Order Confirmation',
            order: order,
            orderItems: orderItems,
            customer: customer // Exposes email, phone, etc.
        });
    } catch (error) {
        console.error('Order confirmation error:', error);
        res.status(500).render('error', {
            user: req.user,
            title: 'Error',
            message: 'Unable to load order',
            error: error // VULNERABILITY: Stack trace exposure
        });
    }
});

// --- SUPPORT TICKET PAGE ---
router.get('/support', optionalAuth, (req, res) => {
    try {
        let tickets = [];
        
        if (req.user) {
            // Fetch user's tickets
            tickets = db.prepare(`
                SELECT * FROM support_tickets 
                WHERE user_id = ? 
                ORDER BY created_at DESC
            `).all(req.user.id);
        }

        res.render('support', {
            user: req.user,
            title: 'Support Center',
            tickets: tickets,
            csrfToken: req.csrfToken
        });
    } catch (error) {
        console.error('Support page error:', error);
        res.status(500).render('error', {
            user: req.user,
            title: 'Error',
            message: 'Unable to load support page',
            error: error
        });
    }
});

// --- SUPPORT TICKET DETAIL PAGE ---
router.get('/support/ticket/:id', isAuthenticated, (req, res) => {
    try {
        const ticketId = req.params.id;

        // VULNERABILITY: IDOR - No ownership check
        // Users can view other users' tickets by changing the ID
        const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId);

        if (!ticket) {
            return res.status(404).render('404', {
                user: req.user,
                title: '404 - Ticket Not Found'
            });
        }

        // Fetch messages
        const messages = db.prepare(`
            SELECT * FROM ticket_messages 
            WHERE ticket_id = ? 
            ORDER BY created_at ASC
        `).all(ticketId);

        res.render('support-ticket', {
            user: req.user,
            title: `Ticket #${ticket.id}`,
            ticket: ticket,
            messages: messages,
            csrfToken: req.csrfToken
        });
    } catch (error) {
        console.error('Ticket detail error:', error);
        res.status(500).render('error', {
            user: req.user,
            title: 'Error',
            message: 'Unable to load ticket',
            error: error
        });
    }
});

// --- PRODUCT DETAIL PAGE ---
router.get('/product/:id', optionalAuth, (req, res) => {
    try {
        const productId = req.params.id;

        // VULNERABILITY: SQL Injection possible if ID not validated
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

        if (!product) {
            return res.status(404).render('404', {
                user: req.user,
                title: '404 - Product Not Found'
            });
        }

        // Fetch reviews
        const reviews = db.prepare(`
            SELECT r.*, u.username 
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ?
            ORDER BY r.created_at DESC
        `).all(productId);

        res.render('product-detail', {
            user: req.user,
            title: product.name,
            product: product,
            reviews: reviews,
            csrfToken: req.csrfToken
        });
    } catch (error) {
        console.error('Product detail error:', error);
        res.status(500).render('error', {
            user: req.user,
            title: 'Error',
            message: 'Unable to load product',
            error: error
        });
    }
});

// --- USER PROFILE PAGE ---
router.get('/profile', isAuthenticated, (req, res) => {
    try {
        // Fetch user orders
        const orders = db.prepare(`
            SELECT * FROM orders 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `).all(req.user.id);

        // Fetch addresses
        const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ?').all(req.user.id);

        res.render('profile', {
            user: req.user,
            title: 'My Profile',
            orders: orders,
            addresses: addresses,
            csrfToken: req.csrfToken
        });
    } catch (error) {
        console.error('Profile page error:', error);
        res.status(500).render('error', {
            user: req.user,
            title: 'Error',
            message: 'Unable to load profile',
            error: error
        });
    }
});

// --- ADMIN DASHBOARD PAGE ---
router.get('/admin', isAuthenticated, (req, res) => {
    try {
        // VULNERABILITY: Weak admin check
        if (req.user.username !== 'admin') {
            return res.status(403).render('error', {
                user: req.user,
                title: 'Access Denied',
                message: 'Admin access required'
            });
        }

        // Fetch statistics
        const stats = {
            totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
            totalOrders: db.prepare('SELECT COUNT(*) as count FROM orders').get().count,
            totalRevenue: db.prepare('SELECT SUM(total) as sum FROM orders').get().sum || 0,
            totalProducts: db.prepare('SELECT COUNT(*) as count FROM products').get().count
        };

        // Recent orders
        const recentOrders = db.prepare(`
            SELECT o.*, u.username 
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `).all();

        res.render('admin-dashboard', {
            user: req.user,
            title: 'Admin Dashboard',
            stats: stats,
            recentOrders: recentOrders,
            csrfToken: req.csrfToken
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).render('error', {
            user: req.user,
            title: 'Error',
            message: 'Unable to load admin dashboard',
            error: error
        });
    }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function calculateDiscount(subtotal, coupon) {
    if (!coupon) return 0;

    if (coupon.discount_type === 'percentage') {
        return (subtotal * coupon.discount_value) / 100;
    } else if (coupon.discount_type === 'fixed') {
        return Math.min(coupon.discount_value, subtotal);
    }
    return 0;
}

module.exports = router;