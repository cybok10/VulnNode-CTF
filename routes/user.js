const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

/**
 * USER PROFILE & ACCOUNT MANAGEMENT
 * Contains IDOR and privilege escalation vulnerabilities
 */

// User Dashboard
router.get('/dashboard', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user stats
        const orderCount = db.prepare(
            'SELECT COUNT(*) as count FROM orders WHERE user_id = ?'
        ).get(userId);
        
        const recentOrders = db.prepare(`
            SELECT * FROM orders 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 5
        `).all(userId);
        
        const solvedChallenges = db.prepare(
            'SELECT COUNT(*) as count FROM user_progress WHERE user_id = ?'
        ).get(userId);
        
        res.render('dashboard', {
            user: req.user,
            orderCount: orderCount.count,
            recentOrders: recentOrders,
            solvedChallenges: solvedChallenges.count,
            title: 'Dashboard'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('500', {
            user: req.user,
            error: error.message,
            title: 'Error'
        });
    }
});

// View User Profile - VULNERABILITY: IDOR
router.get('/profile/:id', optionalAuth, (req, res) => {
    try {
        const userId = req.params.id;
        
        // VULNERABILITY: No authorization check - can view ANY user profile
        const user = db.prepare(`
            SELECT id, username, email, first_name, last_name, 
                   phone, avatar, bio, balance, loyalty_points, created_at
            FROM users 
            WHERE id = ?
        `).get(userId);
        
        if (!user) {
            return res.status(404).render('404', {
                user: req.user,
                message: 'User not found',
                title: 'Not Found'
            });
        }
        
        // Get user's solved challenges count
        const achievements = db.prepare(
            'SELECT COUNT(*) as count FROM user_progress WHERE user_id = ?'
        ).get(userId);
        
        res.render('profile', {
            user: req.user,
            profileUser: user,
            achievements: achievements.count,
            isOwnProfile: req.user && req.user.id === parseInt(userId),
            title: `${user.username}'s Profile`
        });
    } catch (error) {
        console.error('Profile view error:', error);
        res.status(500).render('500', {
            user: req.user,
            error: error.message,
            title: 'Error'
        });
    }
});

// Edit Profile
router.get('/edit-profile', isAuthenticated, (req, res) => {
    res.render('edit-profile', {
        user: req.user,
        title: 'Edit Profile'
    });
});

// Update Profile - VULNERABILITY: Mass Assignment
router.post('/update-profile', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        const { first_name, last_name, email, phone, bio, avatar } = req.body;
        
        // VULNERABILITY: No input validation
        // VULNERABILITY: Mass assignment if extra fields sent
        
        db.prepare(`
            UPDATE users 
            SET first_name = ?, last_name = ?, email = ?, 
                phone = ?, bio = ?, avatar = ?
            WHERE id = ?
        `).run(first_name, last_name, email, phone, bio, avatar, userId);
        
        // Update session
        req.session.user = {
            ...req.user,
            first_name,
            last_name,
            email,
            phone,
            bio,
            avatar
        };
        
        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Change Password
router.post('/change-password', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password } = req.body;
        
        // Get current user
        const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);
        
        // Verify current password
        const valid = bcrypt.compareSync(current_password, user.password);
        
        if (!valid) {
            return res.json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // VULNERABILITY: No password complexity requirements
        const hash = bcrypt.hashSync(new_password, 10);
        
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, userId);
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// View Order History
router.get('/orders', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        
        const orders = db.prepare(`
            SELECT * FROM orders 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `).all(userId);
        
        res.render('orders', {
            user: req.user,
            orders: orders,
            title: 'My Orders'
        });
    } catch (error) {
        console.error('Orders error:', error);
        res.status(500).render('500', {
            user: req.user,
            error: error.message,
            title: 'Error'
        });
    }
});

// View Order Details - VULNERABILITY: IDOR
router.get('/order/:id', isAuthenticated, (req, res) => {
    try {
        const orderId = req.params.id;
        
        // VULNERABILITY: No authorization check - can view ANY order
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        const items = db.prepare(`
            SELECT oi.*, p.name, p.image_url
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `).all(orderId);
        
        res.json({
            success: true,
            order: order,
            items: items
        });
    } catch (error) {
        console.error('Order details error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Add Balance - VULNERABILITY: No payment verification
router.post('/add-balance', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        const { amount } = req.body;
        
        // VULNERABILITY: No payment gateway integration
        // VULNERABILITY: Can add negative amounts
        
        const parsedAmount = parseFloat(amount);
        
        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?')
          .run(parsedAmount, userId);
        
        let flag = null;
        if (parsedAmount < 0) {
            flag = 'FLAG{n3g4t1v3_b4l4nc3_tr1ck}';
        }
        
        res.json({
            success: true,
            message: `Balance updated by $${parsedAmount}`,
            flag: flag
        });
    } catch (error) {
        console.error('Add balance error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get User API Key - Information Disclosure
router.get('/api-key', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = db.prepare('SELECT api_key FROM users WHERE id = ?').get(userId);
        
        // VULNERABILITY: Exposing API key in plain text
        res.json({
            success: true,
            api_key: user.api_key || 'No API key generated',
            warning: 'Keep your API key secret!'
        });
    } catch (error) {
        console.error('API key error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete Account - VULNERABILITY: No confirmation
router.post('/delete-account', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        
        // VULNERABILITY: No password confirmation
        // VULNERABILITY: No cascading delete handling
        
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);
        
        req.session.destroy();
        
        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// User Stats API
router.get('/stats', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        
        const stats = {
            totalOrders: db.prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?').get(userId).count,
            totalSpent: db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE user_id = ?').get(userId).total,
            solvedChallenges: db.prepare('SELECT COUNT(*) as count FROM user_progress WHERE user_id = ?').get(userId).count,
            loyaltyPoints: req.user.loyalty_points || 0,
            balance: req.user.balance || 0
        };
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
