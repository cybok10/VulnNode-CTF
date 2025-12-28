const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'vuln_app.db');

// Use better-sqlite3 for synchronous operations (required by frontend.js)
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// VULNERABILITY: Verbose logging for CTF purposes
console.log('[DB] Database connected:', dbPath);
console.log('[DB] Foreign keys enabled');

module.exports = db;
