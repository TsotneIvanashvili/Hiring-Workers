const express = require('express');
const Hire = require('../models/Hire');
const User = require('../models/User');
const Worker = require('../models/Worker');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's recent hires
router.get('/', authenticateToken, async (req, res) => {
    try {
        const hires = await Hire.find({ user_id: req.user.id })
            .populate('worker_id')
            .sort({ hired_at: -1 });

        const formattedHires = hires.map(hire => ({
            id: hire._id,
            status: hire.status,
            hired_at: hire.hired_at,
            worker_id: hire.worker_id._id,
            worker_name: hire.worker_id.name,
            category: hire.worker_id.category,
            hourly_rate: hire.worker_id.hourly_rate,
            rating: hire.worker_id.rating,
            location: hire.worker_id.location
        }));

        res.json(formattedHires);
    } catch (error) {
        console.error('Get hires error:', error);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// Hire a worker
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { worker_id } = req.body;

        if (!worker_id) {
            return res.status(400).json({ error: 'Worker ID is required.' });
        }

        const worker = await Worker.findById(worker_id);
        if (!worker) {
            return res.status(404).json({ error: 'Worker not found.' });
        }

        // Check if already hired (active)
        const existing = await Hire.findOne({
            user_id: req.user.id,
            worker_id: worker_id,
            status: 'active'
        });

        if (existing) {
            return res.status(400).json({ error: 'You have already hired this worker.' });
        }

        // Check user balance
        const user = await User.findById(req.user.id);
        if ((user.balance || 0) < worker.hourly_rate) {
            return res.status(400).json({
                error: `Insufficient funds. You need $${worker.hourly_rate.toFixed(2)} but have $${(user.balance || 0).toFixed(2)}. Please add funds first.`
            });
        }

        // Deduct funds and create hire
        user.balance -= worker.hourly_rate;
        await user.save();

        const hire = new Hire({
            user_id: req.user.id,
            worker_id: worker_id
        });

        await hire.save();

        res.json({
            message: `Successfully hired ${worker.name}! $${worker.hourly_rate.toFixed(2)} deducted.`,
            hire_id: hire._id,
            balance: user.balance
        });
    } catch (error) {
        console.error('Hire worker error:', error);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// End a hire
router.patch('/:id/end', authenticateToken, async (req, res) => {
    try {
        const hire = await Hire.findOne({ _id: req.params.id, user_id: req.user.id });
        if (!hire) return res.status(404).json({ error: 'Hire not found.' });

        hire.status = 'completed';
        await hire.save();

        res.json({ message: 'Hire ended successfully.' });
    } catch (error) {
        console.error('End hire error:', error);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

module.exports = router;
