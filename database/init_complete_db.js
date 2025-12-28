const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'vuln_app.db');
const db = new sqlite3.Database(dbPath);

console.log('\n============================================================');
console.log('   VulnNode-CTF Database Initialization');
console.log('============================================================\n');

db.serialize(() => {
    // ======================
    // 1. USERS TABLE
    // ======================
    console.log('[1/15] Creating users table...');
    db.run(`DROP TABLE IF EXISTS users`);
    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        isAdmin INTEGER DEFAULT 0,
        avatar TEXT DEFAULT '/img/avatars/default.png',
        balance REAL DEFAULT 100.00,
        loyalty_points INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active INTEGER DEFAULT 1,
        phone TEXT,
        bio TEXT
    )`);

    // Seed Users
    const adminPass = bcrypt.hashSync('admin123', 10);
    const userPass = bcrypt.hashSync('user123', 10);
    const alicePass = bcrypt.hashSync('alice123', 10);
    const bobPass = bcrypt.hashSync('bob123', 10);

    const userStmt = db.prepare(`INSERT INTO users 
        (username, password, email, isAdmin, balance, loyalty_points, phone, bio) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    
    userStmt.run('admin', adminPass, 'admin@vulnshop.com', 1, 9999.00, 5000, '+1234567890', 'System Administrator');
    userStmt.run('user', userPass, 'user@test.com', 0, 100.00, 50, '+1234567891', 'Regular user account');
    userStmt.run('alice', alicePass, 'alice@example.com', 0, 250.00, 120, '+1234567892', 'Security researcher');
    userStmt.run('bob', bobPass, 'bob@example.com', 0, 75.00, 30, '+1234567893', 'Penetration tester');
    userStmt.finalize();

    // ======================
    // 2. PRODUCTS TABLE
    // ======================
    console.log('[2/15] Creating products table...');
    db.run(`DROP TABLE IF EXISTS products`);
    db.run(`CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image_url TEXT,
        category TEXT,
        stock INTEGER DEFAULT 100,
        is_featured INTEGER DEFAULT 0,
        is_hidden INTEGER DEFAULT 0,
        discount_percent REAL DEFAULT 0,
        rating REAL DEFAULT 0,
        total_reviews INTEGER DEFAULT 0,
        sku TEXT UNIQUE,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed Products (Realistic Tech Store)
    const products = [
        ['Flagship Phone X Pro', 'Latest flagship smartphone with AI capabilities, 5G support, and 108MP camera. Perfect for security researchers who need reliable communication.', 999.99, '/img/products/phone.jpg', 'Electronics', 45, 1, 0, 10, 4.5, 234, 'PHONE-001', 'smartphone,5g,camera,flagship'],
        ['Dev Laptop Pro 15', 'High-performance laptop with 32GB RAM, 1TB NVMe SSD, and RTX 4060. Compiles code instantly, perfect for penetration testing.', 1499.00, '/img/products/laptop.jpg', 'Electronics', 23, 1, 0, 15, 4.8, 189, 'LAPTOP-001', 'laptop,development,gaming,rtx'],
        ['Hacker Hoodie Black', 'Premium black hoodie with anonymous style. Made from 100% organic cotton. Stay comfortable during long hacking sessions.', 49.99, '/img/products/hoodie.jpg', 'Apparel', 150, 0, 0, 0, 4.2, 98, 'APPAREL-001', 'hoodie,clothing,hacker,black'],
        ['USB Rubber Ducky', 'Keystroke injection tool for penetration testing. Appears as a keyboard to computers. For educational purposes only.', 45.00, '/img/products/usb.jpg', 'Tools', 67, 1, 0, 0, 4.6, 445, 'TOOL-001', 'usb,pentesting,injection,hacking'],
        ['CTF Survival Guide', 'Comprehensive guidebook covering all aspects of Capture The Flag competitions. Master the art of ethical hacking.', 25.00, '/img/products/book.jpg', 'Books', 200, 0, 0, 20, 4.9, 567, 'BOOK-001', 'ctf,book,guide,hacking'],
        ['Mechanical Keyboard RGB', 'Premium mechanical keyboard with Cherry MX Blue switches and RGB backlighting. Perfect for coding marathons.', 89.99, '/img/products/keyboard.jpg', 'Electronics', 89, 0, 0, 5, 4.4, 321, 'KB-001', 'keyboard,mechanical,rgb,gaming'],
        ['WiFi Pineapple Mark VII', 'Advanced penetration testing platform for WiFi auditing. Includes all accessories and cloud management.', 199.99, '/img/products/pineapple.jpg', 'Tools', 34, 1, 0, 0, 4.7, 156, 'TOOL-002', 'wifi,pentesting,wireless,audit'],
        ['Flipper Zero', 'Portable multi-tool for pentesters and hardware hackers. Sub-GHz, RFID, NFC, Infrared capabilities.', 169.00, '/img/products/flipper.jpg', 'Tools', 12, 1, 0, 0, 4.9, 892, 'TOOL-003', 'flipper,rfid,nfc,hacking'],
        ['Security Camera Pro', '4K security camera with night vision and AI detection. Monitor your lab 24/7.', 79.99, '/img/products/camera.jpg', 'Electronics', 78, 0, 0, 10, 4.3, 203, 'CAM-001', 'camera,security,4k,surveillance'],
        ['Raspberry Pi 5 Kit', 'Latest Raspberry Pi with 8GB RAM, case, power supply, and cooling fan. Perfect for IoT hacking projects.', 125.00, '/img/products/raspi.jpg', 'Electronics', 56, 0, 0, 0, 4.6, 478, 'PI-001', 'raspberry,pi,iot,maker'],
        ['Bug Bounty Sticker Pack', 'Collection of 50 hacker stickers featuring famous exploits and security logos. Decorate your laptop!', 15.99, '/img/products/stickers.jpg', 'Accessories', 300, 0, 0, 0, 4.1, 89, 'ACC-001', 'stickers,swag,hacker,decoration'],
        ['VPN Router Pro', 'Pre-configured VPN router with WireGuard support. Secure all your devices with one router.', 149.99, '/img/products/router.jpg', 'Electronics', 41, 0, 0, 10, 4.5, 267, 'NET-001', 'vpn,router,security,wireguard']
    ];

    const prodStmt = db.prepare(`INSERT INTO products 
        (name, description, price, image_url, category, stock, is_featured, is_hidden, discount_percent, rating, total_reviews, sku, tags) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    products.forEach(p => prodStmt.run(p));
    prodStmt.finalize();

    // ======================
    // 3. REVIEWS TABLE
    // ======================
    console.log('[3/15] Creating reviews table...');
    db.run(`DROP TABLE IF EXISTS reviews`);
    db.run(`CREATE TABLE reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        title TEXT,
        comment TEXT,
        is_verified INTEGER DEFAULT 0,
        helpful_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Seed Reviews (VULNERABILITY: Stored XSS in comments)
    const reviews = [
        [1, 2, 5, 'Amazing Phone!', 'Best phone I ever bought. The camera is incredible and battery lasts all day.', 1, 15],
        [1, 3, 4, 'Good but expensive', 'Great phone but a bit pricey. Worth it if you have the budget.', 1, 8],
        [2, 4, 5, 'Perfect for Development', 'Compiles my code super fast. The keyboard is comfortable and screen is beautiful.', 1, 23],
        [4, 2, 5, 'Essential Tool', 'Every pentester needs this. Works flawlessly for HID attacks.', 1, 67],
        [4, 3, 5, 'Game Changer', 'This tool has helped me in multiple engagements. Highly recommended!', 1, 89],
        [5, 4, 5, 'Must Read for CTF', 'This book taught me everything I know about CTFs. Clear explanations with practical examples.', 1, 102],
        [7, 2, 4, 'Great for WiFi Testing', 'Works as advertised. Cloud management is a nice touch.', 1, 34],
        [8, 3, 5, 'Love my Flipper!', 'So much fun learning about RF and RFID. The community is amazing.', 1, 156]
    ];

    const revStmt = db.prepare(`INSERT INTO reviews 
        (product_id, user_id, rating, title, comment, is_verified, helpful_count) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`);
    reviews.forEach(r => revStmt.run(r));
    revStmt.finalize();

    // ======================
    // 4. CART TABLE
    // ======================
    console.log('[4/15] Creating cart table...');
    db.run(`DROP TABLE IF EXISTS cart`);
    db.run(`CREATE TABLE cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )`);

    // Seed some cart items
    db.run(`INSERT INTO cart (user_id, product_id, quantity) VALUES (2, 1, 1)`);
    db.run(`INSERT INTO cart (user_id, product_id, quantity) VALUES (2, 4, 2)`);

    // ======================
    // 5. ORDERS TABLE
    // ======================
    console.log('[5/15] Creating orders table...');
    db.run(`DROP TABLE IF EXISTS orders`);
    db.run(`CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_number TEXT UNIQUE NOT NULL,
        total_amount REAL NOT NULL,
        shipping_amount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        shipping_address TEXT,
        tracking_number TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Seed Orders
    const orders = [
        [2, 'ORD-2024-001', 1044.99, 0, 83.60, 'completed', 'credit_card', '123 Main St, San Francisco, CA 94102', 'TRACK123456', null],
        [3, 'ORD-2024-002', 214.99, 9.99, 17.20, 'shipped', 'paypal', '456 Elm St, New York, NY 10001', 'TRACK789012', null],
        [4, 'ORD-2024-003', 45.00, 9.99, 3.60, 'pending', 'credit_card', '789 Oak Ave, Austin, TX 73301', null, 'Please rush delivery']
    ];

    const orderStmt = db.prepare(`INSERT INTO orders 
        (user_id, order_number, total_amount, shipping_amount, tax_amount, status, payment_method, shipping_address, tracking_number, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    orders.forEach(o => orderStmt.run(o));
    orderStmt.finalize();

    // ======================
    // 6. ORDER_ITEMS TABLE
    // ======================
    console.log('[6/15] Creating order_items table...');
    db.run(`DROP TABLE IF EXISTS order_items`);
    db.run(`CREATE TABLE order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )`);

    // Seed Order Items
    db.run(`INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES (1, 1, 1, 999.99, 999.99)`);
    db.run(`INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES (1, 4, 1, 45.00, 45.00)`);
    db.run(`INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES (2, 7, 1, 199.99, 199.99)`);
    db.run(`INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES (2, 3, 1, 49.99, 49.99)`);
    db.run(`INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES (3, 4, 1, 45.00, 45.00)`);

    // ======================
    // 7. ADDRESSES TABLE
    // ======================
    console.log('[7/15] Creating addresses table...');
    db.run(`DROP TABLE IF EXISTS addresses`);
    db.run(`CREATE TABLE addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        label TEXT,
        street TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        zip TEXT NOT NULL,
        country TEXT DEFAULT 'USA',
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Seed Addresses
    const addresses = [
        [2, 'Home', '123 Main St', 'San Francisco', 'CA', '94102', 'USA', 1],
        [2, 'Work', '456 Market St Suite 500', 'San Francisco', 'CA', '94103', 'USA', 0],
        [3, 'Home', '456 Elm St Apt 2B', 'New York', 'NY', '10001', 'USA', 1],
        [4, 'Home', '789 Oak Ave', 'Austin', 'TX', '73301', 'USA', 1]
    ];

    const addrStmt = db.prepare(`INSERT INTO addresses 
        (user_id, label, street, city, state, zip, country, is_default) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    addresses.forEach(a => addrStmt.run(a));
    addrStmt.finalize();

    // ======================
    // 8. PAYMENT_METHODS TABLE
    // ======================
    console.log('[8/15] Creating payment_methods table...');
    db.run(`DROP TABLE IF EXISTS payment_methods`);
    db.run(`CREATE TABLE payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        card_type TEXT,
        last_four TEXT,
        expiry_month INTEGER,
        expiry_year INTEGER,
        cardholder_name TEXT,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Seed Payment Methods (VULNERABILITY: Weak encryption/storage)
    db.run(`INSERT INTO payment_methods (user_id, card_type, last_four, expiry_month, expiry_year, cardholder_name, is_default) VALUES (2, 'Visa', '4242', 12, 2026, 'John Doe', 1)`);
    db.run(`INSERT INTO payment_methods (user_id, card_type, last_four, expiry_month, expiry_year, cardholder_name, is_default) VALUES (3, 'Mastercard', '5555', 8, 2025, 'Alice Smith', 1)`);

    // ======================
    // 9. SUPPORT_TICKETS TABLE
    // ======================
    console.log('[9/15] Creating support_tickets table...');
    db.run(`DROP TABLE IF EXISTS support_tickets`);
    db.run(`CREATE TABLE support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'general',
        priority TEXT DEFAULT 'normal',
        status TEXT DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Seed Support Tickets
    const tickets = [
        [2, 'Order Not Received', 'I ordered a phone 3 days ago but tracking shows no movement.', 'orders', 'high', 'in_progress'],
        [3, 'Product Defective', 'The USB Rubber Ducky I received is not working properly.', 'product_issue', 'medium', 'open'],
        [4, 'Account Security', 'I think someone accessed my account. Can you check the logs?', 'security', 'high', 'resolved']
    ];

    const ticketStmt = db.prepare(`INSERT INTO support_tickets 
        (user_id, subject, description, category, priority, status) 
        VALUES (?, ?, ?, ?, ?, ?)`);
    tickets.forEach(t => ticketStmt.run(t));
    ticketStmt.finalize();

    // ======================
    // 10. TICKET_MESSAGES TABLE
    // ======================
    console.log('[10/15] Creating ticket_messages table...');
    db.run(`DROP TABLE IF EXISTS ticket_messages`);
    db.run(`CREATE TABLE ticket_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0,
        attachment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES support_tickets(id),
        FOREIGN KEY (sender_id) REFERENCES users(id)
    )`);

    // Seed Ticket Messages
    const messages = [
        [1, 2, 'I ordered ORD-2024-001 and it shows pending. Very worried!', 0, null],
        [1, 1, 'Thank you for contacting support. We are investigating your order status.', 1, null],
        [2, 3, 'The device powers on but the payload execution fails.', 0, null],
        [3, 4, 'I noticed unusual login attempts from different countries.', 0, null],
        [3, 1, 'We have reviewed your account logs. Your password was compromised. We have reset it.', 1, null]
    ];

    const msgStmt = db.prepare(`INSERT INTO ticket_messages 
        (ticket_id, sender_id, message, is_admin, attachment) 
        VALUES (?, ?, ?, ?, ?)`);
    messages.forEach(m => msgStmt.run(m));
    msgStmt.finalize();

    // ======================
    // 11. SECRETS TABLE (CTF Challenges)
    // ======================
    console.log('[11/15] Creating secrets table (CTF challenges)...');
    db.run(`DROP TABLE IF EXISTS secrets`);
    db.run(`CREATE TABLE secrets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        difficulty INTEGER DEFAULT 1,
        description TEXT,
        flag TEXT NOT NULL UNIQUE,
        points INTEGER DEFAULT 100,
        hint TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed CTF Challenges
    const secrets = [
        ['SQL Injection Basics', 'Web', 1, 'Find the hidden admin credentials using SQL injection in the search box.', 'FLAG{sql_1nj3ct10n_m4st3r}', 100, 'Try using UNION SELECT to extract data from other tables'],
        ['Stored XSS in Reviews', 'Web', 2, 'Inject JavaScript code in product reviews to steal admin cookies.', 'FLAG{xss_c00k13_st34l3r}', 200, 'Reviews are not properly sanitized. Try <script> tags'],
        ['IDOR in Orders', 'Web', 1, 'Access other users orders by manipulating order numbers.', 'FLAG{1d0r_0rd3r_4cc3ss}', 150, 'Order numbers are predictable. Try incrementing them'],
        ['Command Injection', 'Web', 3, 'Execute system commands through the admin panel diagnostic tool.', 'FLAG{c0mm4nd_1nj3ct10n_pwn}', 300, 'The ping utility in admin panel is vulnerable'],
        ['Insecure Deserialization', 'Web', 3, 'Exploit the user_prefs cookie to achieve RCE.', 'FLAG{d3s3r14l1z3_2_rc3}', 350, 'node-serialize is vulnerable. Check for IIFE patterns'],
        ['JWT Secret Weakness', 'Crypto', 2, 'Crack the JWT secret and forge an admin token.', 'FLAG{jwt_s3cr3t_cr4ck3d}', 250, 'The JWT secret is weak. Try common wordlists'],
        ['File Upload RCE', 'Web', 3, 'Upload a malicious file to gain remote code execution.', 'FLAG{f1l3_upl04d_pwn3d}', 300, 'File type validation is weak. Try PHP or JSP files'],
        ['XXE Attack', 'Web', 2, 'Extract sensitive files using XML External Entity injection.', 'FLAG{xx3_f1l3_r34d}', 200, 'XML parser is not configured securely'],
        ['SSRF to Internal Network', 'Web', 2, 'Use SSRF to access internal services and find the flag.', 'FLAG{ssrf_1nt3rn4l_n3tw0rk}', 200, 'The image proxy endpoint is vulnerable'],
        ['Business Logic Flaw', 'Logic', 2, 'Exploit the discount system to get items for free or negative price.', 'FLAG{l0g1c_fl4w_pr1c3}', 250, 'What happens with multiple discount codes?']
    ];

    const secretStmt = db.prepare(`INSERT INTO secrets 
        (name, category, difficulty, description, flag, points, hint) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`);
    secrets.forEach(s => secretStmt.run(s));
    secretStmt.finalize();

    // ======================
    // 12. USER_PROGRESS TABLE
    // ======================
    console.log('[12/15] Creating user_progress table...');
    db.run(`DROP TABLE IF EXISTS user_progress`);
    db.run(`CREATE TABLE user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        challenge_id INTEGER NOT NULL,
        solved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (challenge_id) REFERENCES secrets(id),
        UNIQUE(user_id, challenge_id)
    )`);

    // Seed some progress
    db.run(`INSERT INTO user_progress (user_id, challenge_id) VALUES (3, 1)`);
    db.run(`INSERT INTO user_progress (user_id, challenge_id) VALUES (3, 3)`);
    db.run(`INSERT INTO user_progress (user_id, challenge_id) VALUES (4, 1)`);

    // ======================
    // 13. ADMIN_LOGS TABLE
    // ======================
    console.log('[13/15] Creating admin_logs table...');
    db.run(`DROP TABLE IF EXISTS admin_logs`);
    db.run(`CREATE TABLE admin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER,
        action TEXT NOT NULL,
        target TEXT,
        ip_address TEXT,
        user_agent TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id)
    )`);

    // Seed Admin Logs
    db.run(`INSERT INTO admin_logs (admin_id, action, target, ip_address, details) VALUES (1, 'user_create', 'alice', '192.168.1.100', 'Created new user account')`);
    db.run(`INSERT INTO admin_logs (admin_id, action, target, ip_address, details) VALUES (1, 'product_update', 'product_1', '192.168.1.100', 'Updated product stock')`);
    db.run(`INSERT INTO admin_logs (admin_id, action, target, ip_address, details) VALUES (1, 'system_command', 'ping 8.8.8.8', '192.168.1.100', 'Executed diagnostic command')`);

    // ======================
    // 14. SESSIONS TABLE
    // ======================
    console.log('[14/15] Creating sessions table...');
    db.run(`DROP TABLE IF EXISTS sessions`);
    db.run(`CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        user_id INTEGER,
        data TEXT,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // ======================
    // 15. WISHLIST TABLE
    // ======================
    console.log('[15/15] Creating wishlist table...');
    db.run(`DROP TABLE IF EXISTS wishlist`);
    db.run(`CREATE TABLE wishlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        UNIQUE(user_id, product_id)
    )`, () => {
        console.log('\n============================================================');
        console.log('   Database Initialization Complete!');
        console.log('============================================================');
        console.log('\n✅ Tables Created:');
        console.log('   [1]  users (4 users)');
        console.log('   [2]  products (12 products with stock)');
        console.log('   [3]  reviews (8 reviews)');
        console.log('   [4]  cart (2 items)');
        console.log('   [5]  orders (3 orders)');
        console.log('   [6]  order_items (5 items)');
        console.log('   [7]  addresses (4 addresses)');
        console.log('   [8]  payment_methods (2 cards)');
        console.log('   [9]  support_tickets (3 tickets)');
        console.log('   [10] ticket_messages (5 messages)');
        console.log('   [11] secrets (10 CTF challenges)');
        console.log('   [12] user_progress (3 solves)');
        console.log('   [13] admin_logs (3 entries)');
        console.log('   [14] sessions (empty)');
        console.log('   [15] wishlist (empty)');
        console.log('\n✅ Default Credentials:');
        console.log('   Admin:  admin / admin123');
        console.log('   User:   user / user123');
        console.log('   Alice:  alice / alice123');
        console.log('   Bob:    bob / bob123');
        console.log('\n✅ Sample Data:');
        console.log('   - 12 realistic products with stock tracking');
        console.log('   - 8 product reviews with ratings');
        console.log('   - 3 complete orders with items');
        console.log('   - 3 support tickets with messages');
        console.log('   - 10 CTF challenges (100-350 points each)');
        console.log('\n🎯 CTF Challenges Available:');
        console.log('   1. SQL Injection (Easy)');
        console.log('   2. Stored XSS (Medium)');
        console.log('   3. IDOR (Easy)');
        console.log('   4. Command Injection (Hard)');
        console.log('   5. Insecure Deserialization (Hard)');
        console.log('   6. JWT Cracking (Medium)');
        console.log('   7. File Upload RCE (Hard)');
        console.log('   8. XXE Attack (Medium)');
        console.log('   9. SSRF (Medium)');
        console.log('   10. Business Logic Flaw (Medium)');
        console.log('\n⚠️  All intentional vulnerabilities preserved!');
        console.log('    Ready for CTF competitions!\n');
        console.log('============================================================\n');
    });
});

db.close();
