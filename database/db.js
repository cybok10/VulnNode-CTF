/**
 * Unified Database Module
 * Single source of truth for database connection
 * All routes should use: const db = require('../database/db');
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'vuln_app.db');

// Create database connection
const db = new Database(dbPath);

// Enable foreign keys for referential integrity
db.pragma('foreign_keys = ON');

// Log connection
console.log('[DB] Database connected:', dbPath);
console.log('[DB] Foreign keys enabled');

// Export database instance
module.exports = db;
