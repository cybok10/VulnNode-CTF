const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Cart Page
router.get('/cart', isAuthenticated, (req, res) => {
    res.render('cart', {
        user: req.session.user,
        title: 'Shopping Cart'
    });
});

// Checkout Page
router.get('/checkout', isAuthenticated, (req, res) => {
    res.render('checkout', {
        user: req.session.user,
        title: 'Checkout'
    });
});

// Order Confirmation Page
router.get('/checkout/confirmation/:order_number', (req, res) => {
    // VULNERABILITY: No authentication check - IDOR
    res.render('order-confirmation', {
        user: req.session.user,
        order_number: req.params.order_number,
        title: 'Order Confirmation'
    });
});

// My Orders Page
router.get('/orders', isAuthenticated, (req, res) => {
    res.render('orders', {
        user: req.session.user,
        title: 'My Orders'
    });
});

// Support Tickets Page
router.get('/support', isAuthenticated, (req, res) => {
    res.render('support', {
        user: req.session.user,
        title: 'Support Tickets'
    });
});

// Create Support Ticket Page
router.get('/support/create', isAuthenticated, (req, res) => {
    res.render('support-create', {
        user: req.session.user,
        title: 'Create Support Ticket'
    });
});

// View Support Ticket Page (IDOR vulnerability)
router.get('/support/:id', isAuthenticated, (req, res) => {
    res.render('support-detail', {
        user: req.session.user,
        ticket_id: req.params.id,
        title: 'Support Ticket'
    });
});

// Admin Panel (with vulnerabilities)
router.get('/admin', isAdmin, (req, res) => {
    res.render('admin-panel', {
        user: req.session.user,
        title: 'Admin Panel'
    });
});

// Admin Users Management
router.get('/admin/users', isAdmin, (req, res) => {
    res.render('admin-users', {
        user: req.session.user,
        title: 'User Management'
    });
});

// Admin Support Tickets
router.get('/admin/tickets', isAdmin, (req, res) => {
    res.render('admin-tickets', {
        user: req.session.user,
        title: 'Support Tickets - Admin'
    });
});

// Admin System Info (Command Injection target)
router.get('/admin/system', isAdmin, (req, res) => {
    res.render('admin-system', {
        user: req.session.user,
        title: 'System Information'
    });
});

// Admin Logs (LFI target)
router.get('/admin/logs', isAdmin, (req, res) => {
    res.render('admin-logs', {
        user: req.session.user,
        title: 'System Logs'
    });
});

// User Profile
router.get('/user/profile', isAuthenticated, (req, res) => {
    res.render('profile', {
        user: req.session.user,
        title: 'My Profile'
    });
});

module.exports = router;