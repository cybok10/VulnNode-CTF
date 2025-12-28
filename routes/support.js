const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');

/**
 * Support Ticket API Routes
 * Contains intentional vulnerabilities:
 * - Stored XSS in ticket messages
 * - IDOR (view/update any ticket)
 * - SQL Injection in search
 * - Missing authorization checks
 */

// Create new support ticket
router.post('/create', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        const { subject, message, priority } = req.body;
        
        // VULNERABILITY: No input validation or sanitization (Stored XSS)
        const result = db.prepare(`
            INSERT INTO support_tickets (user_id, subject, message, priority, status)
            VALUES (?, ?, ?, ?, 'open')
        `).run(userId, subject, message, priority || 'medium');

        res.status(201).json({
            success: true,
            ticket_id: result.lastInsertRowid,
            message: 'Ticket created successfully',
            flag_hint: 'Try XSS payloads in ticket messages...'
        });
    } catch (error) {
        // VULNERABILITY: Verbose error messages
        res.status(500).json({ 
            success: false,
            error: error.message,
            params: req.body
        });
    }
});

// Get all tickets for current user
router.get('/my-tickets', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        
        const tickets = db.prepare(
            'SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC'
        ).all(userId);

        res.json({
            success: true,
            tickets: tickets,
            count: tickets.length
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get specific ticket - VULNERABILITY: IDOR
router.get('/:id', optionalAuth, (req, res) => {
    try {
        const ticketId = req.params.id;
        
        // VULNERABILITY: No authorization check - can view ANY ticket
        // VULNERABILITY: SQL Injection via string interpolation
        const query = `SELECT * FROM support_tickets WHERE id = ${ticketId}`;
        
        const ticket = db.prepare(query).get();

        if (!ticket) {
            return res.status(404).json({ 
                success: false,
                error: 'Ticket not found' 
            });
        }

        // Fetch ticket messages
        const messages = db.prepare(
            'SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC'
        ).all(ticketId);
        
        res.json({
            success: true,
            ticket: ticket,
            messages: messages
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message,
            query: `SELECT * FROM support_tickets WHERE id = ${req.params.id}` // Information disclosure
        });
    }
});

// Add message to ticket
router.post('/:id/reply', isAuthenticated, (req, res) => {
    try {
        const ticketId = req.params.id;
        const userId = req.user.id;
        const { message } = req.body;

        // VULNERABILITY: No validation - can reply to ANY ticket (IDOR)
        // VULNERABILITY: No XSS sanitization
        const result = db.prepare(`
            INSERT INTO ticket_messages (ticket_id, user_id, message)
            VALUES (?, ?, ?)
        `).run(ticketId, userId, message);

        // Update ticket timestamp
        db.prepare(
            "UPDATE support_tickets SET updated_at = datetime('now') WHERE id = ?"
        ).run(ticketId);

        res.json({
            success: true,
            message_id: result.lastInsertRowid,
            message: 'Reply posted successfully'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Update ticket status - VULNERABILITY: IDOR + SQLi
router.patch('/:id/status', (req, res) => {
    try {
        const ticketId = req.params.id;
        const { status } = req.body;
        
        // VULNERABILITY: No authentication or authorization check
        // VULNERABILITY: SQL Injection via string interpolation
        const query = `UPDATE support_tickets SET status = '${status}' WHERE id = ${ticketId}`;
        
        const result = db.prepare(query).run();

        res.json({
            success: true,
            message: 'Ticket status updated',
            changes: result.changes
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message,
            query: `UPDATE support_tickets SET status = '${req.body.status}' WHERE id = ${req.params.id}`
        });
    }
});

// Search tickets - VULNERABILITY: SQL Injection
router.get('/search/:query', optionalAuth, (req, res) => {
    try {
        const searchQuery = req.params.query;
        
        // VULNERABILITY: Direct SQL injection vulnerability
        const query = `
            SELECT * FROM support_tickets 
            WHERE subject LIKE '%${searchQuery}%' 
            OR message LIKE '%${searchQuery}%'
            ORDER BY created_at DESC
        `;
        
        const tickets = db.prepare(query).all();

        res.json({
            success: true,
            tickets: tickets,
            count: tickets.length,
            debug_query: query, // Information disclosure
            hint: 'Try SQL injection here... FLAG{support_sql_injection_master}'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message,
            query: `SELECT * FROM support_tickets WHERE subject LIKE '%${req.params.query}%'`,
            hint: 'SQL error? You\'re on the right track!'
        });
    }
});

// Delete ticket - VULNERABILITY: IDOR + Missing Auth
router.delete('/:id', (req, res) => {
    try {
        const ticketId = req.params.id;
        
        // VULNERABILITY: No authentication or authorization
        // Can delete ANY ticket
        const result = db.prepare(
            'DELETE FROM support_tickets WHERE id = ?'
        ).run(ticketId);

        // Delete associated messages
        db.prepare('DELETE FROM ticket_messages WHERE ticket_id = ?').run(ticketId);

        res.json({
            success: true,
            message: 'Ticket deleted',
            changes: result.changes
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Admin: Get all tickets
router.get('/admin/all', isAuthenticated, (req, res) => {
    try {
        // VULNERABILITY: Weak admin check
        if (!req.user.isAdmin && req.user.username !== 'admin') {
            return res.status(403).json({ 
                success: false,
                error: 'Admin access required',
                hint: '<!-- Try manipulating your session or cookie -->'
            });
        }

        const tickets = db.prepare(`
            SELECT t.*, u.username 
            FROM support_tickets t 
            JOIN users u ON t.user_id = u.id 
            ORDER BY t.created_at DESC
        `).all();

        res.json({
            success: true,
            tickets: tickets,
            count: tickets.length,
            flag: tickets.length > 0 ? 'FLAG{admin_ticket_access_achieved}' : null
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

module.exports = router;
