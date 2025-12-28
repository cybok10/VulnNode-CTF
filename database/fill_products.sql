-- Fill Products with Stock Data
-- Run this after init_db.js to populate products

-- Update existing products with stock
UPDATE products SET stock = 50 WHERE id = 1;
UPDATE products SET stock = 30 WHERE id = 2;
UPDATE products SET stock = 25 WHERE id = 3;
UPDATE products SET stock = 15 WHERE id = 4;
UPDATE products SET stock = 40 WHERE id = 5;
UPDATE products SET stock = 100 WHERE id = 6;
UPDATE products SET stock = 35 WHERE id = 7;

-- Add more diverse products with stock
INSERT INTO products (name, description, price, stock, category, image_url, sku, is_featured, is_hidden) VALUES

-- Electronics
('Gaming Laptop', 'High-performance gaming laptop with RTX 4090', 2499.99, 10, 'Electronics', '/img/products/laptop.jpg', 'ELEC-LAP-001', 1, 0),
('Wireless Earbuds Pro', 'Premium wireless earbuds with ANC', 299.99, 75, 'Electronics', '/img/products/earbuds.jpg', 'ELEC-AUD-002', 1, 0),
('Smart Watch Ultra', 'Advanced fitness and health tracking', 599.99, 45, 'Electronics', '/img/products/smartwatch.jpg', 'ELEC-WAT-003', 0, 0),
('Mechanical Keyboard RGB', 'Cherry MX switches with RGB lighting', 159.99, 60, 'Electronics', '/img/products/keyboard.jpg', 'ELEC-KEY-004', 0, 0),
('Webcam 4K Pro', '4K webcam for streaming and meetings', 149.99, 35, 'Electronics', '/img/products/webcam.jpg', 'ELEC-CAM-005', 0, 0),

-- Clothing
('Hacker Hoodie Black', 'Premium black hoodie with subtle 0day print', 79.99, 120, 'Clothing', '/img/products/hoodie-black.jpg', 'CLOTH-HOO-001', 1, 0),
('Cyberpunk T-Shirt', 'Limited edition neon design', 29.99, 200, 'Clothing', '/img/products/tshirt-cyber.jpg', 'CLOTH-TSH-002', 0, 0),
('Tactical Cargo Pants', 'Durable pants with multiple pockets', 69.99, 85, 'Clothing', '/img/products/pants-tactical.jpg', 'CLOTH-PAN-003', 0, 0),

-- Books
('Web Security Bible', 'Complete guide to web application security', 49.99, 55, 'Books', '/img/products/book-websec.jpg', 'BOOK-SEC-001', 1, 0),
('Python for Hackers', 'Offensive security with Python', 39.99, 70, 'Books', '/img/products/book-python.jpg', 'BOOK-PY-002', 0, 0),
('Network Pentesting Guide', 'Advanced network security testing', 59.99, 40, 'Books', '/img/products/book-network.jpg', 'BOOK-NET-003', 0, 0),

-- Gadgets
('USB Rubber Ducky', 'Keystroke injection tool for testing', 89.99, 30, 'Gadgets', '/img/products/rubber-ducky.jpg', 'GADG-USB-001', 1, 0),
('WiFi Pineapple', 'Wireless auditing platform', 199.99, 15, 'Gadgets', '/img/products/pineapple.jpg', 'GADG-WIFI-002', 0, 0),
('Hardware Hacking Kit', 'Complete hardware security toolkit', 299.99, 20, 'Gadgets', '/img/products/hw-kit.jpg', 'GADG-KIT-003', 0, 0),

-- CTF Special Items (some hidden)
('Flag Collector Trophy', 'Achievement trophy for CTF masters', 9.99, 999, 'CTF', '/img/products/trophy.jpg', 'CTF-TROPHY-001', 0, 0),
('Secret Admin Panel Access', 'Grants access to hidden features', 0.01, 1, 'CTF', '/img/products/secret.jpg', 'CTF-SECRET-001', 0, 1),
('XSS Payload Generator', 'Advanced XSS testing tool', 149.99, 25, 'Tools', '/img/products/xss-tool.jpg', 'TOOL-XSS-001', 0, 0),
('SQL Injection Toolkit', 'Professional SQL injection testing suite', 199.99, 15, 'Tools', '/img/products/sqli-tool.jpg', 'TOOL-SQL-001', 0, 1),

-- Negative Stock Item (for testing)
('Backdoor Access Key', 'Unlimited access to all systems', 999999.99, -10, 'CTF', '/img/products/backdoor.jpg', 'CTF-BACKDOOR-001', 0, 1);

-- Update prices for existing products
UPDATE products SET price = 299.99 WHERE name LIKE '%Laptop%' AND id <= 7;
UPDATE products SET price = 49.99 WHERE name LIKE '%Mouse%';
UPDATE products SET price = 149.99 WHERE name LIKE '%Keyboard%' AND id <= 7;
UPDATE products SET price = 199.99 WHERE name LIKE '%Monitor%';

-- Set featured products
UPDATE products SET is_featured = 1 WHERE id IN (1, 2, 8, 9, 15, 18);

-- Update image URLs for consistency
UPDATE products SET image_url = '/img/products/laptop-gaming.jpg' WHERE id = 1;
UPDATE products SET image_url = '/img/products/mouse-pro.jpg' WHERE id = 2;

SELECT 'Products filled successfully!' as message;
SELECT COUNT(*) as total_products FROM products;
SELECT SUM(stock) as total_stock FROM products WHERE stock > 0;
