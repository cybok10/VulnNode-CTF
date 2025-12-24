const crypto = require('crypto');
const nodeSerialize = require('node-serialize');

module.exports = {
    // VULNERABILITY: MD5 is broken and allows collision attacks / rainbow table lookups
    md5: (string) => {
        return crypto.createHash('md5').update(string).digest('hex');
    },

    // VULNERABILITY: Insecure Deserialization leading to RCE
    // If user input is passed here, they can execute arbitrary code
    unserialize: (obj) => {
        try {
            return nodeSerialize.unserialize(obj);
        } catch (e) {
            console.error("Deserialization error:", e);
            return null;
        }
    },

    // A helper to "sanitize" input that doesn't actually sanitize much
    // VULNERABILITY: Weak sanitization allows XSS
    weakSanitize: (input) => {
        if (!input) return '';
        // Only removes <script> tags, but leaves <img onerror=...>
        return input.replace(/<script>/gi, '').replace(/<\/script>/gi, '');
    }
};