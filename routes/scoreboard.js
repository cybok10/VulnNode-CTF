const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { optionalAuth, isAuthenticated } = require('../middleware/auth');

// ============================================================
// CTF SCOREBOARD & CHALLENGES
// ============================================================

// --- GET SCOREBOARD ---
router.get('/', optionalAuth, (req, res) => {
    try {
        // Get all challenges
        const challenges = db.prepare(`
            SELECT id, name, category, difficulty, description, points, hint
            FROM secrets
            ORDER BY difficulty ASC, points ASC
        `).all();

        // Get user progress if logged in
        let userProgress = [];
        let userPoints = 0;
        if (req.user) {
            userProgress = db.prepare(`
                SELECT challenge_id
                FROM user_progress
                WHERE user_id = ?
            `).all(req.user.id).map(p => p.challenge_id);

            // Calculate total points
            if (userProgress.length > 0) {
                const pointsResult = db.prepare(`
                    SELECT SUM(s.points) as total
                    FROM user_progress up
                    JOIN secrets s ON up.challenge_id = s.id
                    WHERE up.user_id = ?
                `).get(req.user.id);
                userPoints = pointsResult ? pointsResult.total || 0 : 0;
            }
        }

        // Get leaderboard (top 10)
        const leaderboard = db.prepare(`
            SELECT 
                u.id,
                u.username,
                u.avatar,
                COUNT(up.challenge_id) as solved_count,
                COALESCE(SUM(s.points), 0) as total_points
            FROM users u
            LEFT JOIN user_progress up ON u.id = up.user_id
            LEFT JOIN secrets s ON up.challenge_id = s.id
            GROUP BY u.id
            HAVING solved_count > 0
            ORDER BY total_points DESC, solved_count DESC
            LIMIT 10
        `).all();

        res.render('scoreboard', {
            user: req.user,
            challenges,
            userProgress,
            userPoints,
            leaderboard,
            title: 'CTF Scoreboard'
        });
    } catch (error) {
        console.error('Scoreboard error:', error);
        res.status(500).render('500', {
            user: req.user,
            error: error.message,
            title: 'Error'
        });
    }
});

// --- GET SCOREBOARD API ---
router.get('/api', optionalAuth, (req, res) => {
    try {
        // Get all challenges (without flags)
        const challenges = db.prepare(`
            SELECT id, name, category, difficulty, description, points, hint
            FROM secrets
            ORDER BY difficulty ASC, points ASC
        `).all();

        // Get leaderboard
        const leaderboard = db.prepare(`
            SELECT 
                u.id,
                u.username,
                u.avatar,
                COUNT(up.challenge_id) as solved_count,
                COALESCE(SUM(s.points), 0) as total_points
            FROM users u
            LEFT JOIN user_progress up ON u.id = up.user_id
            LEFT JOIN secrets s ON up.challenge_id = s.id
            GROUP BY u.id
            HAVING solved_count > 0
            ORDER BY total_points DESC, solved_count DESC
            LIMIT 20
        `).all();

        res.json({
            success: true,
            challenges,
            leaderboard,
            totalChallenges: challenges.length
        });
    } catch (error) {
        console.error('Scoreboard API error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// --- SUBMIT FLAG ---
router.post('/submit', isAuthenticated, (req, res) => {
    try {
        const { flag } = req.body;

        if (!flag) {
            return res.json({
                success: false,
                message: 'Please enter a flag'
            });
        }

        // Check if flag is correct
        const challenge = db.prepare(`
            SELECT id, name, points
            FROM secrets
            WHERE flag = ?
        `).get(flag.trim());

        if (!challenge) {
            return res.json({
                success: false,
                message: '❌ Invalid flag. Try again!',
                attempts: true
            });
        }

        // Check if user already solved this challenge
        const alreadySolved = db.prepare(`
            SELECT id
            FROM user_progress
            WHERE user_id = ? AND challenge_id = ?
        `).get(req.user.id, challenge.id);

        if (alreadySolved) {
            return res.json({
                success: false,
                message: '⚠️ You already solved this challenge!',
                duplicate: true
            });
        }

        // Record the solve
        db.prepare(`
            INSERT INTO user_progress (user_id, challenge_id)
            VALUES (?, ?)
        `).run(req.user.id, challenge.id);

        // Update user loyalty points
        db.prepare(`
            UPDATE users
            SET loyalty_points = loyalty_points + ?
            WHERE id = ?
        `).run(challenge.points, req.user.id);

        res.json({
            success: true,
            message: `🎉 Congratulations! You solved "${challenge.name}"`,
            points: challenge.points,
            challengeName: challenge.name,
            challengeId: challenge.id
        });
    } catch (error) {
        console.error('Flag submission error:', error);
        res.json({
            success: false,
            message: 'Error processing flag. Please try again.',
            error: error.message
        });
    }
});

// --- GET HINT ---
router.get('/hint/:id', isAuthenticated, (req, res) => {
    try {
        const challengeId = req.params.id;

        const challenge = db.prepare(`
            SELECT hint
            FROM secrets
            WHERE id = ?
        `).get(challengeId);

        if (!challenge || !challenge.hint) {
            return res.json({
                success: false,
                message: 'No hint available for this challenge'
            });
        }

        res.json({
            success: true,
            hint: challenge.hint
        });
    } catch (error) {
        console.error('Hint error:', error);
        res.json({
            success: false,
            message: 'Error retrieving hint',
            error: error.message
        });
    }
});

// --- GET USER PROGRESS ---
router.get('/progress', isAuthenticated, (req, res) => {
    try {
        const progress = db.prepare(`
            SELECT 
                s.id,
                s.name,
                s.category,
                s.difficulty,
                s.points,
                up.solved_at
            FROM user_progress up
            JOIN secrets s ON up.challenge_id = s.id
            WHERE up.user_id = ?
            ORDER BY up.solved_at DESC
        `).all(req.user.id);

        const totalPoints = db.prepare(`
            SELECT COALESCE(SUM(s.points), 0) as total
            FROM user_progress up
            JOIN secrets s ON up.challenge_id = s.id
            WHERE up.user_id = ?
        `).get(req.user.id);

        // Get total challenges count
        const totalChallenges = db.prepare(
            'SELECT COUNT(*) as count FROM secrets'
        ).get();

        res.json({
            success: true,
            progress,
            totalPoints: totalPoints ? totalPoints.total : 0,
            solvedCount: progress.length,
            totalChallenges: totalChallenges.count,
            completionRate: totalChallenges.count > 0 
                ? ((progress.length / totalChallenges.count) * 100).toFixed(1) 
                : 0
        });
    } catch (error) {
        console.error('Progress error:', error);
        res.json({
            success: false,
            message: 'Error retrieving progress',
            error: error.message
        });
    }
});

// --- GET CHALLENGE DETAILS ---
router.get('/challenge/:id', optionalAuth, (req, res) => {
    try {
        const challengeId = req.params.id;

        const challenge = db.prepare(`
            SELECT id, name, category, difficulty, description, points, hint
            FROM secrets
            WHERE id = ?
        `).get(challengeId);

        if (!challenge) {
            return res.json({
                success: false,
                message: 'Challenge not found'
            });
        }

        // Check if user solved it
        let solved = false;
        if (req.user) {
            const progress = db.prepare(`
                SELECT id FROM user_progress
                WHERE user_id = ? AND challenge_id = ?
            `).get(req.user.id, challengeId);
            solved = !!progress;
        }

        res.json({
            success: true,
            challenge,
            solved
        });
    } catch (error) {
        console.error('Challenge details error:', error);
        res.json({
            success: false,
            message: 'Error retrieving challenge',
            error: error.message
        });
    }
});

module.exports = router;
