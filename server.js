const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const secrets = require('./config/secrets');

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// MIDDLEWARE (Insecure Configuration)
// ==============================

// VULNERABILITY: CORS allowed for all origins
app.use(cors());

// Parsing bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// VULNERABILITY: Session cookies not HTTPOnly or Secure
app.use(session({
    secret: secrets.JWT_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: false } // Allows XSS to steal cookies
}));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// ==============================
// ROUTES (To be implemented)
// ==============================

// We will generate these files in the next steps.
// Uncomment them as we create them to avoid startup errors.

// const indexRoutes = require('./routes/index');
// const authRoutes = require('./routes/auth');
// const userRoutes = require('./routes/user');
// const productRoutes = require('./routes/product');
// const adminRoutes = require('./routes/admin');
// const apiRoutes = require('./routes/api');

// app.use('/', indexRoutes);
// app.use('/auth', authRoutes);
// app.use('/user', userRoutes);
// app.use('/product', productRoutes);
// app.use('/admin', adminRoutes);
// app.use('/api', apiRoutes);
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const productRoutes = require('./routes/product');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/product', productRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// Placeholder Route until others are ready
app.get('/', (req, res) => {
    res.send('<h1>VulnNode CTF is starting...</h1><p>Routes not yet loaded. Please continue generating files.</p>');
});

// ==============================
// ERROR HANDLING (Info Leakage)
// ==============================

// VULNERABILITY: Verbose error messages (Stack Traces exposed)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send(`
        <h1>500 Internal Server Error</h1>
        <pre>${err.stack}</pre>
        <!-- FLAG{verbose_error_handling_leaks_info} -->
    `);
});

app.listen(PORT, () => {
    console.log(`[+] VulnNode CTF Lab running on http://localhost:${PORT}`);
    console.log(`[!] WARNING: This application is intentionally vulnerable. Do not deploy in production.`);
});

module.exports = app;
