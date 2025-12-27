-- Fix stock quantities for all products
UPDATE products SET stock_quantity = 50 WHERE id = 1;  -- Flagship Phone X Pro
UPDATE products SET stock_quantity = 35 WHERE id = 2;  -- Gaming Phone Ultra
UPDATE products SET stock_quantity = 20 WHERE id = 3;  -- Developer Laptop Pro 16
UPDATE products SET stock_quantity = 60 WHERE id = 4;  -- Budget Office Laptop
UPDATE products SET stock_quantity = 100 WHERE id = 5; -- Hacker Hoodie Black
UPDATE products SET stock_quantity = 150 WHERE id = 6; -- Cybersecurity T-Shirt
UPDATE products SET stock_quantity = 30 WHERE id = 7;  -- USB Rubber Ducky
UPDATE products SET stock_quantity = 15 WHERE id = 8;  -- WiFi Pineapple Mark VII
UPDATE products SET stock_quantity = 25 WHERE id = 9;  -- Flipper Zero
UPDATE products SET stock_quantity = 40 WHERE id = 10; -- The Web Application Hackers Handbook
UPDATE products SET stock_quantity = 35 WHERE id = 11; -- Metasploit: The Penetration Testers Guide
UPDATE products SET stock_quantity = 45 WHERE id = 12; -- Mechanical Keyboard RGB
UPDATE products SET stock_quantity = 70 WHERE id = 13; -- Wireless Mouse Pro
UPDATE products SET stock_quantity = 1 WHERE id = 14;  -- SECRET FLAG PRODUCT

-- Set all products to not hidden except the secret one
UPDATE products SET is_hidden = 0 WHERE id < 14;
UPDATE products SET is_hidden = 1 WHERE id = 14;

-- Ensure featured products are marked
UPDATE products SET is_featured = 1 WHERE id IN (1, 2, 3, 7, 9);
UPDATE products SET is_featured = 0 WHERE id NOT IN (1, 2, 3, 7, 9);

SELECT 'Stock quantities updated successfully!' as message;