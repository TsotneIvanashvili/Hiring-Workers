const express = require('express');
const router = express.Router();
const Hire = require('../models/Hire');
const Worker = require('../models/Worker');
const { protect } = require('../middleware/auth');

// @route   POST /api/hires
// @desc    Hire a worker
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { workerId } = req.body;

        if (!workerId) {
            return res.status(400).json({
                success: false,
                error: 'Worker ID is required'
            });
        }

        // Get worker
        const worker = await Worker.findById(workerId);

        if (!worker) {
            return res.status(404).json({
                success: false,
                error: 'Worker not found'
            });
        }

        // Check if user has sufficient balance
        if (req.user.balance < worker.hourlyRate) {
            return res.status(400).json({
                success: false,
                error: `Insufficient funds. You need $${worker.hourlyRate} but only have $${req.user.balance}`
            });
        }

        // Deduct from balance
        req.user.balance -= worker.hourlyRate;
        await req.user.save();

        // Create hire record
        const hire = await Hire.create({
            userId: req.user._id,
            workerId: worker._id,
            amount: worker.hourlyRate
        });

        res.status(201).json({
            success: true,
            message: `Successfully hired ${worker.name}`,
            balance: req.user.balance,
            data: hire
        });

    } catch (error) {
        console.error('Hire worker error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to hire worker'
        });
    }
});

// @route   GET /api/hires
// @desc    Get user's hire history
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const hires = await Hire.find({ userId: req.user._id })
            .populate('workerId', 'name title hourlyRate category')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: hires.length,
            data: hires
        });

    } catch (error) {
        console.error('Get hires error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hire history'
        });
    }
});

// @route   PATCH /api/hires/:id/complete
// @desc    Mark hire as completed
// @access  Private
router.patch('/:id/complete', protect, async (req, res) => {
    try {
        const hire = await Hire.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!hire) {
            return res.status(404).json({
                success: false,
                error: 'Hire not found'
            });
        }

        hire.status = 'completed';
        await hire.save();

        res.status(200).json({
            success: true,
            message: 'Hire marked as completed',
            data: hire
        });

    } catch (error) {
        console.error('Complete hire error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete hire'
        });
    }
});

module.exports = router;
