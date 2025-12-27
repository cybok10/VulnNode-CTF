const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/vuln_app.db');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Get All User Tickets
router.get('/tickets', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    
    db.all(`
        SELECT * FROM support_tickets 
        WHERE user_id = ?
        ORDER BY created_at DESC
    `, [userId], (err, tickets) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ tickets: tickets });
    });
});

// Get Single Ticket - IDOR VULNERABILITY
router.get('/tickets/:ticket_id', isAuthenticated, (req, res) => {
    const { ticket_id } = req.params;
    
    // VULNERABILITY: No ownership check
    // Any authenticated user can view any ticket
    
    db.get('SELECT * FROM support_tickets WHERE id = ?', [ticket_id], (err, ticket) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        // Get ticket messages
        db.all(`
            SELECT tm.*, u.username, u.avatar, u.isAdmin
            FROM ticket_messages tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.ticket_id = ?
            ORDER BY tm.created_at ASC
        `, [ticket_id], (err, messages) => {
            // VULNERABILITY: Exposing other users' tickets and messages
            res.json({
                ticket: ticket,
                messages: messages || []
            });
        });
    });
});

// Create New Ticket - STORED XSS
router.post('/tickets', isAuthenticated, (req, res) => {
    const { subject, message, category, priority } = req.body;
    const userId = req.session.user.id;
    
    // VULNERABILITY: No input sanitization - Stored XSS
    // subject and message stored without filtering
    
    if (!subject || !message) {
        return res.status(400).json({ error: 'Subject and message are required' });
    }
    
    // VULNERABILITY: User can set own priority (should be auto-assigned)
    const ticketPriority = priority || 'normal';
    
    db.run(`
        INSERT INTO support_tickets (
            user_id, subject, message, status, priority, category
        ) VALUES (?, ?, ?, 'open', ?, ?)
    `, [userId, subject, message, ticketPriority, category], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            message: 'Ticket created successfully',
            ticket_id: this.lastID,
            warning: 'Message may contain unfiltered HTML/JavaScript!'
        });
    });
});

// Reply to Ticket - STORED XSS
router.post('/tickets/:ticket_id/reply', isAuthenticated, (req, res) => {
    const { ticket_id } = req.params;
    const { message } = req.body;
    const userId = req.session.user.id;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    
    // VULNERABILITY: No ownership check on ticket
    // Anyone can reply to any ticket
    
    // VULNERABILITY: No input sanitization - Stored XSS
    db.run(`
        INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff_reply)
        VALUES (?, ?, ?, 0)
    `, [ticket_id, userId, message], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Update ticket status to 'open' if it was closed
        db.run(`
            UPDATE support_tickets 
            SET status = 'open', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [ticket_id]);
        
        res.json({
            message: 'Reply added',
            message_id: this.lastID
        });
    });
});

// Update Ticket Status
router.put('/tickets/:ticket_id/status', isAuthenticated, (req, res) => {
    const { ticket_id } = req.params;
    const { status, state_reason } = req.body;
    
    // VULNERABILITY: No ownership check
    // Any user can close/reopen any ticket
    
    const validStatuses = ['open', 'closed', 'pending'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    db.run(`
        UPDATE support_tickets 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [status, ticket_id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        res.json({ message: 'Ticket status updated' });
    });
});

// Admin: Get All Tickets
router.get('/admin/tickets', isAdmin, (req, res) => {
    const { status, priority, assigned_to, page = 1, limit = 20 } = req.query;
    
    let query = 'SELECT t.*, u.username, u.email FROM support_tickets t JOIN users u ON t.user_id = u.id WHERE 1=1';
    const params = [];
    
    if (status) {
        query += ' AND t.status = ?';
        params.push(status);
    }
    
    if (priority) {
        query += ' AND t.priority = ?';
        params.push(priority);
    }
    
    if (assigned_to) {
        query += ' AND t.assigned_to = ?';
        params.push(assigned_to);
    }
    
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * limit;
    params.push(parseInt(limit), offset);
    
    db.all(query, params, (err, tickets) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // VULNERABILITY: Exposing user PII (email)
        res.json({ tickets: tickets });
    });
});

// Admin: Assign Ticket
router.put('/admin/tickets/:ticket_id/assign', isAdmin, (req, res) => {
    const { ticket_id } = req.params;
    const { assigned_to } = req.body;
    
    // VULNERABILITY: No validation if assigned_to is actually an admin
    
    db.run(`
        UPDATE support_tickets 
        SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [assigned_to, ticket_id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ message: 'Ticket assigned' });
    });
});

// Admin: Reply to Ticket
router.post('/admin/tickets/:ticket_id/reply', isAdmin, (req, res) => {
    const { ticket_id } = req.params;
    const { message } = req.body;
    const adminId = req.session.user.id;
    
    // VULNERABILITY: Stored XSS even in admin replies
    db.run(`
        INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff_reply)
        VALUES (?, ?, ?, 1)
    `, [ticket_id, adminId, message], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Auto-update ticket status
        db.run(`
            UPDATE support_tickets 
            SET status = 'pending', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [ticket_id]);
        
        res.json({
            message: 'Admin reply sent',
            message_id: this.lastID
        });
    });
});

// Search Tickets - SQL INJECTION
router.get('/search', isAuthenticated, (req, res) => {
    const { q, status } = req.query;
    const userId = req.session.user.id;
    
    if (!q) {
        return res.status(400).json({ error: 'Search query required' });
    }
    
    // VULNERABILITY: SQL Injection in search query
    let query = `
        SELECT * FROM support_tickets 
        WHERE user_id = ${userId} 
        AND (subject LIKE '%${q}%' OR message LIKE '%${q}%')
    `;
    
    if (status) {
        query += ` AND status = '${status}'`;
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.all(query, (err, tickets) => {
        if (err) {
            // VULNERABILITY: Exposing SQL errors
            return res.status(500).json({ 
                error: err.message,
                query: query
            });
        }
        
        res.json({ tickets: tickets });
    });
});

// Get Ticket Statistics
router.get('/stats', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    
    db.all(`
        SELECT 
            status,
            COUNT(*) as count
        FROM support_tickets
        WHERE user_id = ?
        GROUP BY status
    `, [userId], (err, stats) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ statistics: stats });
    });
});

// Admin: Get Ticket Statistics
router.get('/admin/stats', isAdmin, (req, res) => {
    db.all(`
        SELECT 
            status,
            priority,
            COUNT(*) as count
        FROM support_tickets
        GROUP BY status, priority
    `, (err, stats) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ statistics: stats });
    });
});

// VULNERABILITY: Delete Ticket (IDOR)
router.delete('/tickets/:ticket_id', isAuthenticated, (req, res) => {
    const { ticket_id } = req.params;
    
    // VULNERABILITY: No ownership check
    // Any user can delete any ticket
    
    db.run('DELETE FROM support_tickets WHERE id = ?', [ticket_id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        // Delete associated messages
        db.run('DELETE FROM ticket_messages WHERE ticket_id = ?', [ticket_id]);
        
        res.json({ message: 'Ticket deleted' });
    });
});

// VULNERABILITY: Export Tickets (Information Disclosure)
router.get('/export', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    
    db.all(`
        SELECT t.*, u.username, u.email, u.phone
        FROM support_tickets t
        JOIN users u ON t.user_id = u.id
        WHERE t.user_id = ?
    `, [userId], (err, tickets) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // VULNERABILITY: Exposing PII in export
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=tickets.json');
        res.json({
            tickets: tickets,
            exported_at: new Date().toISOString(),
            user_info: req.session.user // Exposing session data
        });
    });
});

// VULNERABILITY: Ticket ID Enumeration
router.get('/check/:ticket_id', (req, res) => {
    const { ticket_id } = req.params;
    
    // VULNERABILITY: No authentication required
    // Can enumerate valid ticket IDs
    
    db.get('SELECT id, status FROM support_tickets WHERE id = ?', [ticket_id], (err, ticket) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!ticket) {
            return res.json({ exists: false });
        }
        
        // VULNERABILITY: Leaking ticket existence and status
        res.json({
            exists: true,
            status: ticket.status,
            ticket_id: ticket.id
        });
    });
});

// Upload Ticket Attachment (placeholder for file upload vuln)
router.post('/tickets/:ticket_id/attach', isAuthenticated, (req, res) => {
    // This will be implemented with file upload vulnerabilities
    res.json({ 
        message: 'File upload endpoint',
        note: 'Will be implemented with unrestricted file upload vulnerability'
    });
});

// Admin: Bulk Update Tickets
router.post('/admin/bulk-update', isAdmin, (req, res) => {
    const { ticket_ids, status, priority, assigned_to } = req.body;
    
    if (!ticket_ids || !Array.isArray(ticket_ids)) {
        return res.status(400).json({ error: 'ticket_ids array required' });
    }
    
    // VULNERABILITY: No validation on ticket_ids
    // Can manipulate any tickets
    
    const updates = [];
    const params = [];
    
    if (status) {
        updates.push('status = ?');
        params.push(status);
    }
    
    if (priority) {
        updates.push('priority = ?');
        params.push(priority);
    }
    
    if (assigned_to) {
        updates.push('assigned_to = ?');
        params.push(assigned_to);
    }
    
    if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates specified' });
    }
    
    const placeholders = ticket_ids.map(() => '?').join(',');
    const query = `UPDATE support_tickets SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;
    
    db.run(query, [...params, ...ticket_ids], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            message: 'Tickets updated',
            affected: this.changes
        });
    });
});

module.exports = router;