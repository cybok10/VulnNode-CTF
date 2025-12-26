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
// const adminRoutes = require('./routes/admin'); // To be added next

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/user', userRoutes);
app.use('/api', apiRoutes);
// app.use('/admin', adminRoutes);

// --- Error Handling ---
app.use((req, res) => {
    res.status(404).render('partials/header', { user: req.session.user, title: '404' });
});

app.listen(PORT, () => {
    console.log(`\n[+] VulnNode Shop running at http://localhost:${PORT}`);
    console.log(`[!] WARNING: This application contains critical vulnerabilities.`);
    console.log(`[!] Do not deploy in a production environment.\n`);
});