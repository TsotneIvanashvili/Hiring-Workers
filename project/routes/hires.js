const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's recent hires
router.get('/', authenticateToken, (req, res) => {
    const hires = db.prepare(`
        SELECT h.id, h.status, h.hired_at,
               w.id as worker_id, w.name as worker_name, w.category,
               w.hourly_rate, w.rating, w.location
        FROM hires h
        JOIN workers w ON h.worker_id = w.id
        WHERE h.user_id = ?
        ORDER BY h.hired_at DESC
    `).all(req.user.id);
    res.json(hires);
});

// Hire a worker
router.post('/', authenticateToken, (req, res) => {
    const { worker_id } = req.body;

    if (!worker_id) {
        return res.status(400).json({ error: 'Worker ID is required.' });
    }

    const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(worker_id);
    if (!worker) {
        return res.status(404).json({ error: 'Worker not found.' });
    }

    // Check if already hired (active)
    const existing = db.prepare(
        'SELECT * FROM hires WHERE user_id = ? AND worker_id = ? AND status = ?'
    ).get(req.user.id, worker_id, 'active');

    if (existing) {
        return res.status(400).json({ error: 'You have already hired this worker.' });
    }

    // Check user balance
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
    if ((user.balance || 0) < worker.hourly_rate) {
        return res.status(400).json({
            error: `Insufficient funds. You need $${worker.hourly_rate.toFixed(2)} but have $${(user.balance || 0).toFixed(2)}. Please add funds first.`
        });
    }

    // Deduct funds and create hire
    const hireTransaction = db.transaction(() => {
        db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(worker.hourly_rate, req.user.id);
        const result = db.prepare(
            'INSERT INTO hires (user_id, worker_id) VALUES (?, ?)'
        ).run(req.user.id, worker_id);
        return result;
    });

    const result = hireTransaction();
    const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);

    res.json({
        message: `Successfully hired ${worker.name}! $${worker.hourly_rate.toFixed(2)} deducted.`,
        hire_id: result.lastInsertRowid,
        balance: updatedUser.balance
    });
});

// End a hire
router.patch('/:id/end', authenticateToken, (req, res) => {
    const hire = db.prepare('SELECT * FROM hires WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!hire) return res.status(404).json({ error: 'Hire not found.' });

    db.prepare('UPDATE hires SET status = ? WHERE id = ?').run('completed', req.params.id);
    res.json({ message: 'Hire ended successfully.' });
});

module.exports = router;
