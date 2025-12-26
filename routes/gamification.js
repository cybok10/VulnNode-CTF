const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const secrets = require('../config/secrets');

const db = new sqlite3.Database(secrets.DB_PATH);

// Middleware to ensure session difficulty is set
router.use((req, res, next) => {
    if (!req.session.difficulty) {
        req.session.difficulty = 1; // Default to Beginner
    }
    next();
});

/**
 * GET /scoreboard
 * Renders the Challenge Map and Progress
 */
router.get('/', (req, res) => {
    // Fetch all challenges
    db.all("SELECT * FROM challenges ORDER BY difficulty ASC", [], (err, challenges) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database Error - Could not load challenges.");
        }
        
        // Calculate progress statistics
        const total = challenges.length;
        const solved = challenges.filter(c => c.solved === 1).length;
        const percent = total === 0 ? 0 : Math.round((solved / total) * 100);

        // Render the scoreboard view
        res.render('scoreboard', { 
            challenges: challenges, 
            user: req.session.user,
            percent: percent,
            difficulty: req.session.difficulty
        });
    });
});

/**
 * POST /scoreboard/submit
 * Endpoint for submitting CTF flags
 */
router.post('/submit', (req, res) => {
    const { flag } = req.body;

    if (!flag) return res.json({ success: false, message: "No flag provided." });

    // 1. Check if flag exists in database
    db.get("SELECT * FROM challenges WHERE flag = ?", [flag.trim()], (err, challenge) => {
        if (err) return res.status(500).json({ success: false, message: "Database Error" });
        
        if (!challenge) {
            return res.json({ success: false, message: "❌ Incorrect Flag. Try harder!" });
        }

        if (challenge.solved === 1) {
            return res.json({ success: true, message: `⚠️ You already solved: ${challenge.name}` });
        }

        // 2. Mark challenge as solved
        db.run("UPDATE challenges SET solved = 1 WHERE id = ?", [challenge.id], (err) => {
            if (err) return res.status(500).json({ success: false, message: "Update Error" });
            
            console.log(`[+] Challenge Solved: ${challenge.name}`);
            return res.json({ 
                success: true, 
                message: `🎉 Correct! You solved: ${challenge.name}`,
                challengeId: challenge.id
            });
        });
    });
});

/**
 * POST /api/difficulty
 * Updates the security level of the lab
 */
router.post('/api/difficulty', (req, res) => {
    const { level } = req.body;
    
    // Validate level input
    const newLevel = parseInt(level);
    if (![1, 2, 3].includes(newLevel)) {
        return res.status(400).json({ success: false, message: "Invalid difficulty level" });
    }

    req.session.difficulty = newLevel;
    
    let levelName = "Beginner";
    if (newLevel === 2) levelName = "Intermediate";
    if (newLevel === 3) levelName = "Advanced";

    console.log(`[!] Security Level Changed to: ${levelName} (Level ${newLevel})`);

    res.json({ 
        success: true, 
        level: newLevel,
        message: `Security level updated to ${levelName}` 
    });
});

module.exports = router;