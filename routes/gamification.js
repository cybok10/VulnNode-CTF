const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { optionalAuth } = require('../middleware/auth');

// Apply optional auth (works for both logged in and guest users)
router.use(optionalAuth);

/**
 * GET /gamification
 * User achievements, badges, and loyalty points
 */
router.get('/', (req, res) => {
    if (!req.user) {
        return res.redirect('/auth/login');
    }
    
    try {
        // Get user stats
        const userStats = db.prepare(`
            SELECT 
                loyalty_points,
                (SELECT COUNT(*) FROM orders WHERE user_id = ?) as total_orders,
                (SELECT COUNT(*) FROM reviews WHERE user_id = ?) as total_reviews,
                (SELECT COUNT(*) FROM user_progress WHERE user_id = ?) as challenges_solved
            FROM users
            WHERE id = ?
        `).get(req.user.id, req.user.id, req.user.id, req.user.id);
        
        // Get recent achievements
        const recentSolves = db.prepare(`
            SELECT 
                s.name as challenge_name,
                s.points,
                up.solved_at
            FROM user_progress up
            JOIN secrets s ON up.challenge_id = s.id
            WHERE up.user_id = ?
            ORDER BY up.solved_at DESC
            LIMIT 5
        `).all(req.user.id);
        
        // Calculate level and badges
        const points = userStats.loyalty_points || 0;
        let level = 1;
        let badge = 'Beginner';
        
        if (points >= 1000) {
            level = 5;
            badge = 'Master Hacker';
        } else if (points >= 500) {
            level = 4;
            badge = 'Expert';
        } else if (points >= 250) {
            level = 3;
            badge = 'Advanced';
        } else if (points >= 100) {
            level = 2;
            badge = 'Intermediate';
        }
        
        res.render('gamification', {
            user: req.user,
            stats: userStats,
            recentSolves: recentSolves,
            level: level,
            badge: badge,
            title: 'Achievements'
        });
    } catch (error) {
        console.error('Gamification error:', error);
        res.status(500).render('500', {
            user: req.user,
            error: error.message,
            title: 'Error'
        });
    }
});

/**
 * POST /gamification/redeem
 * Redeem loyalty points for discounts
 */
router.post('/redeem', (req, res) => {
    if (!req.user) {
        return res.json({
            success: false,
            message: 'Please login first'
        });
    }
    
    const { points } = req.body;
    const pointsToRedeem = parseInt(points);
    
    if (!pointsToRedeem || pointsToRedeem <= 0) {
        return res.json({
            success: false,
            message: 'Invalid points amount'
        });
    }
    
    try {
        // Get current points
        const user = db.prepare('SELECT loyalty_points FROM users WHERE id = ?').get(req.user.id);
        
        if (user.loyalty_points < pointsToRedeem) {
            return res.json({
                success: false,
                message: 'Insufficient loyalty points'
            });
        }
        
        // Redeem points (1 point = $0.01 discount)
        const discount = pointsToRedeem * 0.01;
        const newPoints = user.loyalty_points - pointsToRedeem;
        
        db.prepare('UPDATE users SET loyalty_points = ? WHERE id = ?')
          .run(newPoints, req.user.id);
        
        res.json({
            success: true,
            message: `Redeemed ${pointsToRedeem} points for $${discount.toFixed(2)} discount`,
            discount: discount,
            remainingPoints: newPoints
        });
    } catch (error) {
        console.error('Redeem error:', error);
        res.json({
            success: false,
            message: 'Error redeeming points'
        });
    }
});

/**
 * GET /gamification/leaderboard
 * Global leaderboard for all users
 */
router.get('/leaderboard', (req, res) => {
    try {
        const leaderboard = db.prepare(`
            SELECT 
                u.id,
                u.username,
                u.avatar,
                u.loyalty_points,
                COUNT(up.challenge_id) as challenges_solved,
                SUM(s.points) as total_ctf_points
            FROM users u
            LEFT JOIN user_progress up ON u.id = up.user_id
            LEFT JOIN secrets s ON up.challenge_id = s.id
            GROUP BY u.id
            ORDER BY total_ctf_points DESC, challenges_solved DESC, u.loyalty_points DESC
            LIMIT 50
        `).all();
        
        res.render('leaderboard', {
            user: req.user,
            leaderboard: leaderboard,
            title: 'Leaderboard'
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).render('500', {
            user: req.user,
            error: error.message,
            title: 'Error'
        });
    }
});

module.exports = router;