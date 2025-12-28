const express = require('express');
const router = express.Router();
const db = require('../database/db');

/**
 * Frontend Routes - UI Pages
 * These routes render EJS templates for the web interface
 */

// Shopping Cart Page
router.get('/cart', (req, res) => {
    try {
        const userId = req.session?.userId || null;
        
        if (!userId) {
            // Guest cart - stored in session
            return res.render('cart', {
                user: req.session.user,
                title: 'Shopping Cart',
                cartItems: req.session.cart || [],
                cartTotal: calculateCartTotal(req.session.cart || [])
            });
        }

        // Logged in user - fetch from database
        const query = `
            SELECT c.*, p.name, p.price, p.image_url 
            FROM cart c 
            JOIN products p ON c.product_id = p.id 
            WHERE c.user_id = ${userId}
        `; // VULNERABILITY: SQL Injection via session manipulation

        db.all(query, [], (err, cartItems) => {
            if (err) {
                // VULNERABILITY: Verbose error messages
                return res.status(500).render('500', { 
                    error: err.message, 
                    stack: err.stack,
                    query: query // Leak SQL query
                });
            }

            res.render('cart', {
                user: req.session.user,
                title: 'Shopping Cart',
                cartItems: cartItems || [],
                cartTotal: calculateCartTotal(cartItems || [])
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Checkout Page
router.get('/checkout', (req, res) => {
    try {
        const userId = req.session?.userId;
        
        if (!userId) {
            return res.redirect('/auth/login?redirect=/checkout');
        }

        // VULNERABILITY: IDOR - Can view any user's cart by manipulating session
        const query = `SELECT c.*, p.name, p.price FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ${userId}`;
        
        db.all(query, [], (err, cartItems) => {
            if (err) {
                return res.status(500).render('500', { error: err });
            }

            // Fetch user addresses
            db.all('SELECT * FROM addresses WHERE user_id = ?', [userId], (err, addresses) => {
                res.render('checkout', {
                    user: req.session.user,
                    title: 'Checkout',
                    cartItems: cartItems || [],
                    addresses: addresses || [],
                    cartTotal: calculateCartTotal(cartItems || [])
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Support Page
router.get('/support', (req, res) => {
    try {
        const userId = req.session?.userId;

        if (!userId) {
            return res.render('support', {
                user: req.session.user,
                title: 'Support Center',
                tickets: [],
                canCreateTicket: false
            });
        }

        // VULNERABILITY: IDOR - No proper authorization check
        const ticketId = req.query.view || null;
        
        if (ticketId) {
            // View specific ticket - VULNERABILITY: Can view any ticket
            db.get(`SELECT * FROM support_tickets WHERE id = ${ticketId}`, [], (err, ticket) => {
                if (err) {
                    return res.status(500).render('500', { error: err });
                }

                // Fetch messages
                db.all(`SELECT * FROM ticket_messages WHERE ticket_id = ${ticketId}`, [], (err, messages) => {
                    res.render('support', {
                        user: req.session.user,
                        title: 'Support Ticket',
                        ticket: ticket,
                        messages: messages || [],
                        canCreateTicket: true
                    });
                });
            });
        } else {
            // List all user tickets
            db.all('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, tickets) => {
                res.render('support', {
                    user: req.session.user,
                    title: 'Support Center',
                    tickets: tickets || [],
                    canCreateTicket: true
                });
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin Panel Page
router.get('/admin', (req, res) => {
    try {
        // VULNERABILITY: Weak authentication check
        if (!req.session.user || req.session.user.username !== 'admin') {
            return res.status(403).render('403', { 
                message: 'Access Denied',
                hint: '<!-- Try manipulating your session cookie -->'
            });
        }

        // Fetch statistics
        db.get('SELECT COUNT(*) as total_users FROM users', [], (err, userCount) => {
            db.get('SELECT COUNT(*) as total_orders FROM orders', [], (err, orderCount) => {
                db.get('SELECT COUNT(*) as total_products FROM products', [], (err, productCount) => {
                    res.render('admin', {
                        user: req.session.user,
                        title: 'Admin Panel',
                        stats: {
                            users: userCount?.total_users || 0,
                            orders: orderCount?.total_orders || 0,
                            products: productCount?.total_products || 0
                        }
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CTF Score Board
router.get('/scoreboard', (req, res) => {
    try {
        const userId = req.session?.userId || null;
        
        // Fetch all challenges
        db.all('SELECT * FROM secrets ORDER BY id', [], (err, challenges) => {
            if (err) {
                return res.status(500).render('500', { error: err });
            }

            let userProgress = [];
            
            if (userId) {
                // Fetch user progress
                db.all('SELECT * FROM user_progress WHERE user_id = ?', [userId], (err, progress) => {
                    userProgress = progress || [];
                    
                    res.render('scoreboard', {
                        user: req.session.user,
                        title: 'CTF Challenges',
                        challenges: challenges || [],
                        progress: userProgress,
                        totalChallenges: challenges?.length || 0,
                        solvedCount: userProgress.filter(p => p.solved).length
                    });
                });
            } else {
                res.render('scoreboard', {
                    user: null,
                    title: 'CTF Challenges',
                    challenges: challenges || [],
                    progress: [],
                    totalChallenges: challenges?.length || 0,
                    solvedCount: 0
                });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Profile Page
router.get('/profile/:id?', (req, res) => {
    try {
        // VULNERABILITY: IDOR - Can view any user's profile
        const profileId = req.params.id || req.session?.userId;
        
        if (!profileId) {
            return res.redirect('/auth/login');
        }

        // VULNERABILITY: SQL Injection
        const query = `SELECT * FROM users WHERE id = ${profileId}`;
        
        db.get(query, [], (err, profile) => {
            if (err) {
                return res.status(500).render('500', { 
                    error: err.message,
                    query: query // Information disclosure
                });
            }

            if (!profile) {
                return res.status(404).render('404');
            }

            // Fetch user's orders
            db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [profileId], (err, orders) => {
                // Fetch user's progress
                db.all('SELECT * FROM user_progress WHERE user_id = ?', [profileId], (err, progress) => {
                    res.render('profile', {
                        user: req.session.user,
                        title: `${profile.username}'s Profile`,
                        profile: profile,
                        orders: orders || [],
                        progress: progress || [],
                        isOwnProfile: req.session?.userId == profileId
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function
function calculateCartTotal(cartItems) {
    if (!cartItems || cartItems.length === 0) return 0;
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

module.exports = router;
