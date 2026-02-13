const express = require('express');
const Worker = require('../models/Worker');

const router = express.Router();

// Get all workers or filter by category
router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = {};

        if (category && category !== 'All') {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        const workers = await Worker.find(query).sort({ rating: -1 });
        res.json(workers);
    } catch (error) {
        console.error('Get workers error:', error);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// Get categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await Worker.distinct('category');
        res.json(categories.sort());
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// Get single worker
router.get('/:id', async (req, res) => {
    try {
        const worker = await Worker.findById(req.params.id);
        if (!worker) return res.status(404).json({ error: 'Worker not found.' });
        res.json(worker);
    } catch (error) {
        console.error('Get worker error:', error);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

module.exports = router;
