const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const serialize = require('node-serialize'); // Vulnerable library
const app = express();

// --- Configuration ---
const PORT = process.env.PORT || 3000;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware ---
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
    secret: 'supersecretkey', // Weak session secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Vulnerable: Not HttpOnly or Secure by default
}));

// --- VULNERABILITY: Insecure Deserialization ---
// This middleware checks for a 'user_prefs' cookie and deserializes it.
// Attackers can craft a specific NodeJS object to execute code when unserialized.
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

// --- Routes ---
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/product');
const userRoutes = require('./routes/user');
const apiRoutes = require('./routes/api');

// NEW ROUTES - Backend API
const productsApiRoutes = require('./routes/products'); // Enhanced product API
const cartRoutes = require('./routes/cart');             // Shopping cart
const checkoutRoutes = require('./routes/checkout');     // Checkout process
const supportRoutes = require('./routes/support');       // Support tickets
const uploadRoutes = require('./routes/upload');         // File upload
const adminRoutes = require('./routes/admin');           // Admin panel

// NEW ROUTES - Frontend Pages
const frontendRoutes = require('./routes/frontend');     // Cart, Checkout, Support UI pages

// --- Mount Routes ---
// Main application routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/products', productRoutes);  // Frontend product routes
app.use('/user', userRoutes);
app.use('/api', apiRoutes);

// API routes
app.use('/api/products', productsApiRoutes);  // Enhanced product API with vulnerabilities
app.use('/api/cart', cartRoutes);             // Cart operations
app.use('/api/checkout', checkoutRoutes);     // Checkout and orders
app.use('/api/support', supportRoutes);       // Support ticket system
app.use('/api/upload', uploadRoutes);         // File upload endpoints
app.use('/api/admin', adminRoutes);           // Admin panel endpoints

// Frontend UI routes (cart page, checkout page, support page, etc.)
app.use('/', frontendRoutes);

// --- Health Check Endpoint ---
app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        vulnerabilities: 'MANY - This is intentional!'
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
        pid: process.pid
    });
});

// --- Error Handling ---
app.use((req, res) => {
    res.status(404).render('partials/header', { user: req.session.user, title: '404' });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`\n============================================================`);
    console.log(`   VulnNode-CTF v2.0 - Intentionally Vulnerable E-Commerce`);
    console.log(`============================================================`);
    console.log(`[!] WARNING: This application contains CRITICAL vulnerabilities`);
    console.log(`[!] - SQL Injection`);
    console.log(`[!] - XSS (Stored & Reflected)`);
    console.log(`[!] - IDOR`);
    console.log(`[!] - Command Injection`);
    console.log(`[!] - File Upload`);
    console.log(`[!] - SSRF`);
    console.log(`[!] - LFI`);
    console.log(`[!] - Insecure Deserialization`);
    console.log(`[!] - Authentication Bypass`);
    console.log(`[!] - Business Logic Flaws`);
    console.log(`[!] - And many more...`);
    console.log(``);
    console.log(`[+] Server Status: RUNNING`);
    console.log(`[+] Port: ${PORT}`);
    console.log(`[+] URL: http://localhost:${PORT}`);
    console.log(`[+] API Base: http://localhost:${PORT}/api`);
    console.log(``);
    console.log(`[*] Default Credentials:`);
    console.log(`    Admin: admin / admin123`);
    console.log(`    User:  alice / alice123`);
    console.log(``);
    console.log(`[*] Quick Links:`);
    console.log(`    Products: http://localhost:${PORT}/`);
    console.log(`    Login: http://localhost:${PORT}/auth/login`);
    console.log(`    Cart: http://localhost:${PORT}/cart`);
    console.log(`    Support: http://localhost:${PORT}/support`);
    console.log(`    Admin: http://localhost:${PORT}/admin`);
    console.log(``);
    console.log(`[*] Do NOT deploy in production!`);
    console.log(`[*] For educational purposes only.`);
    console.log(`============================================================\n`);
});