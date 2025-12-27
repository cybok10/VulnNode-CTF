const db = require('../config/database');
const crypto = require('crypto');

// VULNERABILITY: Weak MD5 password comparison
function md5(password) {
    return crypto.createHash('md5').update(password).digest('hex');
}

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    
    // VULNERABILITY: Leaks information about authentication state
    res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
        loginUrl: '/auth/login',
        requestedUrl: req.originalUrl,
        sessionId: req.sessionID // Vulnerability: Session ID exposure
    });
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // VULNERABILITY: Weak admin check - can be bypassed by modifying session
    if (req.session.user.isAdmin === 1 || req.session.user.isAdmin === '1' || req.session.user.isAdmin === true) {
        return next();
    }
    
    // VULNERABILITY: Information disclosure in error message
    res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required',
        currentRole: req.session.user.isAdmin ? 'admin' : 'user',
        userId: req.session.user.id,
        requiredPermission: 'admin'
    });
};

// Vendor authorization middleware
const requireVendor = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // VULNERABILITY: Can be bypassed by setting isVendor in session
    if (req.session.user.isVendor === 1 || req.session.user.isAdmin === 1) {
        return next();
    }
    
    res.status(403).json({ error: 'Vendor access required' });
};

// Optional authentication (doesn't block, just populates user)
const optionalAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        req.user = req.session.user;
    }
    next();
};

// VULNERABILITY: Weak API key validation
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key || req.body.api_key;
    
    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }
    
    // VULNERABILITY: SQL injection in API key lookup
    const query = `SELECT * FROM users WHERE api_key = '${apiKey}'`;
    
    db.get(query, (err, user) => {
        if (err) {
            // VULNERABILITY: Exposes SQL error
            return res.status(500).json({ 
                error: 'Database error', 
                details: err.message,
                query: query 
            });
        }
        
        if (!user) {
            return res.status(401).json({ 
                error: 'Invalid API key',
                providedKey: apiKey // VULNERABILITY: Echoes back the key
            });
        }
        
        req.apiUser = user;
        next();
    });
};

// VULNERABILITY: Timing attack vulnerable password check
const checkPassword = (storedHash, providedPassword) => {
    const providedHash = md5(providedPassword);
    
    // VULNERABILITY: String comparison vulnerable to timing attacks
    // Should use crypto.timingSafeEqual
    return storedHash === providedHash;
};

// VULNERABILITY: Session fixation - doesn't regenerate session on login
const createSession = (req, user) => {
    // Should call req.session.regenerate() but doesn't
    req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        isVendor: user.isVendor,
        avatar: user.avatar,
        balance: user.balance,
        loyalty_points: user.loyalty_points
    };
    
    // VULNERABILITY: Stores sensitive data in session
    req.session.apiKey = user.api_key;
    
    return req.session;
};

// VULNERABILITY: No brute force protection
const loginAttemptTracker = {};

const checkLoginAttempts = (username) => {
    // Intentionally broken - doesn't actually limit attempts
    if (!loginAttemptTracker[username]) {
        loginAttemptTracker[username] = { attempts: 0, lastAttempt: Date.now() };
    }
    
    const tracker = loginAttemptTracker[username];
    tracker.attempts++;
    tracker.lastAttempt = Date.now();
    
    // VULNERABILITY: Never actually blocks, just logs
    if (tracker.attempts > 100) {
        console.log(`Warning: ${username} has ${tracker.attempts} failed login attempts`);
    }
    
    return true; // Always allows attempt
};

const resetLoginAttempts = (username) => {
    delete loginAttemptTracker[username];
};

module.exports = {
    requireAuth,
    requireAdmin,
    requireVendor,
    optionalAuth,
    validateApiKey,
    checkPassword,
    createSession,
    checkLoginAttempts,
    resetLoginAttempts,
    md5
};