const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const secrets = require('../config/secrets');

const db = new sqlite3.Database(secrets.DB_PATH);

// Helper to create MD5 hash (Weak Hashing Vulnerability)
const md5 = (string) => crypto.createHash('md5').update(string).digest('hex');

db.serialize(() => {
    console.log('[*] Dropping existing tables...');
    db.run("DROP TABLE IF EXISTS users");
    db.run("DROP TABLE IF EXISTS products");
    db.run("DROP TABLE IF EXISTS feedback");
    db.run("DROP TABLE IF EXISTS secrets");

    console.log('[*] Creating tables...');
    
    // USERS TABLE
    // Vulnerability: 'isAdmin' is a simple boolean that can be manipulated if Mass Assignment exists
    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        email TEXT,
        isAdmin INTEGER DEFAULT 0,
        profile_pic TEXT DEFAULT 'default.jpg'
    )`);

    // PRODUCTS TABLE
    db.run(`CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        description TEXT,
        price REAL,
        image TEXT
    )`);

    // FEEDBACK TABLE (Target for Stored XSS)
    db.run(`CREATE TABLE feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // SECRETS TABLE (Target for SQL Injection dumping)
    db.run(`CREATE TABLE secrets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        value TEXT
    )`);

    console.log('[*] Seeding data...');

    // 1. Insert Users
    const adminPass = md5(secrets.ADMIN_PASS);
    const userPass = md5('user123');
    
    const stmtUser = db.prepare("INSERT INTO users (username, password, email, isAdmin) VALUES (?, ?, ?, ?)");
    stmtUser.run(secrets.ADMIN_USER, adminPass, 'admin@vulnnode.com', 1);
    stmtUser.run('bob', userPass, 'bob@vulnnode.com', 0);
    stmtUser.run('alice', userPass, 'alice@vulnnode.com', 0);
    stmtUser.finalize();

    // 2. Insert Products
    // Vulnerability: The "Invisible Cloak" is a hidden product that might be found via IDOR or Logic flaws
    const stmtProd = db.prepare("INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)");
    stmtProd.run('Vintage Camera', 'A classic film camera for the nostalgic photographer.', 150.00, 'camera.jpg');
    stmtProd.run('Hacker Hoodie', 'Black, mysterious, and definitely gives you +10 hacking skills.', 49.99, 'hoodie.jpg');
    stmtProd.run('Rubber Duck', 'The ultimate debugging tool. Listens to all your problems.', 5.00, 'duck.jpg');
    stmtProd.run('CTF Flag', 'FLAG{idor_product_discovery_success}', 1337.00, 'flag.png'); // Hidden by frontend logic, reachable by IDOR
    stmtProd.finalize();

    // 3. Insert Feedback (Seeding an initial XSS payload example? No, let's keep it clean for now)
    const stmtFeed = db.prepare("INSERT INTO feedback (user_id, comment) VALUES (?, ?)");
    stmtFeed.run(2, 'Great website! insecure as hell though.');
    stmtFeed.finalize();

    // 4. Insert Flags into Secrets Table (SQLi Target)
    const stmtSecret = db.prepare("INSERT INTO secrets (name, value) VALUES (?, ?)");
    stmtSecret.run('SQL_Injection_Flag', 'FLAG{blind_sql_injection_master}');
    stmtSecret.run('Admin_API_Key', 'super_secret_admin_api_key_12345');
    stmtSecret.finalize();

    console.log('[+] Database initialized successfully.');
    console.log(`[!] Admin Credentials -> User: ${secrets.ADMIN_USER} | Pass: ${secrets.ADMIN_PASS}`);
});

db.close();