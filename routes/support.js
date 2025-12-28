const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { isAuthenticated } = require('../middleware/auth');

// ============================================================
// SUPPORT TICKET API ROUTES
// ============================================================
// Support system with XSS, IDOR, and SQL Injection vulnerabilities

// --- CREATE NEW SUPPORT TICKET ---
router.post('/create', isAuthenticated, (req, res) => {
    try {
        const { subject, message, priority } = req.body;

        // VULNERABILITY: No input sanitization - Stored XSS
        // User can inject JavaScript in subject/message
        if (!subject || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Subject and message are required' 
            });
        }

        // Generate ticket number
        const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        // Insert ticket (no sanitization)
        const result = db.prepare(`
            INSERT INTO support_tickets (user_id, ticket_number, subject, message, priority, status)
            VALUES (?, ?, ?, ?, ?, 'open')
        `).run(req.user.id, ticketNumber, subject, message, priority || 'medium');

        // Log ticket creation
        db.prepare(`
            INSERT INTO logs (user_id, action, details)
            VALUES (?, 'ticket_created', ?)
        `).run(req.user.id, `Ticket ${ticketNumber} created`);

        res.json({
            success: true,
            message: 'Support ticket created successfully',
            ticketId: result.lastInsertRowid,
            ticketNumber: ticketNumber
        });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Unable to create ticket',
            error: error.message, // VULNERABILITY: Error disclosure
            stack: error.stack     // VULNERABILITY: Stack trace exposure
        });
    }
});

// --- GET ALL TICKETS (USER) ---
router.get('/tickets', isAuthenticated, (req, res) => {
    try {
        const tickets = db.prepare(`
            SELECT * FROM support_tickets 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `).all(req.user.id);

        res.json({
            success: true,
            tickets: tickets
        });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// --- GET SINGLE TICKET ---
router.get('/ticket/:id', isAuthenticated, (req, res) => {
    try {
        const ticketId = req.params.id;

        // VULNERABILITY: IDOR - No ownership validation
        // User can view any ticket by changing the ID
        const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId);

        if (!ticket) {
            return res.status(404).json({ 
                success: false, 
                message: 'Ticket not found' 
            });
        }

        // Get messages
        const messages = db.prepare(`
            SELECT * FROM ticket_messages 
            WHERE ticket_id = ? 
            ORDER BY created_at ASC
        `).all(ticketId);

        res.json({
            success: true,
            ticket: ticket,
            messages: messages
        });
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// --- ADD MESSAGE TO TICKET ---
router.post('/ticket/:id/message', isAuthenticated, (req, res) => {
    try {
        const ticketId = req.params.id;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Message is required' 
            });
        }

        // VULNERABILITY: IDOR - No ownership check on ticket
        // User can add messages to other users' tickets
        const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId);

        if (!ticket) {
            return res.status(404).json({ 
                success: false, 
                message: 'Ticket not found' 
            });
        }

        // VULNERABILITY: Stored XSS - No message sanitization
        db.prepare(`
            INSERT INTO ticket_messages (ticket_id, user_id, message, is_admin)
            VALUES (?, ?, ?, 0)
        `).run(ticketId, req.user.id, message);

        // Update ticket updated_at
        db.prepare('UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(ticketId);

        res.json({
            success: true,
            message: 'Message added successfully'
        });
    } catch (error) {
        console.error('Add message error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// --- SEARCH TICKETS (SQL Injection Vulnerable) ---
router.get('/search', isAuthenticated, (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ 
                success: false, 
                message: 'Search query is required' 
            });
        }

        // VULNERABILITY: SQL Injection
        // Direct string concatenation without parameterization
        const sql = `
            SELECT * FROM support_tickets 
            WHERE user_id = ${req.user.id} 
            AND (subject LIKE '%${query}%' OR message LIKE '%${query}%')
            ORDER BY created_at DESC
        `;

        const tickets = db.prepare(sql).all();

        res.json({
            success: true,
            tickets: tickets,
            query: query
        });
    } catch (error) {
        console.error('Search tickets error:', error);
        // VULNERABILITY: Detailed SQL error exposure
        res.status(500).json({ 
            success: false, 
            message: 'Search failed',
            error: error.message,
            query: req.query.query,
            sqlError: error.code // Exposes SQL error codes
        });
    }
});

// --- CLOSE TICKET ---
router.post('/ticket/:id/close', isAuthenticated, (req, res) => {
    try {
        const ticketId = req.params.id;

        // VULNERABILITY: IDOR - Can close other users' tickets
        const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId);

        if (!ticket) {
            return res.status(404).json({ 
                success: false, 
                message: 'Ticket not found' 
            });
        }

        db.prepare('UPDATE support_tickets SET status = ? WHERE id = ?').run('closed', ticketId);

        res.json({
            success: true,
            message: 'Ticket closed successfully'
        });
    } catch (error) {
        console.error('Close ticket error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// --- UPDATE TICKET PRIORITY ---
router.post('/ticket/:id/priority', isAuthenticated, (req, res) => {
    try {
        const ticketId = req.params.id;
        const { priority } = req.body;

        if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid priority value' 
            });
        }

        // VULNERABILITY: IDOR - Can change priority of any ticket
        db.prepare('UPDATE support_tickets SET priority = ? WHERE id = ?').run(priority, ticketId);

        res.json({
            success: true,
            message: 'Priority updated successfully'
        });
    } catch (error) {
        console.error('Update priority error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// --- ADMIN: GET ALL TICKETS ---
router.get('/admin/tickets', isAuthenticated, (req, res) => {
    try {
        // VULNERABILITY: Weak admin check
        if (req.user.username !== 'admin' && !req.user.isAdmin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const { status, priority } = req.query;
        let sql = `
            SELECT t.*, u.username, u.email 
            FROM support_tickets t
            JOIN users u ON t.user_id = u.id
        `;

        const params = [];
        const conditions = [];

        if (status) {
            conditions.push('t.status = ?');
            params.push(status);
        }

        if (priority) {
            conditions.push('t.priority = ?');
            params.push(priority);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY t.created_at DESC';

        const tickets = db.prepare(sql).all(...params);

        res.json({
            success: true,
            tickets: tickets
        });
    } catch (error) {
        console.error('Admin get tickets error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// --- ADMIN: REPLY TO TICKET ---
router.post('/admin/ticket/:id/reply', isAuthenticated, (req, res) => {
    try {
        // VULNERABILITY: Weak admin check
        if (req.user.username !== 'admin' && !req.user.isAdmin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const ticketId = req.params.id;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Message is required' 
            });
        }

        // VULNERABILITY: Stored XSS in admin messages
        db.prepare(`
            INSERT INTO ticket_messages (ticket_id, user_id, message, is_admin)
            VALUES (?, ?, ?, 1)
        `).run(ticketId, req.user.id, message);

        // Update ticket status and timestamp
        db.prepare(`
            UPDATE support_tickets 
            SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(ticketId);

        res.json({
            success: true,
            message: 'Reply sent successfully'
        });
    } catch (error) {
        console.error('Admin reply error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// --- DELETE TICKET (ADMIN) ---
router.delete('/admin/ticket/:id', isAuthenticated, (req, res) => {
    try {
        // VULNERABILITY: Weak admin check via query parameter
        if (req.query.admin_key !== 'delete123' && req.user.username !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin access required' 
            });
        }

        const ticketId = req.params.id;

        // Delete messages first
        db.prepare('DELETE FROM ticket_messages WHERE ticket_id = ?').run(ticketId);
        
        // Delete ticket
        db.prepare('DELETE FROM support_tickets WHERE id = ?').run(ticketId);

        res.json({
            success: true,
            message: 'Ticket deleted successfully'
        });
    } catch (error) {
        console.error('Delete ticket error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;