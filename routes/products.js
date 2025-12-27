const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/vuln_app.db');
const { optionalAuth, isAuthenticated, isVendor } = require('../middleware/auth');

// Get All Products with Filters
router.get('/', optionalAuth, (req, res) => {
    const { category, search, sort, min_price, max_price, page = 1, limit = 12 } = req.query;
    
    let query = 'SELECT * FROM products WHERE is_hidden = 0';
    const params = [];
    
    // VULNERABILITY: SQL Injection in search parameter
    if (search) {
        // Vulnerable: Direct string concatenation
        query += ` AND (name LIKE '%${search}%' OR description LIKE '%${search}%' OR tags LIKE '%${search}%')`;
    }
    
    if (category) {
        query += ' AND category_id = ?';
        params.push(category);
    }
    
    // VULNERABILITY: No input validation on price range
    if (min_price) {
        query += ' AND price >= ?';
        params.push(min_price);
    }
    
    if (max_price) {
        query += ' AND price <= ?';
        params.push(max_price);
    }
    
    // VULNERABILITY: SQL Injection in sort parameter
    if (sort) {
        // Vulnerable: No whitelist validation
        query += ` ORDER BY ${sort}`;
    } else {
        query += ' ORDER BY id DESC';
    }
    
    // Pagination
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    db.all(query, params, (err, products) => {
        if (err) {
            // VULNERABILITY: Exposing SQL errors
            return res.status(500).json({ 
                error: err.message,
                query: query,
                params: params
            });
        }
        
        // Get total count for pagination
        db.get('SELECT COUNT(*) as total FROM products WHERE is_hidden = 0', (err, count) => {
            res.json({
                products: products,
                total: count ? count.total : 0,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil((count ? count.total : 0) / limit)
            });
        });
    });
});

// Get Single Product by ID or Slug
router.get('/:identifier', optionalAuth, (req, res) => {
    const { identifier } = req.params;
    
    // VULNERABILITY: IDOR - Can access hidden products by guessing ID
    const query = isNaN(identifier) 
        ? 'SELECT * FROM products WHERE slug = ?'
        : 'SELECT * FROM products WHERE id = ?';
    
    db.get(query, [identifier], (err, product) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // VULNERABILITY: Exposing hidden products
        // Even if is_hidden = 1, we still return it
        
        // Get product reviews (with XSS vulnerability)
        db.all(`
            SELECT r.*, u.username, u.avatar
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ? AND r.is_approved = 1
            ORDER BY r.created_at DESC
        `, [product.id], (err, reviews) => {
            // Get related products
            db.all(`
                SELECT * FROM products 
                WHERE category_id = ? AND id != ? AND is_hidden = 0
                LIMIT 4
            `, [product.category_id, product.id], (err, related) => {
                res.json({
                    product: product,
                    reviews: reviews || [],
                    related: related || []
                });
            });
        });
    });
});

// Add Product Review - STORED XSS VULNERABILITY
router.post('/:id/review', isAuthenticated, (req, res) => {
    const { id } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.session.user.id;
    
    // VULNERABILITY: No input sanitization - Stored XSS
    // title and comment are stored without any filtering
    
    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Check if user already reviewed this product
    db.get('SELECT * FROM reviews WHERE product_id = ? AND user_id = ?', [id, userId], (err, existing) => {
        if (existing) {
            return res.status(400).json({ error: 'You have already reviewed this product' });
        }
        
        // Insert review without sanitization
        db.run(`
            INSERT INTO reviews (product_id, user_id, rating, title, comment, is_verified_purchase)
            VALUES (?, ?, ?, ?, ?, 0)
        `, [id, userId, rating, title, comment], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Update product rating
            db.run(`
                UPDATE products SET 
                    rating = (SELECT AVG(rating) FROM reviews WHERE product_id = ?),
                    review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ?)
                WHERE id = ?
            `, [id, id, id]);
            
            res.json({
                message: 'Review submitted successfully',
                review_id: this.lastID,
                warning: 'Review may contain unfiltered user input!'
            });
        });
    });
});

// Get Product Reviews (Separate endpoint with XSS)
router.get('/:id/reviews', (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    
    // VULNERABILITY: Reflected XSS in page parameter
    db.all(`
        SELECT r.*, u.username, u.avatar
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
    `, [id, parseInt(limit), offset], (err, reviews) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        db.get('SELECT COUNT(*) as total FROM reviews WHERE product_id = ?', [id], (err, count) => {
            // VULNERABILITY: Reflecting user input without sanitization
            res.json({
                reviews: reviews,
                total: count ? count.total : 0,
                page: page, // Reflected XSS if page contains script
                limit: limit
            });
        });
    });
});

// Mark Review as Helpful
router.post('/review/:review_id/helpful', optionalAuth, (req, res) => {
    const { review_id } = req.params;
    
    // VULNERABILITY: No authentication required
    // VULNERABILITY: No check for multiple votes from same user
    // Can spam helpful votes
    
    db.run('UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?', [review_id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }
        
        res.json({ message: 'Marked as helpful' });
    });
});

// Add to Wishlist
router.post('/:id/wishlist', isAuthenticated, (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;
    
    db.get('SELECT * FROM wishlist WHERE user_id = ? AND product_id = ?', [userId, id], (err, existing) => {
        if (existing) {
            return res.status(400).json({ error: 'Product already in wishlist' });
        }
        
        db.run('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [userId, id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({ message: 'Added to wishlist' });
        });
    });
});

// Remove from Wishlist
router.delete('/wishlist/:wishlist_id', isAuthenticated, (req, res) => {
    const { wishlist_id } = req.params;
    
    // VULNERABILITY: No ownership check - IDOR
    db.run('DELETE FROM wishlist WHERE id = ?', [wishlist_id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json({ message: 'Removed from wishlist' });
    });
});

// Get User Wishlist
router.get('/user/wishlist', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    
    db.all(`
        SELECT w.*, p.name, p.price, p.image, p.rating
        FROM wishlist w
        JOIN products p ON w.product_id = p.id
        WHERE w.user_id = ?
        ORDER BY w.added_at DESC
    `, [userId], (err, items) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ wishlist: items });
    });
});

// Vendor: Create Product
router.post('/vendor/create', isVendor, (req, res) => {
    const { name, description, price, category_id, sku, stock_quantity } = req.body;
    const vendorId = req.session.user.id;
    
    // VULNERABILITY: No input validation on price (can be negative)
    // VULNERABILITY: XSS in product name and description
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    db.run(`
        INSERT INTO products (
            name, slug, description, price, category_id,
            sku, stock_quantity, vendor_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, slug, description, price, category_id, sku, stock_quantity, vendorId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            message: 'Product created',
            product_id: this.lastID
        });
    });
});

// Vendor: Update Product
router.put('/vendor/:id', isVendor, (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock_quantity } = req.body;
    const vendorId = req.session.user.id;
    
    // VULNERABILITY: No ownership check - any vendor can update any product
    // VULNERABILITY: Mass assignment - can update any field
    
    db.run(`
        UPDATE products SET 
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            price = COALESCE(?, price),
            stock_quantity = COALESCE(?, stock_quantity)
        WHERE id = ?
    `, [name, description, price, stock_quantity, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json({ message: 'Product updated' });
    });
});

// VULNERABILITY: Direct product manipulation endpoint (admin bypass)
router.post('/admin/toggle-visibility', (req, res) => {
    const { product_id, is_hidden } = req.body;
    
    // VULNERABILITY: No admin check
    // Anyone can hide/show products
    
    db.run('UPDATE products SET is_hidden = ? WHERE id = ?', [is_hidden ? 1 : 0, product_id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            message: 'Product visibility updated',
            warning: 'This endpoint should require admin authentication!'
        });
    });
});

// Search with Autocomplete - MAJOR SQL INJECTION
router.get('/search/autocomplete', (req, res) => {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
        return res.json({ suggestions: [] });
    }
    
    // VULNERABILITY: Direct SQL injection in autocomplete
    const query = `
        SELECT name, slug, price, image 
        FROM products 
        WHERE name LIKE '%${q}%' 
        AND is_hidden = 0 
        LIMIT 10
    `;
    
    db.all(query, (err, results) => {
        if (err) {
            // VULNERABILITY: Exposing SQL errors in autocomplete
            return res.status(500).json({ 
                error: err.message,
                query: query
            });
        }
        
        res.json({ suggestions: results });
    });
});

// Get Product Stock - Race Condition Vulnerability
router.get('/:id/stock', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT stock_quantity FROM products WHERE id = ?', [id], (err, product) => {
        if (err || !product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // VULNERABILITY: Exposing exact stock levels
        // Can be used for inventory scraping
        res.json({ 
            product_id: id,
            stock: product.stock_quantity,
            available: product.stock_quantity > 0
        });
    });
});

module.exports = router;