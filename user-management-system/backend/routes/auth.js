const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendRegistrationEmail, sendLoginEmail } = require('../utils/mailer');
const MAX_AVATAR_SIZE_CHARS = 5 * 1024 * 1024;
const HTTP_IMAGE_URL_PATTERN = /^https?:\/\/\S+$/i;
const DATA_IMAGE_URL_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;

function isValidAvatar(avatar) {
    if (!avatar || typeof avatar !== 'string') {
        return false;
    }

    const value = avatar.trim();
    if (!value || value.length > MAX_AVATAR_SIZE_CHARS) {
        return false;
    }

    return HTTP_IMAGE_URL_PATTERN.test(value) || DATA_IMAGE_URL_PATTERN.test(value);
}

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, age, avatar } = req.body;
        const trimmedAvatar = typeof avatar === 'string' ? avatar.trim() : '';

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User already exists with this email'
            });
        }

        if (trimmedAvatar && !isValidAvatar(trimmedAvatar)) {
            return res.status(400).json({
                success: false,
                error: 'Avatar must be a valid image URL or uploaded image data'
            });
        }

        // Create user
        const userPayload = {
            name,
            email,
            password,
            phone,
            age
        };

        if (trimmedAvatar) {
            userPayload.avatar = trimmedAvatar;
        }

        const user = await User.create(userPayload);
        const token = generateToken(user._id);

        sendRegistrationEmail({
            email: user.email,
            name: user.name
        });

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                balance: user.balance
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Registration failed'
        });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide email and password'
            });
        }

        // Get user with password
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const token = generateToken(user._id);

        // Send login email asynchronously so login is never blocked
        sendLoginEmail({
            email: user.email,
            name: user.name
        });

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                balance: user.balance
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
    res.status(200).json({
        success: true,
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            avatar: req.user.avatar,
            balance: req.user.balance,
            phone: req.user.phone,
            age: req.user.age
        }
    });
});

// @route   POST /api/auth/add-funds
// @desc    Add funds to user balance
// @access  Private
router.post('/add-funds', protect, async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid amount'
            });
        }

        req.user.balance += amount;
        await req.user.save();

        res.status(200).json({
            success: true,
            message: `$${amount} added to your balance`,
            balance: req.user.balance
        });
    } catch (error) {
        console.error('Add funds error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add funds'
        });
    }
});

module.exports = router;
