const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { createUserValidation, handleValidationErrors } = require('../middleware/validation');

// @route   POST /api/users
// @desc    Create new user
// @access  Public
router.post('/', createUserValidation, handleValidationErrors, async (req, res) => {
    try {
        const { name, email, phone, age } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists'
            });
        }

        // Create new user
        const user = await User.create({
            name,
            email,
            phone,
            age
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                age: user.age,
                status: user.status,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Create user error:', error);

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists'
            });
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                error: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to create user. Please try again.'
        });
    }
});

// @route   GET /api/users
// @desc    Get all users
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { status, limit = 100, page = 1, sort = '-createdAt' } = req.query;

        // Build query
        const query = {};
        if (status) query.status = status;

        // Execute query with pagination
        const users = await User.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .select('-__v');

        const total = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            count: users.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: users
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users. Please try again.'
        });
    }
});

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-__v');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Get user error:', error);

        if (error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to fetch user. Please try again.'
        });
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Public
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
            data: { id: user._id }
        });

    } catch (error) {
        console.error('Delete user error:', error);

        if (error.kind === 'ObjectId') {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to delete user. Please try again.'
        });
    }
});

module.exports = router;
