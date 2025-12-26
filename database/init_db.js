const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/vuln_app.db');
const bcrypt = require('bcryptjs');

const salt = bcrypt.genSaltSync(10);
const adminHash = bcrypt.hashSync('admin123', salt);
const userHash = bcrypt.hashSync('user123', salt);

db.serialize(() => {
    // 1. Users Table
    db.run(`DROP TABLE IF EXISTS users`);
    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        email TEXT,
        isAdmin INTEGER DEFAULT 0,
        avatar TEXT DEFAULT '/img/avatars/default.png',
        balance REAL DEFAULT 100.00
    )`);

    // Seed Users
    const stmt = db.prepare("INSERT INTO users (username, password, email, isAdmin, balance) VALUES (?, ?, ?, ?, ?)");
    stmt.run("admin", adminHash, "admin@vulnshop.com", 1, 9999.00);
    stmt.run("user", userHash, "user@test.com", 0, 100.00);
    stmt.finalize();

    // 2. Products Table
    db.run(`DROP TABLE IF EXISTS products`);
    db.run(`CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        price REAL,
        image TEXT,
        category TEXT
    )`);

    // Seed Products (Realistic Tech Store)
    const products = [
        ['Flagship Phone X', 'Latest model with AI capabilities.', 999.99, '/img/products/phone.jpg', 'Electronics'],
        ['Dev Laptop Pro', '32GB RAM, 1TB SSD. Compiles code instantly.', 1499.00, '/img/products/laptop.jpg', 'Electronics'],
        ['Hacker Hoodie', 'Black hoodie, anonymous style.', 49.99, '/img/products/hoodie.jpg', 'Apparel'],
        ['USB Rubber Ducky', 'Keyboard injection tool.', 45.00, '/img/products/usb.jpg', 'Tools'],
        ['CTF Guidebook', 'Master the art of hacking.', 25.00, '/img/products/book.jpg', 'Books'],
        ['Mechanical Keyboard', 'Clicky blue switches.', 89.99, '/img/products/keyboard.jpg', 'Electronics']
    ];

    const prodStmt = db.prepare("INSERT INTO products (name, description, price, image, category) VALUES (?, ?, ?, ?, ?)");
    products.forEach(p => prodStmt.run(p));
    prodStmt.finalize();

    // 3. Orders Table
    db.run(`DROP TABLE IF EXISTS orders`);
    db.run(`CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        total_price REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log("Database initialized successfully with 2 users and 6 products.");
});

db.close();