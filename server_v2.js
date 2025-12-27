const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const serialize = require('node-serialize'); // Vulnerable library
const fileUpload = require('express-fileupload');
const morgan = require('morgan');
const fs = require('fs');

const app = express();

// --- Configuration ---
const PORT = process.env.PORT || 3000;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Banner ---
console.log('\n' + '='.repeat(60));
console.log('   VulnNode-CTF v2.0 - Intentionally Vulnerable E-Commerce');
console.log('='.repeat(60));
console.log('[!] WARNING: This application contains CRITICAL vulnerabilities');
console.log('[!] DO NOT deploy in production environment');
console.log('[!] For educational and ethical hacking purposes ONLY');
console.log('='.repeat(60) + '\n');

// --- Middleware ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// VULNERABILITY: Insecure session configuration
app.use(session({
    secret: 'supersecretkey123', // Weak and predictable session secret
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,      // Should be true in production
        httpOnly: false,    // Vulnerable to XSS cookie theft
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// VULNERABILITY: File upload without proper restrictions
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB - too permissive
    abortOnLimit: false,
    useTempFiles: true,
    tempFileDir: '/tmp/',
    safeFileNames: false, // Vulnerable to path traversal
    preserveExtension: true
}));

// Logging middleware - verbose errors (vulnerability)
app.use(morgan('combined'));

// VULNERABILITY: Insecure Deserialization
// This middleware checks for a 'user_prefs' cookie and deserializes it
// Attackers can craft malicious objects to achieve RCE
app.use((req, res, next) => {
    if (req.cookies.user_prefs) {
        try {
            const str = Buffer.from(req.cookies.user_prefs, 'base64').toString();
            // UNSAFE: unserialize() executes functions found in the object
            const obj = serialize.unserialize(str);
            req.userPrefs = obj;
        } catch (e) {
            console.log("[!] Deserialization Error:", e.message);
        }
    }
    next();
});

// Make session user available to all templates
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.cartCount = req.session.cart ? req.session.cart.length : 0;
    next();
});

// VULNERABILITY: CORS misconfiguration (if enabled)
// app.use(cors({ origin: '*', credentials: true })); // Commented but present in code

// --- Routes ---
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/product');
const userRoutes = require('./routes/user');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const orderRoutes = require('./routes/order');
// New routes for v2.0
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');
const supportRoutes = require('./routes/support');
const vendorRoutes = require('./routes/vendor');
const ctfRoutes = require('./routes/ctf');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/user', userRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/orders', orderRoutes);
app.use('/cart', cartRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/support', supportRoutes);
app.use('/vendor', vendorRoutes);
app.use('/ctf', ctfRoutes);

// VULNERABILITY: Directory listing enabled
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { 
    dotfiles: 'allow' // Allows access to hidden files
}));

// VULNERABILITY: Exposed backup files and git directory
app.use('/.git', express.static(path.join(__dirname, '.git')));

// VULNERABILITY: Exposed logs directory
app.use('/logs', (req, res, next) => {
    // Should require authentication but doesn't
    express.static(path.join(__dirname, 'logs'))(req, res, next);
});

// --- Health Check Endpoint (with vulnerability) ---
app.get('/health', (req, res) => {
    // VULNERABILITY: Information disclosure
    res.json({
        status: 'online',
        version: '2.0.0',
        node_version: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        env: process.env.NODE_ENV || 'development',
        database: 'SQLite3',
        // Exposing sensitive paths
        paths: {
            root: __dirname,
            database: path.join(__dirname, 'database/vuln_app.db'),
            uploads: path.join(__dirname, 'uploads'),
            logs: path.join(__dirname, 'logs')
        }
    });
});

// VULNERABILITY: phpinfo-style endpoint exposing system information
app.get('/serverinfo', (req, res) => {
    const info = {
        system: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            hostname: require('os').hostname(),
            cpus: require('os').cpus().length,
            totalMemory: require('os').totalmem(),
            freeMemory: require('os').freemem()
        },
        application: {
            name: 'VulnNode-CTF',
            version: '2.0.0',
            environment: process.env.NODE_ENV || 'development',
            port: PORT
        },
        paths: {
            cwd: process.cwd(),
            execPath: process.execPath,
            mainModule: require.main.filename
        },
        environment: process.env // CRITICAL: Exposes all environment variables
    };
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Server Information</title></head>
        <body>
            <h1>Server Information</h1>
            <pre>${JSON.stringify(info, null, 2)}</pre>
        </body>
        </html>
    `);
});

// VULNERABILITY: robots.txt reveals sensitive paths
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *\nDisallow: /admin\nDisallow: /api\nDisallow: /backup\nDisallow: /.git\nDisallow: /config\nDisallow: /logs\nDisallow: /uploads/private\n`);
});

// --- Error Handling ---
// VULNERABILITY: Verbose error messages with stack traces
app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    
    // Exposing full error details to client
    res.status(err.status || 500);
    res.json({
        error: {
            message: err.message,
            stack: err.stack, // CRITICAL: Stack trace exposure
            type: err.constructor.name,
            details: err,
            timestamp: new Date().toISOString(),
            url: req.url,
            method: req.method,
            headers: req.headers,
            body: req.body,
            query: req.query,
            params: req.params
        }
    });
});

// 404 Handler
app.use((req, res) => {
    // VULNERABILITY: Reflects user input without sanitization
    res.status(404);
    if (req.accepts('html')) {
        res.send(`
            <html>
            <head><title>404 - Page Not Found</title></head>
            <body>
                <h1>404 - Page Not Found</h1>
                <p>The requested URL <strong>${req.url}</strong> was not found on this server.</p>
                <p>Method: ${req.method}</p>
                <p>IP: ${req.ip}</p>
                <p>User-Agent: ${req.get('User-Agent')}</p>
                <hr>
                <small>VulnNode-CTF v2.0 | Node.js ${process.version}</small>
            </body>
            </html>
        `);
    } else if (req.accepts('json')) {
        res.json({ error: 'Not found', url: req.url });
    } else {
        res.type('txt').send('Not found');
    }
});

// --- Start Server ---
const server = app.listen(PORT, () => {
    console.log(`\n[+] Server Status: RUNNING`);
    console.log(`[+] Port: ${PORT}`);
    console.log(`[+] URL: http://localhost:${PORT}`);
    console.log(`[+] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\n[*] Available Endpoints:`);
    console.log(`    - Homepage: http://localhost:${PORT}/`);
    console.log(`    - Products: http://localhost:${PORT}/products`);
    console.log(`    - Login: http://localhost:${PORT}/auth/login`);
    console.log(`    - Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`    - API: http://localhost:${PORT}/api`);
    console.log(`    - Support: http://localhost:${PORT}/support`);
    console.log(`    - CTF Challenges: http://localhost:${PORT}/ctf`);
    console.log(`\n[*] Default Credentials:`);
    console.log(`    Admin: admin / admin123`);
    console.log(`    Users: alice/alice123, bob/bob123, charlie/charlie123`);
    console.log(`\n[!] Remember: This is a VULNERABLE application!`);
    console.log(`[!] Happy Hacking! 🚩\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n[*] SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('[*] Server closed.');
        process.exit(0);
    });
});

module.exports = app;