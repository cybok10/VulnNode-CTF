const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const app = express();

// --- Configuration ---
const PORT = process.env.PORT || 3000;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Ensure Required Directories Exist ---
const dirs = ['uploads', 'logs', 'backups', 'uploads/products', 'uploads/tickets'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`[+] Created directory: ${dir}`);
    }
});

// --- Middleware ---
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(session({
    secret: 'supersecretkey', // VULNERABILITY: Weak session secret
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // VULNERABILITY: Not secure
        httpOnly: false, // VULNERABILITY: Can be accessed by JavaScript
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// --- VULNERABILITY: Insecure Deserialization ---
// This middleware checks for a 'user_prefs' cookie and deserializes it.
// Attackers can craft a specific NodeJS object to execute code when unserialized.
try {
    const serialize = require('node-serialize');
    app.use((req, res, next) => {
        if (req.cookies.user_prefs) {
            try {
                const str = Buffer.from(req.cookies.user_prefs, 'base64').toString();
                // UNSAFE: unserialize() executes functions found in the object
                const obj = serialize.unserialize(str);
                req.userPrefs = obj;
            } catch (e) {
                // Silently fail or log
                console.log("Deserialization Error:", e.message);
            }
        }
        next();
    });
} catch (e) {
    console.log('[!] node-serialize not installed - deserialization vulnerability disabled');
    app.use((req, res, next) => next());
}

// --- Load Routes ---
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/product');
const userRoutes = require('./routes/user');
const apiRoutes = require('./routes/api');
const productsApiRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');
const supportRoutes = require('./routes/support');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const orderRoutes = require('./routes/order');
const scoreboardRoutes = require('./routes/scoreboard');
const gamificationRoutes = require('./routes/gamification');

// --- Mount Routes ---
// Main application routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/product', productRoutes);  // Single product routes (/product/:id)
app.use('/products', productsApiRoutes);  // Product listing
app.use('/user', userRoutes);

// CTF & Gamification
app.use('/scoreboard', scoreboardRoutes);
app.use('/gamification', gamificationRoutes);

// E-commerce
app.use('/cart', cartRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/orders', orderRoutes);
app.use('/support', supportRoutes);

// Admin panel
app.use('/admin', adminRoutes);

// API routes
app.use('/api', apiRoutes);
app.use('/api/products', productsApiRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);

// --- Health Check Endpoint ---
app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        vulnerabilities: 'MANY - This is intentional!',
        ctf_challenges: 10,
        node_version: process.version
    });
});

// --- Server Info (Information Disclosure) ---
app.get('/serverinfo', (req, res) => {
    // VULNERABILITY: Exposing sensitive server information
    res.json({
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        env: process.env,  // CRITICAL: Exposing all environment variables
        cwd: process.cwd(),
        pid: process.pid,
        flag: 'FLAG{s3rv3r_1nf0_d1scl0sur3}'
    });
});

// --- Error Handling ---
// 404 Handler
app.use((req, res) => {
    const isAPI = req.path.startsWith('/api/');
    
    if (isAPI) {
        return res.status(404).json({
            success: false,
            error: 'Endpoint not found',
            path: req.path
        });
    }
    
    res.status(404).render('404', { 
        user: req.session ? req.session.user : null, 
        title: 'Page Not Found',
        path: req.path
    });
});

// 500 Error Handler - With intentional information disclosure
app.use((err, req, res, next) => {
    console.error('Error caught:', err);
    
    const isAPI = req.path.startsWith('/api/');
    
    if (isAPI) {
        // VULNERABILITY: Exposing full error details in API
        return res.status(500).json({
            success: false,
            error: err.message,
            stack: err.stack,
            code: err.code,
            sql: err.sql || null
        });
    }
    
    // VULNERABILITY: Exposing full error details including stack traces
    res.status(500).render('500', {
        user: req.session ? req.session.user : null,
        title: 'Internal Server Error',
        error: {
            message: err.message,
            stack: err.stack,
            code: err.code,
            sql: err.sql || null
        }
    });
});

// --- Start Server ---
const server = app.listen(PORT, () => {
    console.log(`\n============================================================`);
    console.log(`   🛡️  VulnNode-CTF v3.0 - Intentionally Vulnerable App`);
    console.log(`============================================================`);
    console.log(`[!] ⚠️  WARNING: CONTAINS CRITICAL VULNERABILITIES`);
    console.log(``);
    console.log(`[*] Vulnerability Categories:`);
    console.log(`    💉 SQL Injection (Multiple endpoints)`);
    console.log(`    🔓 XSS (Stored & Reflected)`);
    console.log(`    🔑 IDOR (User data access)`);
    console.log(`    💻 Command Injection (Admin panel)`);
    console.log(`    📁 Unrestricted File Upload`);
    console.log(`    🌐 SSRF & LFI`);
    console.log(`    🔐 Authentication Bypass`);
    console.log(`    💰 Business Logic Flaws`);
    console.log(`    🎭 Insecure Deserialization`);
    console.log(`    ⚙️  Mass Assignment`);
    console.log(``);
    console.log(`[+] Server Status: RUNNING ✅`);
    console.log(`[+] Port: ${PORT}`);
    console.log(`[+] URL: http://localhost:${PORT}`);
    console.log(``);
    console.log(`[*] 🔑 Default Credentials:`);
    console.log(`    👑 Admin: admin / admin123`);
    console.log(`    👤 User:  user / user123`);
    console.log(`    👤 Alice: alice / alice123`);
    console.log(`    👤 Bob:   bob / bob123`);
    console.log(``);
    console.log(`[*] 🎯 Quick Links:`);
    console.log(`    🏠 Home:       http://localhost:${PORT}/`);
    console.log(`    🏆 Scoreboard: http://localhost:${PORT}/scoreboard`);
    console.log(`    🔐 Login:      http://localhost:${PORT}/auth/login`);
    console.log(`    🛒 Cart:       http://localhost:${PORT}/cart`);
    console.log(`    💬 Support:    http://localhost:${PORT}/support`);
    console.log(`    👑 Admin:      http://localhost:${PORT}/admin`);
    console.log(``);
    console.log(`[🎯] CTF Challenges: 10 challenges`);
    console.log(`[💾] Database: 15+ tables with sample data`);
    console.log(`[🐛] Intentional Bugs: 20+ major vulnerabilities`);
    console.log(`[🚀] Framework: Express.js + SQLite3`);
    console.log(``);
    console.log(`[*] ⚠️  DO NOT DEPLOY IN PRODUCTION!`);
    console.log(`[*] 📚 For educational purposes only.`);
    console.log(`============================================================\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n[!] SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('[+] Server closed.');
        process.exit(0);
    });
});

module.exports = app;
