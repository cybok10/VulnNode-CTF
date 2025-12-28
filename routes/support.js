const express = require('express');
const router = express.Router();
const db = require('../database/db');

/**
 * Support Ticket API Routes
 * Contains intentional vulnerabilities:
 * - Stored XSS in ticket messages
 * - IDOR (view/update any ticket)
 * - SQL Injection in search
 * - Missing authentication checks
 */

// Create new support ticket
router.post('/create', (req, res) => {
    try {
        const userId = req.session?.userId;
        
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { subject, message, priority } = req.body;
        
        // VULNERABILITY: No input validation or sanitization (XSS)
        const query = `
            INSERT INTO support_tickets (user_id, subject, message, priority, status, created_at)
            VALUES (?, ?, ?, ?, 'open', datetime('now'))
        `;

        db.run(query, [userId, subject, message, priority || 'medium'], function(err) {
            if (err) {
                // VULNERABILITY: Verbose error messages
                return res.status(500).json({ 
                    error: err.message,
                    query: query,
                    params: [userId, subject, message, priority]
                });
            }

            res.status(201).json({
                success: true,
                ticket_id: this.lastID,
                message: 'Ticket created successfully',
                flag_hint: 'Check for XSS in ticket messages...'
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all tickets for current user
router.get('/my-tickets', (req, res) => {
    try {
        const userId = req.session?.userId;
        
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const query = 'SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC';
        
        db.all(query, [userId], (err, tickets) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                success: true,
                tickets: tickets || [],
                count: tickets?.length || 0
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific ticket - VULNERABILITY: IDOR
router.get('/:id', (req, res) => {
    try {
        const ticketId = req.params.id;
        
        // VULNERABILITY: No authorization check - can view ANY ticket
        const query = `SELECT * FROM support_tickets WHERE id = ${ticketId}`; // SQL Injection
        
        db.get(query, [], (err, ticket) => {
            if (err) {
                return res.status(500).json({ 
                    error: err.message,
                    query: query // Information disclosure
                });
            }

            if (!ticket) {
                return res.status(404).json({ error: 'Ticket not found' });
            }

            // Fetch ticket messages
            db.all('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC', [ticketId], (err, messages) => {
                res.json({
                    success: true,
                    ticket: ticket,
                    messages: messages || []
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add message to ticket
router.post('/:id/reply', (req, res) => {
    try {
        const ticketId = req.params.id;
        const userId = req.session?.userId;
        const { message } = req.body;
        
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // VULNERABILITY: No validation - can reply to ANY ticket (IDOR)
        // VULNERABILITY: No XSS sanitization
        const query = `
            INSERT INTO ticket_messages (ticket_id, user_id, message, created_at)
            VALUES (?, ?, ?, datetime('now'))
        `;

        db.run(query, [ticketId, userId, message], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Update ticket timestamp
            db.run('UPDATE support_tickets SET updated_at = datetime(\'now\') WHERE id = ?', [ticketId]);

            res.json({
                success: true,
                message_id: this.lastID,
                message: 'Reply posted successfully'
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update ticket status - VULNERABILITY: IDOR
router.patch('/:id/status', (req, res) => {
    try {
        const ticketId = req.params.id;
        const { status } = req.body;
        
        // VULNERABILITY: No authentication or authorization check
        // Anyone can close ANY ticket
        const query = `UPDATE support_tickets SET status = '${status}' WHERE id = ${ticketId}`; // SQL Injection
        
        db.run(query, [], function(err) {
            if (err) {
                return res.status(500).json({ 
                    error: err.message,
                    query: query
                });
            }

            res.json({
                success: true,
                message: 'Ticket status updated',
                changes: this.changes
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search tickets - VULNERABILITY: SQL Injection
router.get('/search/:query', (req, res) => {
    try {
        const searchQuery = req.params.query;
        
        // VULNERABILITY: Direct SQL injection
        const query = `
            SELECT * FROM support_tickets 
            WHERE subject LIKE '%${searchQuery}%' 
            OR message LIKE '%${searchQuery}%'
            ORDER BY created_at DESC
        `;
        
        db.all(query, [], (err, tickets) => {
            if (err) {
                return res.status(500).json({ 
                    error: err.message,
                    query: query,
                    hint: 'Try SQL injection here... FLAG{support_sql_injection_master}'
                });
            }

            res.json({
                success: true,
                tickets: tickets || [],
                count: tickets?.length || 0
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete ticket - VULNERABILITY: IDOR + Missing Auth
router.delete('/:id', (req, res) => {
    try {
        const ticketId = req.params.id;
        
        // VULNERABILITY: No authentication or authorization
        // Can delete ANY ticket
        db.run('DELETE FROM support_tickets WHERE id = ?', [ticketId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Delete associated messages
            db.run('DELETE FROM ticket_messages WHERE ticket_id = ?', [ticketId]);

            res.json({
                success: true,
                message: 'Ticket deleted',
                changes: this.changes
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Get all tickets
router.get('/admin/all', (req, res) => {
    try {
        // VULNERABILITY: Weak admin check
        if (req.session?.user?.username !== 'admin') {
            return res.status(403).json({ 
                error: 'Admin access required',
                hint: '<!-- Manipulate your session cookie -->'
            });
        }

        const query = 'SELECT t.*, u.username FROM support_tickets t JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC';
        
        db.all(query, [], (err, tickets) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                success: true,
                tickets: tickets || [],
                count: tickets?.length || 0,
                flag: tickets?.length > 5 ? 'FLAG{admin_ticket_access_achieved}' : null
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
