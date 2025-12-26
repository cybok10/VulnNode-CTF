const libxmljs = require('libxmljs2');

const parseXML = (xmlData) => {
    try {
        // VULNERABILITY: 'noent: true' enables external entity expansion.
        // This allows attackers to define entities that reference local files (file:///etc/passwd).
        const doc = libxmljs.parseXml(xmlData, {
            noent: true, 
            nocdata: true
        });
        return doc;
    } catch (e) {
        console.error("XML Parsing Error:", e.message);
        throw new Error("Invalid XML Format");
    }
};

module.exports = { parseXML };