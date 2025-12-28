const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');

// ======================
// CART PAGE
// ======================
router.get('/cart', optionalAuth, (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        let cartItems = [];
        let cartTotal = 0;

        if (userId) {
            // Get cart items for logged-in user
            const items = db.prepare(`
                SELECT 
                    c.id,
                    c.quantity,
                    p.id as product_id,
                    p.name,
                    p.price,
                    p.image_url,
                    (p.price * c.quantity) as subtotal
                FROM cart c
                JOIN products p ON c.product_id = p.id
                WHERE c.user_id = ?
            `).all(userId);

            cartItems = items;
            cartTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        }

        res.render('cart', {
            user: req.user,
            title: 'Shopping Cart',
            cartItems,
            cartTotal,
            itemCount: cartItems.length
        });
    } catch (err) {
        console.error('Cart page error:', err);
        res.status(500).render('error', { 
            user: req.user,
            error: 'Failed to load cart',
            message: err.message // VULNERABILITY: Verbose error messages
        });
    }
});

// ======================
// CHECKOUT PAGE
// ======================
router.get('/checkout', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;

        // Get cart items
        const cartItems = db.prepare(`
            SELECT 
                c.id,
                c.quantity,
                p.id as product_id,
                p.name,
                p.price,
                p.image_url,
                (p.price * c.quantity) as subtotal
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `).all(userId);

        if (cartItems.length === 0) {
            return res.redirect('/cart?error=empty');
        }

        const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
        const shipping = subtotal > 50 ? 0 : 9.99;
        const tax = subtotal * 0.08;
        const total = subtotal + shipping + tax;

        // Get user addresses
        const addresses = db.prepare(`
            SELECT * FROM addresses WHERE user_id = ?
        `).all(userId);

        // Get saved payment methods
        const paymentMethods = db.prepare(`
            SELECT * FROM payment_methods WHERE user_id = ?
        `).all(userId);

        res.render('checkout', {
            user: req.user,
            title: 'Checkout',
            cartItems,
            subtotal,
            shipping,
            tax,
            total,
            addresses,
            paymentMethods
        });
    } catch (err) {
        console.error('Checkout page error:', err);
        res.status(500).render('error', { 
            user: req.user,
            error: 'Failed to load checkout',
            message: err.message
        });
    }
});

// ======================
// ORDER CONFIRMATION PAGE
// ======================
router.get('/order/:orderNumber', (req, res) => {
    try {
        const { orderNumber } = req.params;

        // VULNERABILITY: No authentication check - IDOR
        // Anyone can view any order by guessing order number
        const order = db.prepare(`
            SELECT 
                o.*,
                u.username,
                u.email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.order_number = ?
        `).get(orderNumber);

        if (!order) {
            return res.status(404).render('404', {
                user: req.user,
                title: 'Order Not Found',
                path: req.path
            });
        }

        // Get order items
        const orderItems = db.prepare(`
            SELECT 
                oi.*,
                p.name,
                p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `).all(order.id);

        res.render('order-confirmation', {
            user: req.user,
            title: 'Order Confirmation',
            order,
            orderItems
        });
    } catch (err) {
        console.error('Order confirmation error:', err);
        res.status(500).render('error', { 
            user: req.user,
            error: 'Failed to load order',
            message: err.message
        });
    }
});

// ======================
// SUPPORT TICKET PAGE
// ======================
router.get('/support', optionalAuth, (req, res) => {
    try {
        let tickets = [];

        if (req.user) {
            // VULNERABILITY: SQL Injection via user_id
            // In real scenario, user could manipulate session
            tickets = db.prepare(`
                SELECT 
                    st.*,
                    (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = st.id) as message_count
                FROM support_tickets st
                WHERE st.user_id = ${req.user.id}
                ORDER BY st.created_at DESC
            `).all();
        }

        res.render('support', {
            user: req.user,
            title: 'Support Center',
            tickets
        });
    } catch (err) {
        console.error('Support page error:', err);
        res.status(500).render('error', { 
            user: req.user,
            error: 'Failed to load support',
            message: err.message
        });
    }
});

// ======================
// SUPPORT TICKET DETAIL
// ======================
router.get('/support/ticket/:id', isAuthenticated, (req, res) => {
    try {
        const ticketId = req.params.id;

        // VULNERABILITY: IDOR - No ownership check
        const ticket = db.prepare(`
            SELECT * FROM support_tickets WHERE id = ?
        `).get(ticketId);

        if (!ticket) {
            return res.status(404).render('404', {
                user: req.user,
                title: 'Ticket Not Found',
                path: req.path
            });
        }

        // Get messages
        const messages = db.prepare(`
            SELECT 
                tm.*,
                u.username
            FROM ticket_messages tm
            LEFT JOIN users u ON tm.sender_id = u.id
            WHERE tm.ticket_id = ?
            ORDER BY tm.created_at ASC
        `).all(ticketId);

        res.render('ticket-detail', {
            user: req.user,
            title: 'Support Ticket',
            ticket,
            messages
        });
    } catch (err) {
        console.error('Ticket detail error:', err);
        res.status(500).render('error', { 
            user: req.user,
            error: 'Failed to load ticket',
            message: err.message
        });
    }
});

// ======================
// SCOREBOARD PAGE
// ======================
router.get('/scoreboard', optionalAuth, (req, res) => {
    try {
        // Get all challenges
        const challenges = db.prepare(`
            SELECT * FROM secrets ORDER BY id
        `).all();

        let userProgress = [];
        if (req.user) {
            userProgress = db.prepare(`
                SELECT challenge_id FROM user_progress WHERE user_id = ?
            `).all(req.user.id).map(r => r.challenge_id);
        }

        // Calculate statistics
        const totalChallenges = challenges.length;
        const solvedCount = userProgress.length;
        const percent = totalChallenges > 0 ? Math.round((solvedCount / totalChallenges) * 100) : 0;

        res.render('scoreboard', {
            user: req.user,
            title: 'CTF Scoreboard',
            challenges,
            userProgress,
            percent,  // Pass percent at top level for template
            stats: {
                total: totalChallenges,
                solved: solvedCount,
                percentage: percent  // Also keep in stats for backward compatibility
            }
        });
    } catch (err) {
        console.error('Scoreboard error:', err);
        res.status(500).render('error', { 
            user: req.user,
            error: 'Failed to load scoreboard',
            message: err.message
        });
    }
});

// ======================
// PROFILE PAGE
// ======================
router.get('/profile', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;

        // Get user details
        const user = db.prepare(`
            SELECT id, username, email, created_at FROM users WHERE id = ?
        `).get(userId);

        // Get order history
        const orders = db.prepare(`
            SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
        `).all(userId);

        // Get addresses
        const addresses = db.prepare(`
            SELECT * FROM addresses WHERE user_id = ?
        `).all(userId);

        res.render('profile', {
            user: req.user,
            title: 'My Profile',
            profile: user,
            orders,
            addresses
        });
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).render('error', { 
            user: req.user,
            error: 'Failed to load profile',
            message: err.message
        });
    }
});

module.exports = router;
