

module.exports = {
    // Weak secret for JWT signing (Vulnerability: Weak Key / Brute-forceable)
    jwtSecret: 'secret123',
    
    // Admin Session Token for the Bot (Vulnerability: Hardcoded Admin Creds)
    adminToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwiaXNBZG1pbiI6dHJ1ZX0.SignatureHere',
    
     ADMIN_USER: "admin",
    ADMIN_PASS: "admin123", // Weak password
    
    // Flag for the Admin Bot to hold
    flagXSS: 'CTF{xss_chained_to_local_file_read}',
    
    // DB Path
    dbPath: './database/vuln_app.db'
};