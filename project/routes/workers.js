const express = require('express');
const db = require('../db');

const router = express.Router();

// Get all workers or filter by category
router.get('/', (req, res) => {
    const { category, search } = req.query;

    let query = 'SELECT * FROM workers';
    const params = [];
    const conditions = [];

    if (category && category !== 'All') {
        conditions.push('category = ?');
        params.push(category);
    }

    if (search) {
        conditions.push('(name LIKE ? OR description LIKE ? OR category LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY rating DESC';

    const workers = db.prepare(query).all(...params);
    res.json(workers);
});

// Get categories
router.get('/categories', (req, res) => {
    const categories = db.prepare('SELECT DISTINCT category FROM workers ORDER BY category').all();
    res.json(categories.map(c => c.category));
});

// Get single worker
router.get('/:id', (req, res) => {
    const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id);
    if (!worker) return res.status(404).json({ error: 'Worker not found.' });
    res.json(worker);
});

module.exports = router;
