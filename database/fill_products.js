#!/usr/bin/env node
/**
 * Fill Products Script
 * Populates the database with product stock data
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'vuln_app.db');
const sqlPath = path.join(__dirname, 'fill_products.sql');

console.log('🔧 Filling products with stock data...');

try {
    // Connect to database
    const db = new Database(dbPath);
    
    // Read SQL file
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    let successCount = 0;
    statements.forEach((statement, index) => {
        try {
            const trimmed = statement.trim();
            if (trimmed.toUpperCase().startsWith('SELECT')) {
                // Execute SELECT and show results
                const results = db.prepare(trimmed).all();
                console.log(`\n📊 Query ${index + 1}:`, results);
            } else {
                // Execute other statements
                db.prepare(trimmed).run();
                successCount++;
            }
        } catch (err) {
            // Ignore duplicate errors, log others
            if (!err.message.includes('UNIQUE') && !err.message.includes('no such table')) {
                console.warn(`⚠️  Statement ${index + 1} warning:`, err.message);
            }
        }
    });
    
    console.log(`\n✅ Successfully executed ${successCount} statements`);
    
    // Show product summary
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const totalStock = db.prepare('SELECT SUM(stock) as total FROM products WHERE stock > 0').get();
    const featured = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_featured = 1').get();
    const hidden = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_hidden = 1').get();
    
    console.log('\n📦 Product Summary:');
    console.log(`   Total Products: ${totalProducts.count}`);
    console.log(`   Total Stock: ${totalStock.total}`);
    console.log(`   Featured: ${featured.count}`);
    console.log(`   Hidden (CTF): ${hidden.count}`);
    
    // Show sample products
    console.log('\n🛍️  Sample Products:');
    const samples = db.prepare(`
        SELECT name, price, stock, category, is_featured
        FROM products 
        WHERE is_hidden = 0
        ORDER BY is_featured DESC, id ASC
        LIMIT 10
    `).all();
    
    samples.forEach(p => {
        const badge = p.is_featured ? '⭐' : '  ';
        console.log(`   ${badge} ${p.name} - $${p.price} (Stock: ${p.stock}) [${p.category}]`);
    });
    
    db.close();
    console.log('\n✨ Products filled successfully!\n');
    
} catch (error) {
    console.error('❌ Error filling products:', error.message);
    process.exit(1);
}
