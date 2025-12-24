module.exports = {
    // VULNERABILITY: Weak, hardcoded JWT secret
    JWT_SECRET: "vuln_node_ctf_super_secret_key_123",
    
    // VULNERABILITY: Admin credentials committed to code
    ADMIN_USER: "admin",
    ADMIN_PASS: "admin123", // Weak password
    
    // VULNERABILITY: Database configuration exposed
    DB_PATH: "./database/vuln_app.db",
    
    // Flag for finding this file
    FLAG: "FLAG{hardcoded_secrets_in_config_file}"
};