// Authentication Middleware with Intentional Vulnerabilities

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/vuln_app.db');

// VULNERABILITY: Weak authentication check
function isAuthenticated(req, res, next) {
    // Check session
    if (req.session && req.session.user) {
        // FIX: Set req.user for consistent access
        req.user = req.session.user;
        return next();
    }
    
    // VULNERABILITY: Check for auth cookie (easily forgeable)
    if (req.cookies.auth_token) {
        // Insecure: trusting client-side cookie without verification
        const userData = Buffer.from(req.cookies.auth_token, 'base64').toString();
        try {
            const user = JSON.parse(userData);
            req.session.user = user;
            req.user = user; // FIX: Set req.user
            return next();
        } catch (e) {
            // Fail silently
        }
    }
    
    // VULNERABILITY: Check for API key in headers (but accept any format)
    if (req.headers['x-api-key']) {
        db.get('SELECT * FROM users WHERE api_key = ?', [req.headers['x-api-key']], (err, user) => {
            if (user) {
                req.session.user = user;
                req.user = user; // FIX: Set req.user
                return next();
            }
            return res.status(401).json({ error: 'Unauthorized' });
        });
        return;
    }
    
    res.status(401).json({ error: 'Authentication required' });
}

// VULNERABILITY: Weak admin check - only checks isAdmin flag
function isAdmin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // FIX: Set req.user
    req.user = req.session.user;
    
    // VULNERABILITY: Only checking a boolean that can be manipulated
    if (req.session.user.isAdmin === 1 || req.session.user.isAdmin === '1' || req.session.user.isAdmin === true) {
        return next();
    }
    
    // VULNERABILITY: Also accept if username is 'admin' (easily bypassable)
    if (req.session.user.username === 'admin') {
        return next();
    }
    
    res.status(403).json({ error: 'Admin access required' });
}

// VULNERABILITY: Vendor check with similar flaws
function isVendor(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // FIX: Set req.user
    req.user = req.session.user;
    
    if (req.session.user.isVendor === 1 || req.session.user.isVendor === true) {
        return next();
    }
    
    res.status(403).json({ error: 'Vendor access required' });
}

// VULNERABILITY: Optional authentication - accepts request even if not authenticated
function optionalAuth(req, res, next) {
    if (req.session && req.session.user) {
        // User is authenticated
        req.user = req.session.user; // FIX: Set req.user
        return next();
    }
    
    // VULNERABILITY: Check cookie without proper validation
    if (req.cookies.user_id) {
        // Insecure: fetch user by ID from cookie
        db.get('SELECT * FROM users WHERE id = ?', [req.cookies.user_id], (err, user) => {
            if (user) {
                req.session.user = user;
                req.user = user; // FIX: Set req.user
            }
            return next();
        });
        return;
    }
    
    // Continue without authentication
    next();
}

// VULNERABILITY: Rate limiting that can be easily bypassed
const rateLimitStore = {};

function rateLimit(maxRequests = 100, windowMs = 60000) {
    return (req, res, next) => {
        // VULNERABILITY: Using IP which can be spoofed via X-Forwarded-For
        const identifier = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
        
        const now = Date.now();
        
        if (!rateLimitStore[identifier]) {
            rateLimitStore[identifier] = {
                count: 1,
                resetTime: now + windowMs
            };
            return next();
        }
        
        if (now > rateLimitStore[identifier].resetTime) {
            rateLimitStore[identifier] = {
                count: 1,
                resetTime: now + windowMs
            };
            return next();
        }
        
        rateLimitStore[identifier].count++;
        
        // VULNERABILITY: Easy to bypass, no permanent blocking
        if (rateLimitStore[identifier].count > maxRequests) {
            return res.status(429).json({ 
                error: 'Too many requests',
                message: 'Please try again later',
                // VULNERABILITY: Exposing internal details
                resetTime: rateLimitStore[identifier].resetTime,
                currentCount: rateLimitStore[identifier].count
            });
        }
        
        next();
    };
}

// VULNERABILITY: CSRF protection that can be bypassed
function csrfProtection(req, res, next) {
    // Only check for state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const token = req.body.csrf_token || req.headers['x-csrf-token'];
        const sessionToken = req.session.csrfToken;
        
        // VULNERABILITY: Weak token generation and validation
        if (!token || !sessionToken) {
            // VULNERABILITY: Accept requests from same origin without token
            if (req.headers.referer && req.headers.referer.includes(req.headers.host)) {
                return next();
            }
            return res.status(403).json({ error: 'CSRF token missing' });
        }
        
        // VULNERABILITY: Simple string comparison (no timing-safe comparison)
        if (token === sessionToken) {
            return next();
        }
        
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    
    next();
}

// Generate CSRF token (weak)
function generateCSRFToken(req, res, next) {
    // VULNERABILITY: Predictable token generation
    if (!req.session.csrfToken) {
        req.session.csrfToken = Buffer.from(Date.now().toString()).toString('base64');
    }
    res.locals.csrfToken = req.session.csrfToken;
    next();
}

// VULNERABILITY: Session validation with flaws
function validateSession(req, res, next) {
    if (req.session && req.session.user) {
        // VULNERABILITY: No session expiry check
        // VULNERABILITY: No session rotation
        // VULNERABILITY: No concurrent session check
        
        // Check if user still exists (at least doing something)
        db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], (err, user) => {
            if (err || !user) {
                req.session.destroy();
                return res.status(401).json({ error: 'Session invalid' });
            }
            
            // VULNERABILITY: Updating session with fresh data (could be manipulated)
            req.session.user = user;
            req.user = user; // FIX: Set req.user
            next();
        });
        return;
    }
    
    next();
}

module.exports = {
    isAuthenticated,
    isAdmin,
    isVendor,
    optionalAuth,
    rateLimit,
    csrfProtection,
    generateCSRFToken,
    validateSession
};