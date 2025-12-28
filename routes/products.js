const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { optionalAuth, isAuthenticated } = require('../middleware/auth');

// ============================================================
// ENHANCED PRODUCTS API
// ============================================================
// Product management with XSS, SQLi, and business logic vulnerabilities

// --- GET ALL PRODUCTS ---
router.get('/', optionalAuth, (req, res) => {
    try {
        const { category, min_price, max_price, search, sort } = req.query;

        let sql = 'SELECT * FROM products WHERE 1=1';
        const params = [];

        // Category filter
        if (category) {
            sql += ' AND category_id = ?';
            params.push(category);
        }

        // Price range filter
        if (min_price) {
            sql += ' AND price >= ?';
            params.push(parseFloat(min_price));
        }
        if (max_price) {
            sql += ' AND price <= ?';
            params.push(parseFloat(max_price));
        }

        // VULNERABILITY: SQL Injection in search
        if (search) {
            // Direct string concatenation - SQL Injection
            sql += ` AND (name LIKE '%${search}%' OR description LIKE '%${search}%')`;
        }

        // Sort (with injection possibility)
        if (sort) {
            // VULNERABILITY: SQL Injection via ORDER BY
            sql += ` ORDER BY ${sort}`;
        } else {
            sql += ' ORDER BY id DESC';
        }

        const products = db.prepare(sql).all(...params);

        res.json({
            success: true,
            count: products.length,
            products: products
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            query: req.query, // VULNERABILITY: Query parameter exposure
            sql: error.sql    // VULNERABILITY: SQL query exposure
        });
    }
});

// --- GET SINGLE PRODUCT ---
router.get('/:id', optionalAuth, (req, res) => {
    try {
        const productId = req.params.id;

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Get product reviews
        const reviews = db.prepare(`
            SELECT r.*, u.username, u.avatar
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ?
            ORDER BY r.created_at DESC
        `).all(productId);

        res.json({
            success: true,
            product: product,
            reviews: reviews,
            reviewCount: reviews.length,
            averageRating: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 0
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// --- ADD PRODUCT REVIEW ---
router.post('/:id/review', isAuthenticated, (req, res) => {
    try {
        const productId = req.params.id;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Check if product exists
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // VULNERABILITY: Stored XSS - No comment sanitization
        // User can inject JavaScript in comments
        const result = db.prepare(`
            INSERT INTO reviews (product_id, user_id, rating, comment)
            VALUES (?, ?, ?, ?)
        `).run(productId, req.user.id, rating, comment);

        res.json({
            success: true,
            message: 'Review added successfully',
            reviewId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// --- UPDATE PRODUCT (ADMIN/VENDOR) ---
router.put('/:id', isAuthenticated, (req, res) => {
    try {
        const productId = req.params.id;
        const { name, description, price, stock, category_id } = req.body;

        // VULNERABILITY: Weak admin check
        if (req.user.role !== 'vendor' && req.user.username !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Vendor or admin access required'
            });
        }

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // VULNERABILITY: No input validation - can set negative prices/stock
        const updates = [];
        const params = [];

        if (name) {
            updates.push('name = ?');
            params.push(name);
        }
        if (description) {
            updates.push('description = ?');
            params.push(description);
        }
        if (price !== undefined) {
            // VULNERABILITY: No validation - negative prices allowed
            updates.push('price = ?');
            params.push(price);
        }
        if (stock !== undefined) {
            // VULNERABILITY: No validation - negative stock allowed
            updates.push('stock = ?');
            params.push(stock);
        }
        if (category_id) {
            updates.push('category_id = ?');
            params.push(category_id);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        params.push(productId);
        const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
        db.prepare(sql).run(...params);

        res.json({
            success: true,
            message: 'Product updated successfully'
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// --- DELETE PRODUCT (ADMIN) ---
router.delete('/:id', isAuthenticated, (req, res) => {
    try {
        const productId = req.params.id;

        // VULNERABILITY: Weak admin check via header
        if (req.headers['x-admin-key'] !== 'admin123' && req.user.username !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        db.prepare('DELETE FROM products WHERE id = ?').run(productId);

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// --- ADD TO WISHLIST ---
router.post('/:id/wishlist', isAuthenticated, (req, res) => {
    try {
        const productId = req.params.id;

        // Check if already in wishlist
        const existing = db.prepare(`
            SELECT * FROM wishlist 
            WHERE user_id = ? AND product_id = ?
        `).get(req.user.id, productId);

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Product already in wishlist'
            });
        }

        db.prepare(`
            INSERT INTO wishlist (user_id, product_id)
            VALUES (?, ?)
        `).run(req.user.id, productId);

        res.json({
            success: true,
            message: 'Added to wishlist'
        });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// --- REMOVE FROM WISHLIST ---
router.delete('/:id/wishlist', isAuthenticated, (req, res) => {
    try {
        const productId = req.params.id;

        db.prepare(`
            DELETE FROM wishlist 
            WHERE user_id = ? AND product_id = ?
        `).run(req.user.id, productId);

        res.json({
            success: true,
            message: 'Removed from wishlist'
        });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// --- GET CATEGORIES ---
router.get('/categories/all', (req, res) => {
    try {
        const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();

        res.json({
            success: true,
            categories: categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// --- SEARCH PRODUCTS (ADVANCED SQL INJECTION) ---
router.get('/search/advanced', optionalAuth, (req, res) => {
    try {
        const { q, category, min_price, max_price, order_by, order_dir } = req.query;

        // VULNERABILITY: Complex SQL Injection
        // Multiple injection points in WHERE and ORDER BY clauses
        let sql = `
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;

        if (q) {
            // Direct concatenation - SQL Injection
            sql += ` AND (p.name LIKE '%${q}%' OR p.description LIKE '%${q}%')`;
        }

        if (category) {
            sql += ` AND c.name = '${category}'`; // SQL Injection
        }

        if (min_price) {
            sql += ` AND p.price >= ${min_price}`; // SQL Injection
        }

        if (max_price) {
            sql += ` AND p.price <= ${max_price}`; // SQL Injection
        }

        // ORDER BY injection
        if (order_by) {
            sql += ` ORDER BY ${order_by}`; // SQL Injection
            if (order_dir) {
                sql += ` ${order_dir}`; // SQL Injection
            }
        }

        const products = db.prepare(sql).all();

        res.json({
            success: true,
            count: products.length,
            products: products,
            debug: {
                query: req.query,
                sql: sql // VULNERABILITY: SQL query exposure
            }
        });
    } catch (error) {
        console.error('Advanced search error:', error);
        // VULNERABILITY: Detailed error with SQL query
        res.status(500).json({
            success: false,
            error: error.message,
            query: req.query,
            sqlError: error.code,
            attemptedSQL: error.sql
        });
    }
});

module.exports = router;