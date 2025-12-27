const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const db = new sqlite3.Database('./database/vuln_app.db');

// Weak MD5 hash function (intentionally vulnerable)
function md5(password) {
    return crypto.createHash('md5').update(password).digest('hex');
}

console.log('[*] Initializing VulnNode-CTF v2.0 Database...');
console.log('[!] WARNING: This database contains intentional vulnerabilities!\n');

db.serialize(() => {
    // ========================================
    // 1. USERS TABLE (Enhanced)
    // ========================================
    db.run(`DROP TABLE IF EXISTS users`);
    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        password_md5 TEXT,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        isAdmin INTEGER DEFAULT 0,
        isVendor INTEGER DEFAULT 0,
        avatar TEXT DEFAULT '/img/avatars/default.png',
        balance REAL DEFAULT 100.00,
        loyalty_points INTEGER DEFAULT 0,
        api_key TEXT,
        reset_token TEXT,
        reset_token_expiry TEXT,
        email_verified INTEGER DEFAULT 0,
        two_factor_enabled INTEGER DEFAULT 0,
        two_factor_secret TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        account_status TEXT DEFAULT 'active'
    )`);

    // Seed Users (Mix of bcrypt and MD5 for vulnerability demonstration)
    const users = [
        [1, 'admin', md5('admin123'), md5('admin123'), 'admin@vulnshop.com', 'Admin', 'User', '+1234567890', 1, 0, '/img/avatars/admin.png', 9999.00, 0, 'VN_ADMIN_KEY_12345', null, null, 1, 0, null],
        [2, 'alice', md5('alice123'), md5('alice123'), 'alice@example.com', 'Alice', 'Johnson', '+1234567891', 0, 0, '/img/avatars/user1.png', 250.00, 150, 'VN_USER_KEY_ALICE', null, null, 1, 0, null],
        [3, 'bob', md5('bob123'), md5('bob123'), 'bob@example.com', 'Bob', 'Smith', '+1234567892', 0, 0, '/img/avatars/user2.png', 100.00, 50, 'VN_USER_KEY_BOB', null, null, 1, 0, null],
        [4, 'vendor1', md5('vendor123'), md5('vendor123'), 'vendor1@vulnshop.com', 'John', 'Vendor', '+1234567893', 0, 1, '/img/avatars/vendor.png', 5000.00, 0, 'VN_VENDOR_KEY_001', null, null, 1, 0, null],
        [5, 'charlie', md5('charlie123'), md5('charlie123'), 'charlie@example.com', 'Charlie', 'Brown', '+1234567894', 0, 0, '/img/avatars/user3.png', 75.00, 25, 'VN_USER_KEY_CHARLIE', null, null, 0, 0, null],
        [6, 'testuser', md5('test123'), md5('test123'), 'test@vulnshop.com', 'Test', 'User', '+1234567895', 0, 0, '/img/avatars/default.png', 50.00, 10, 'VN_USER_KEY_TEST', null, null, 1, 0, null]
    ];

    const userStmt = db.prepare(`INSERT INTO users (id, username, password, password_md5, email, first_name, last_name, phone, isAdmin, isVendor, avatar, balance, loyalty_points, api_key, reset_token, reset_token_expiry, email_verified, two_factor_enabled, two_factor_secret) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    users.forEach(u => userStmt.run(u));
    userStmt.finalize();

    // ... rest of tables follow same pattern
    // (Continuing with categories, products, etc.)

    // ========================================
    // 2. CATEGORIES TABLE
    // ========================================
    db.run(`DROP TABLE IF EXISTS categories`);
    db.run(`CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        image TEXT,
        parent_id INTEGER,
        display_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
    )`);

    const categories = [
        ['Electronics', 'electronics', 'Latest gadgets and electronic devices', '/img/categories/electronics.jpg', null, 1],
        ['Fashion', 'fashion', 'Trendy clothing and accessories', '/img/categories/fashion.jpg', null, 2],
        ['Home & Kitchen', 'home-kitchen', 'Everything for your home', '/img/categories/home.jpg', null, 3],
        ['Books', 'books', 'Reading materials and ebooks', '/img/categories/books.jpg', null, 4],
        ['Sports & Outdoors', 'sports', 'Sports equipment and outdoor gear', '/img/categories/sports.jpg', null, 5],
        ['Security Tools', 'security-tools', 'Hacking and security tools', '/img/categories/security.jpg', null, 6],
        ['Phones', 'phones', 'Smartphones and accessories', '/img/categories/phones.jpg', 1, 1],
        ['Laptops', 'laptops', 'Laptops and computing devices', '/img/categories/laptops.jpg', 1, 2],
        ['Mens Fashion', 'mens-fashion', 'Clothing for men', '/img/categories/mens.jpg', 2, 1],
        ['Womens Fashion', 'womens-fashion', 'Clothing for women', '/img/categories/womens.jpg', 2, 2]
    ];

    const catStmt = db.prepare("INSERT INTO categories (name, slug, description, image, parent_id, display_order) VALUES (?, ?, ?, ?, ?, ?)");
    categories.forEach(c => catStmt.run(c));
    catStmt.finalize();

    // ========================================
    // 3. PRODUCTS TABLE (Enhanced with variants)
    // ========================================
    db.run(`DROP TABLE IF EXISTS products`);
    db.run(`CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        description TEXT,
        long_description TEXT,
        price REAL NOT NULL,
        compare_price REAL,
        cost_price REAL,
        sku TEXT UNIQUE,
        barcode TEXT,
        stock_quantity INTEGER DEFAULT 0,
        image TEXT,
        images TEXT,
        category_id INTEGER,
        vendor_id INTEGER,
        brand TEXT,
        weight REAL,
        dimensions TEXT,
        rating REAL DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        is_featured INTEGER DEFAULT 0,
        is_hidden INTEGER DEFAULT 0,
        tags TEXT,
        meta_title TEXT,
        meta_description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(category_id) REFERENCES categories(id),
        FOREIGN KEY(vendor_id) REFERENCES users(id)
    )`);

    const products = [
        // Electronics
        ['Flagship Phone X Pro', 'flagship-phone-x-pro', 'Latest flagship with AI-powered camera', 'The Flagship Phone X Pro features a stunning 6.7-inch OLED display, 12GB RAM, 512GB storage, and a revolutionary AI camera system. Perfect for tech enthusiasts.', 999.99, 1199.99, 650.00, 'PHONE-X-001', '1234567890123', 50, '/img/products/phone1.jpg', '/img/products/phone1.jpg,/img/products/phone1-2.jpg,/img/products/phone1-3.jpg', 7, 4, 'TechBrand', 0.2, '160x75x8mm', 4.5, 128, 1, 0, 'phone,flagship,5g,android', 'Buy Flagship Phone X Pro', 'Latest smartphone with AI camera'],
        ['Gaming Phone Ultra', 'gaming-phone-ultra', 'Ultimate gaming smartphone with 165Hz display', 'Designed for mobile gamers with a 165Hz AMOLED display, dedicated gaming triggers, and advanced cooling system. Dominate the competition.', 899.99, 999.99, 580.00, 'PHONE-G-001', '1234567890124', 35, '/img/products/phone2.jpg', '/img/products/phone2.jpg', 7, 4, 'GameTech', 0.23, '165x77x9mm', 4.7, 89, 1, 0, 'gaming,phone,165hz', 'Gaming Phone Ultra', 'Best gaming smartphone'],
        ['Developer Laptop Pro 16', 'developer-laptop-pro-16', '16-inch powerhouse for developers', 'MacBook-killer with 32GB RAM, 1TB NVMe SSD, RTX 4060, and a stunning 16-inch 2.5K display. Compiles code at lightning speed.', 1499.00, 1799.00, 980.00, 'LAPTOP-DEV-001', '1234567890125', 20, '/img/products/laptop1.jpg', '/img/products/laptop1.jpg', 8, 4, 'DevBook', 2.1, '357x248x18mm', 4.8, 256, 1, 0, 'laptop,developer,coding,linux', 'Developer Laptop Pro', 'Best laptop for developers'],
        ['Budget Office Laptop', 'budget-office-laptop', 'Affordable laptop for everyday tasks', 'Perfect for students and office work. 8GB RAM, 256GB SSD, Intel i5 processor. Great value for money.', 549.99, 699.99, 380.00, 'LAPTOP-OFF-001', '1234567890126', 60, '/img/products/laptop2.jpg', '/img/products/laptop2.jpg', 8, 4, 'OfficeMax', 1.8, '340x230x20mm', 4.2, 67, 0, 0, 'laptop,budget,office', 'Budget Laptop', 'Affordable office laptop'],
        
        // Fashion
        ['Hacker Hoodie Black', 'hacker-hoodie-black', 'Anonymous style black hoodie', 'Premium quality hoodie for hackers and developers. Features a minimalist design with hidden pockets. Available in S-XXL.', 49.99, 69.99, 25.00, 'HOODIE-BLK-001', '1234567890127', 100, '/img/products/hoodie1.jpg', '/img/products/hoodie1.jpg', 9, null, 'HackWear', 0.5, 'S-XXL', 4.6, 342, 1, 0, 'hoodie,hacker,clothing,black', 'Hacker Hoodie', 'Anonymous hacker hoodie'],
        ['Cybersecurity T-Shirt', 'cybersecurity-tshirt', 'I broke production and all I got was this t-shirt', 'Funny developer t-shirt with cybersecurity humor. 100% cotton, comfortable fit.', 24.99, 29.99, 12.00, 'TSHIRT-001', '1234567890128', 150, '/img/products/tshirt1.jpg', '/img/products/tshirt1.jpg', 9, null, 'DevThreads', 0.2, 'S-XXL', 4.4, 89, 0, 0, 'tshirt,developer,funny', 'Cybersecurity T-Shirt', 'Funny developer tshirt'],
        
        // Security Tools
        ['USB Rubber Ducky', 'usb-rubber-ducky', 'Keystroke injection tool for penetration testing', 'The USB Rubber Ducky is a powerful keystroke injection tool disguised as a USB drive. Perfect for red team operations and security testing.', 45.00, 59.99, 28.00, 'USB-DUCKY-001', '1234567890129', 30, '/img/products/usb-ducky.jpg', '/img/products/usb-ducky.jpg', 6, 4, 'HakShop', 0.05, '60x20x10mm', 4.9, 445, 1, 0, 'pentest,usb,hacking,tool', 'USB Rubber Ducky', 'Keystroke injection tool'],
        ['WiFi Pineapple Mark VII', 'wifi-pineapple-mk7', 'Advanced WiFi auditing platform', 'The industry standard for WiFi penetration testing. Features dual-band AC, modular system, and intuitive web interface.', 199.99, 249.99, 120.00, 'WIFI-PINE-001', '1234567890130', 15, '/img/products/pineapple.jpg', '/img/products/pineapple.jpg', 6, 4, 'HakShop', 0.3, '100x100x30mm', 4.8, 234, 1, 0, 'wifi,pentest,auditing', 'WiFi Pineapple', 'WiFi auditing platform'],
        ['Flipper Zero', 'flipper-zero', 'Portable multi-tool for hackers', 'Portable multi-tool for pentesters and geeks. Sub-GHz transceiver, RFID, NFC, infrared, GPIO, and more.', 169.00, 199.00, 95.00, 'FLIP-ZERO-001', '1234567890131', 25, '/img/products/flipper.jpg', '/img/products/flipper.jpg', 6, 4, 'Flipper', 0.1, '100x40x25mm', 5.0, 678, 1, 0, 'hacking,rfid,nfc,pentest', 'Flipper Zero', 'Hacker multi-tool'],
        
        // Books
        ['The Web Application Hackers Handbook', 'web-app-hackers-handbook', 'Finding and exploiting security flaws', 'The definitive guide to web application security. Learn to find and exploit vulnerabilities in web applications.', 45.99, 59.99, 25.00, 'BOOK-WEB-001', '9780123456789', 40, '/img/products/book1.jpg', '/img/products/book1.jpg', 4, null, 'Wiley', 1.2, '230x180x35mm', 4.9, 567, 1, 0, 'book,hacking,security,web', 'Web Hackers Handbook', 'Web security book'],
        ['Metasploit: The Penetration Testers Guide', 'metasploit-guide', 'Master the Metasploit Framework', 'Comprehensive guide to using Metasploit for penetration testing. From basics to advanced exploitation.', 39.99, 49.99, 20.00, 'BOOK-META-001', '9780123456790', 35, '/img/products/book2.jpg', '/img/products/book2.jpg', 4, null, 'No Starch Press', 1.0, '230x180x30mm', 4.7, 234, 0, 0, 'book,metasploit,pentest', 'Metasploit Guide', 'Metasploit book'],
        
        // Accessories
        ['Mechanical Keyboard RGB', 'mechanical-keyboard-rgb', 'Cherry MX Blue switches with RGB lighting', 'Premium mechanical keyboard with Cherry MX Blue switches. RGB per-key lighting, programmable macros, and N-key rollover.', 129.99, 159.99, 70.00, 'KEYB-MECH-001', '1234567890132', 45, '/img/products/keyboard.jpg', '/img/products/keyboard.jpg', 1, null, 'KeyMaster', 1.2, '440x130x40mm', 4.6, 445, 1, 0, 'keyboard,mechanical,rgb,gaming', 'Mechanical Keyboard', 'RGB mechanical keyboard'],
        ['Wireless Mouse Pro', 'wireless-mouse-pro', 'Ergonomic wireless mouse with 16000 DPI', 'High-precision wireless mouse perfect for programmers and gamers. 16000 DPI sensor, 6 programmable buttons.', 59.99, 79.99, 35.00, 'MOUSE-PRO-001', '1234567890133', 70, '/img/products/mouse.jpg', '/img/products/mouse.jpg', 1, null, 'MouseTech', 0.1, '125x65x40mm', 4.5, 189, 0, 0, 'mouse,wireless,gaming', 'Wireless Mouse', 'Pro wireless mouse'],
        
        // Hidden/Secret Product (for IDOR challenge)
        ['SECRET FLAG PRODUCT', 'secret-flag-product', 'Hidden product with special flag', 'This product should not be visible! FLAG{idor_product_discovery_success}', 0.01, 0.01, 0.01, 'SECRET-001', '0000000000000', 1, '/img/products/secret.jpg', '/img/products/secret.jpg', 6, null, 'Hidden', 0, '0', 5.0, 1, 0, 1, 'secret,hidden,flag', 'Secret Product', 'Hidden flag product']
    ];

    const prodStmt = db.prepare(`INSERT INTO products (name, slug, description, long_description, price, compare_price, cost_price, sku, barcode, stock_quantity, image, images, category_id, vendor_id, brand, weight, dimensions, rating, review_count, is_featured, is_hidden, tags, meta_title, meta_description) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    products.forEach(p => prodStmt.run(p));
    prodStmt.finalize();

    // Remaining tables with fixed datetime usage
    db.run(`DROP TABLE IF EXISTS addresses`);
    db.run(`CREATE TABLE addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        address_type TEXT DEFAULT 'shipping',
        full_name TEXT,
        phone TEXT,
        address_line1 TEXT NOT NULL,
        address_line2 TEXT,
        city TEXT NOT NULL,
        state TEXT,
        postal_code TEXT NOT NULL,
        country TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    const addresses = [
        [2, 'shipping', 'Alice Johnson', '+1234567891', '123 Main Street', 'Apt 4B', 'New York', 'NY', '10001', 'USA', 1],
        [2, 'billing', 'Alice Johnson', '+1234567891', '123 Main Street', 'Apt 4B', 'New York', 'NY', '10001', 'USA', 1],
        [3, 'shipping', 'Bob Smith', '+1234567892', '456 Oak Avenue', null, 'Los Angeles', 'CA', '90001', 'USA', 1],
        [5, 'shipping', 'Charlie Brown', '+1234567894', '789 Pine Road', 'Suite 100', 'Chicago', 'IL', '60601', 'USA', 1]
    ];

    const addrStmt = db.prepare("INSERT INTO addresses (user_id, address_type, full_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    addresses.forEach(a => addrStmt.run(a));
    addrStmt.finalize();

    db.run(`DROP TABLE IF EXISTS coupons`);
    db.run(`CREATE TABLE coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        discount_type TEXT NOT NULL,
        discount_value REAL NOT NULL,
        min_purchase REAL DEFAULT 0,
        max_discount REAL,
        usage_limit INTEGER,
        used_count INTEGER DEFAULT 0,
        user_limit INTEGER DEFAULT 1,
        valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
        valid_until DATETIME,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`INSERT INTO coupons (code, description, discount_type, discount_value, min_purchase, usage_limit, used_count, user_limit, valid_from, valid_until, is_active) VALUES 
        ('WELCOME10', 'Welcome discount for new users', 'percentage', 10, 50, 100, 0, 1, datetime('now'), datetime('now', '+30 days'), 1),
        ('SUMMER50', 'Summer sale - 50 off', 'fixed', 50, 200, 50, 0, 1, datetime('now'), datetime('now', '+60 days'), 1),
        ('FREESHIP', 'Free shipping on all orders', 'shipping', 0, 0, null, 0, 1, datetime('now'), datetime('now', '+90 days'), 1),
        ('ADMIN100', 'Admin only - 100% off', 'percentage', 100, 0, 10, 0, 1, datetime('now'), datetime('now', '+365 days'), 1),
        ('FLAG_COUPON', 'FLAG{coupon_code_exploitation_success}', 'percentage', 99, 0, 1, 0, 1, datetime('now'), datetime('now', '+365 days'), 1)`);

    // Continue with remaining tables
    db.run(`DROP TABLE IF EXISTS orders`);
    db.run(`CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        subtotal REAL NOT NULL,
        discount_amount REAL DEFAULT 0,
        shipping_cost REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        coupon_code TEXT,
        payment_method TEXT,
        payment_status TEXT DEFAULT 'pending',
        order_status TEXT DEFAULT 'pending',
        shipping_address_id INTEGER,
        billing_address_id INTEGER,
        tracking_number TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    const orders = [
        ['ORD-2024-00001', 2, 1049.98, 999.99, 0, 50.00, 0, null, 'credit_card', 'completed', 'delivered', 1, 2, 'TRACK123456', null],
        ['ORD-2024-00002', 3, 129.99, 129.99, 0, 0, 0, 'FREESHIP', 'paypal', 'completed', 'shipped', 3, 3, 'TRACK123457', null],
        ['ORD-2024-00003', 2, 214.00, 214.00, 0, 0, 0, null, 'credit_card', 'pending', 'processing', 1, 2, null, null]
    ];

    const orderStmt = db.prepare("INSERT INTO orders (order_number, user_id, total_amount, subtotal, discount_amount, shipping_cost, tax_amount, coupon_code, payment_method, payment_status, order_status, shipping_address_id, billing_address_id, tracking_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    orders.forEach(o => orderStmt.run(o));
    orderStmt.finalize();

    db.run(`DROP TABLE IF EXISTS order_items`);
    db.run(`CREATE TABLE order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        sku TEXT,
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    const orderItems = [
        [1, 1, 'Flagship Phone X Pro', 1, 999.99, 999.99, 'PHONE-X-001'],
        [2, 12, 'Mechanical Keyboard RGB', 1, 129.99, 129.99, 'KEYB-MECH-001'],
        [3, 9, 'Flipper Zero', 1, 169.00, 169.00, 'FLIP-ZERO-001'],
        [3, 5, 'Hacker Hoodie Black', 1, 49.99, 49.99, 'HOODIE-BLK-001']
    ];

    const orderItemStmt = db.prepare("INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price, sku) VALUES (?, ?, ?, ?, ?, ?, ?)");
    orderItems.forEach(oi => orderItemStmt.run(oi));
    orderItemStmt.finalize();

    db.run(`DROP TABLE IF EXISTS cart`);
    db.run(`CREATE TABLE cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    const cartItems = [[2, 3, 1], [3, 7, 1], [5, 11, 2]];
    const cartStmt = db.prepare("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)");
    cartItems.forEach(c => cartStmt.run(c));
    cartStmt.finalize();

    db.run(`DROP TABLE IF EXISTS wishlist`);
    db.run(`CREATE TABLE wishlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    db.run(`INSERT INTO wishlist (user_id, product_id, added_at) VALUES 
        (2, 8, datetime('now', '-5 days')),
        (2, 9, datetime('now', '-3 days')),
        (3, 1, datetime('now', '-1 day'))`);

    db.run(`DROP TABLE IF EXISTS reviews`);
    db.run(`CREATE TABLE reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        title TEXT,
        comment TEXT,
        is_verified_purchase INTEGER DEFAULT 0,
        helpful_count INTEGER DEFAULT 0,
        is_approved INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(product_id) REFERENCES products(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    const reviews = [
        [1, 2, 5, 'Amazing phone!', 'Best phone I have ever used. The camera quality is outstanding and battery life is great!', 1, 45],
        [1, 3, 4, 'Good but expensive', 'Great phone but a bit pricey. Performance is top notch though.', 1, 23],
        [3, 2, 5, 'Perfect for development', 'This laptop handles everything I throw at it. Compilation times are incredible!', 1, 67],
        [5, 2, 5, 'Love this hoodie', 'Super comfortable and looks great. Perfect for late night coding sessions.', 1, 34],
        [7, 3, 5, 'Essential tool', 'The USB Rubber Ducky is a must-have for any pentester. Works flawlessly.', 1, 89],
        [9, 2, 5, 'Best gadget ever!', '<script>alert("XSS")</script>This is an amazing device for security research!', 1, 234],
        [12, 5, 4, 'Great keyboard', 'Love the feel of the keys. RGB lighting is customizable and looks amazing.', 0, 12]
    ];

    const reviewStmt = db.prepare("INSERT INTO reviews (product_id, user_id, rating, title, comment, is_verified_purchase, helpful_count) VALUES (?, ?, ?, ?, ?, ?, ?)");
    reviews.forEach(r => reviewStmt.run(r));
    reviewStmt.finalize();

    db.run(`DROP TABLE IF EXISTS payment_methods`);
    db.run(`CREATE TABLE payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        payment_type TEXT NOT NULL,
        card_last_four TEXT,
        card_brand TEXT,
        card_token TEXT,
        expiry_month INTEGER,
        expiry_year INTEGER,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    const paymentMethods = [
        [2, 'credit_card', '4242', 'Visa', 'tok_visa_4242424242424242', 12, 2026, 1],
        [3, 'credit_card', '1234', 'Mastercard', 'tok_mc_1234567812345678', 8, 2025, 1],
        [5, 'paypal', null, 'PayPal', 'charlie@example.com', null, null, 1]
    ];

    const pmStmt = db.prepare("INSERT INTO payment_methods (user_id, payment_type, card_last_four, card_brand, card_token, expiry_month, expiry_year, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    paymentMethods.forEach(pm => pmStmt.run(pm));
    pmStmt.finalize();

    db.run(`DROP TABLE IF EXISTS support_tickets`);
    db.run(`CREATE TABLE support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        priority TEXT DEFAULT 'normal',
        category TEXT,
        assigned_to INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    const tickets = [
        [2, 'Order not received', 'I placed an order 2 weeks ago but haven not received it yet. Order number: ORD-2024-00001', 'closed', 'high', 'shipping', 1],
        [3, 'Product defect', 'The keyboard I received has a stuck key. Can I get a replacement?', 'open', 'normal', 'returns', null],
        [5, 'Account access issue', 'I cannot login to my account. Please help! My password is charlie123', 'open', 'normal', 'account', 1]
    ];

    const ticketStmt = db.prepare("INSERT INTO support_tickets (user_id, subject, message, status, priority, category, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?)");
    tickets.forEach(t => ticketStmt.run(t));
    ticketStmt.finalize();

    db.run(`DROP TABLE IF EXISTS ticket_messages`);
    db.run(`CREATE TABLE ticket_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_staff_reply INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(ticket_id) REFERENCES support_tickets(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    const ticketMessages = [
        [1, 1, 'We apologize for the delay. Your order is on the way. Tracking: TRACK123456', 1],
        [1, 2, 'Thank you! Just received it.', 0],
        [3, 5, 'Also, I found a weird file on the server: /etc/passwd', 0]
    ];

    const tmStmt = db.prepare("INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff_reply) VALUES (?, ?, ?, ?)");
    ticketMessages.forEach(tm => tmStmt.run(tm));
    tmStmt.finalize();

    db.run(`DROP TABLE IF EXISTS secrets`);
    db.run(`CREATE TABLE secrets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flag TEXT NOT NULL,
        description TEXT,
        difficulty TEXT,
        points INTEGER DEFAULT 100,
        category TEXT
    )`);

    const secrets = [
        ['FLAG{sql_injection_union_based_success}', 'Found via Union-based SQL Injection in search', 'easy', 100, 'injection'],
        ['FLAG{sql_injection_blind_master}', 'Found via Blind SQL Injection', 'medium', 200, 'injection'],
        ['FLAG{authentication_bypass_completed}', 'Bypassed login authentication', 'easy', 100, 'auth'],
        ['FLAG{jwt_secret_cracked_success}', 'Cracked the JWT secret key', 'medium', 250, 'crypto'],
        ['FLAG{idor_user_enumeration_success}', 'Found via IDOR vulnerability', 'easy', 100, 'access_control'],
        ['FLAG{xss_stored_cookie_theft}', 'Stored XSS to steal cookies', 'medium', 200, 'xss'],
        ['FLAG{command_injection_rce_achieved}', 'Remote Code Execution via command injection', 'hard', 300, 'injection'],
        ['FLAG{lfi_file_read_success}', 'Read sensitive files via LFI', 'medium', 200, 'file_inclusion'],
        ['FLAG{ssrf_internal_service_access}', 'Accessed internal services via SSRF', 'hard', 300, 'ssrf'],
        ['FLAG{insecure_deserialization_rce}', 'RCE via insecure deserialization', 'expert', 400, 'deserialization'],
        ['FLAG{business_logic_price_manipulation}', 'Manipulated product prices', 'medium', 250, 'business_logic'],
        ['FLAG{xxe_out_of_band_exfiltration}', 'XXE with OOB data exfiltration', 'hard', 350, 'xxe'],
        ['FLAG{race_condition_coupon_abuse}', 'Exploited race condition in coupons', 'hard', 300, 'race_condition'],
        ['FLAG{mass_assignment_privilege_escalation}', 'Privilege escalation via mass assignment', 'medium', 250, 'api'],
        ['FLAG{file_upload_webshell_deployed}', 'Uploaded webshell successfully', 'hard', 300, 'file_upload']
    ];

    const secretStmt = db.prepare("INSERT INTO secrets (flag, description, difficulty, points, category) VALUES (?, ?, ?, ?, ?)");
    secrets.forEach(s => secretStmt.run(s));
    secretStmt.finalize();

    db.run(`DROP TABLE IF EXISTS user_progress`);
    db.run(`CREATE TABLE user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        flag TEXT NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`DROP TABLE IF EXISTS logs`);
    db.run(`CREATE TABLE logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_type TEXT,
        message TEXT,
        user_id INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    const logs = [
        ['login', 'User admin logged in successfully', 1, '192.168.1.100', 'Mozilla/5.0...'],
        ['login', 'Failed login attempt for username: admin', null, '192.168.1.105', 'Python-requests/2.28.0'],
        ['order', 'Order ORD-2024-00001 created', 2, '192.168.1.101', 'Mozilla/5.0...'],
        ['error', 'SQL Error: syntax error near WHERE. Query: SELECT * FROM products WHERE id=1 AND name=', 2, '192.168.1.102', 'Mozilla/5.0...'],
        ['admin', 'Admin accessed user management panel. FLAG{verbose_error_handling_leaks_info}', 1, '192.168.1.100', 'Mozilla/5.0...']
    ];

    const logStmt = db.prepare("INSERT INTO logs (log_type, message, user_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)");
    logs.forEach(l => logStmt.run(l));
    logStmt.finalize();

    db.run(`DROP TABLE IF EXISTS sessions`);
    db.run(`CREATE TABLE sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expired INTEGER NOT NULL
    )`);

    console.log('\n✓ Database schema created successfully!');
    console.log('✓ Seeded with realistic e-commerce data');
    console.log('✓ Users created: 6 (admin, alice, bob, vendor1, charlie, testuser)');    console.log('✓ Products created: 15 (including 1 hidden product)');
    console.log('✓ Categories created: 10');
    console.log('✓ Orders created: 3');
    console.log('✓ Reviews created: 7 (including XSS payload)');
    console.log('✓ Support tickets created: 3');
    console.log('✓ Coupons created: 5');
    console.log('✓ CTF Flags hidden: 15');
    console.log('\n[!] Credentials:');
    console.log('    Admin: admin / admin123');
    console.log('    Users: alice/alice123, bob/bob123, charlie/charlie123');
    console.log('    Vendor: vendor1 / vendor123');
    console.log('\n[*] VulnNode-CTF v2.0 is ready for exploitation!');
    console.log('[*] Happy Hacking! 🚩\n');
});

db.close();