/**
 * VulnNode Enterprise - Database Configuration Manager
 * * This module handles the complexity of connecting to multiple data sources.
 * In a real enterprise scenario, you might have legacy SQL databases running 
 * alongside modern ORMs and NoSQL document stores. 
 * * VULNERABILITY CONTEXT:
 * - This file sets up a "Legacy" raw SQL interface specifically designed to be 
 * vulnerable to SQL Injection (SQLi) when used in 'Low' security mode.
 * - It enables verbose logging which can leak sensitive data (SQL queries with creds) 
 * into server logs (OWASP A09:2021 – Security Logging and Monitoring Failures).
 * - It creates a file-based NoSQL engine to demonstrate NoSQL Injection.
 */

const { Sequelize } = require('sequelize');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

// Define paths for data storage
const DATA_DIR = path.join(__dirname, '../database');
const SQLITE_FILE = path.join(DATA_DIR, 'vuln_enterprise.db');
const NOSQL_FILE = path.join(DATA_DIR, 'nosql_store.json');

// Ensure database directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================================
// 1. MODERN ORM (Sequelize) - Used for 'High' Security Levels (Patched)
// ============================================================================
// This instance uses parameterized queries by default, preventing SQLi.
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: SQLITE_FILE,
    logging: (msg) => console.log(chalk.gray(`[ORM-Log] ${msg}`)), // Verbose logging
    define: {
        timestamps: true, // Adds createdAt, updatedAt automatically
        underscored: true
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// ============================================================================
// 2. LEGACY RAW CONNECTOR - Used for 'Low'/'Mid' Security Levels (Vulnerable)
// ============================================================================
/**
 * The LegacyDB class wraps the native sqlite3 driver.
 * It intentionally exposes methods that encourage string concatenation 
 * to facilitate SQL Injection tutorials.
 */
class LegacyDB {
    constructor() {
        this.db = new sqlite3.Database(SQLITE_FILE, (err) => {
            if (err) {
                console.error(chalk.red('[LegacyDB] Connection failed:'), err.message);
            } else {
                console.log(chalk.yellow('[LegacyDB] Connected to SQLite (Vulnerable Mode Ready)'));
            }
        });
    }

    /**
     * Executes a raw SQL query.
     * WARNING: This method is designed to be unsafe. It accepts a raw string.
     * * @param {string} sql - The raw SQL string
     * @returns {Promise<Array>} - Result rows
     */
    async query(sql) {
        return new Promise((resolve, reject) => {
            console.log(chalk.red(`[LegacyDB] Executing Raw SQL: ${sql}`));
            
            // In 'Low' security mode, we use .exec() or .all() with the raw string
            // allowing stacked queries ('; DROP TABLE users --')
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    console.error(chalk.bgRed.white(`[LegacyDB] Error: ${err.message}`));
                    // Return the error to the user? (Security Misconfiguration: Verbose Errors)
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }

    /**
     * Executes a script (multiple statements).
     * Necessary for re-seeding the database dynamically.
     */
    async exec(script) {
        return new Promise((resolve, reject) => {
            this.db.exec(script, (err) => {
                if (err) return reject(err);
                resolve(true);
            });
        });
    }
}

// ============================================================================
// 3. NoSQL SIMULATOR - Used for NoSQL Injection
// ============================================================================
/**
 * A custom file-based JSON store that simulates MongoDB behavior.
 * This allows us to demonstrate NoSQL injection where attackers pass 
 * objects (like {"$ne": null}) instead of strings to bypass checks.
 */
class NoSQLProvider {
    constructor() {
        this.filePath = NOSQL_FILE;
        this.data = { reviews: [], auditLogs: [] }; // Initial structure
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.filePath)) {
                this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            } else {
                this.save();
            }
            console.log(chalk.cyan('[NoSQL] Document Store Loaded'));
        } catch (e) {
            console.error('[NoSQL] Load error:', e);
        }
    }

    save() {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    }

    /**
     * Simulates MongoDB's find() with vulnerable query parsing.
     * Vulnerability: If 'query' is an object containing '$ne' or '$gt', 
     * this logic processes it, allowing logic bypass.
     */
    find(collection, query) {
        const docs = this.data[collection] || [];
        
        return docs.filter(doc => {
            let match = true;
            for (const key in query) {
                const searchVal = query[key];

                // VULNERABLE LOGIC: Handling MongoDB-style operators manually
                if (typeof searchVal === 'object' && searchVal !== null) {
                    if (searchVal.$ne !== undefined) {
                        if (doc[key] === searchVal.$ne) match = false;
                    }
                    if (searchVal.$gt !== undefined) {
                        if (doc[key] <= searchVal.$gt) match = false;
                    }
                    // ... other operators could be added
                } else {
                    // Standard exact match
                    if (doc[key] !== searchVal) match = false;
                }
            }
            return match;
        });
    }

    insert(collection, doc) {
        if (!this.data[collection]) this.data[collection] = [];
        doc._id = Math.random().toString(36).substr(2, 9);
        doc.timestamp = new Date();
        this.data[collection].push(doc);
        this.save();
        return doc;
    }
}

// ============================================================================
// 4. EXPORT & INITIALIZATION
// ============================================================================

// Initialize singletons
const legacyDB = new LegacyDB();
const noSQLDB = new NoSQLProvider();

/**
 * Main Database Helper
 * Controls connection lifecycles and provides access to different DB abstractions.
 */
const DatabaseManager = {
    // The safe ORM instance
    orm: sequelize,
    
    // The vulnerable raw SQL instance
    legacy: legacyDB,

    // The NoSQL document store
    nosql: noSQLDB,

    /**
     * Verifies connection to the main SQL database.
     */
    async connect() {
        try {
            await sequelize.authenticate();
            console.log(chalk.green('✔ [Sequelize] Database connection has been established successfully.'));
            
            // Sync models (handled in server startup, but defined here for reference)
            // await sequelize.sync(); 
            
        } catch (error) {
            console.error(chalk.red('✘ [Sequelize] Unable to connect to the database:'), error);
            process.exit(1);
        }
    },

    /**
     * Helper to close connections gracefully
     */
    async close() {
        await sequelize.close();
        legacyDB.db.close();
    }
};

module.exports = DatabaseManager;