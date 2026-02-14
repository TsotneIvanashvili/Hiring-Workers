const { body, validationResult } = require('express-validator');

// Validation rules for creating a user
const createUserValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail(),

    body('phone')
        .optional()
        .trim()
        .matches(/^[0-9\s\-\+\(\)]+$/).withMessage('Invalid phone number format'),

    body('age')
        .optional()
        .isInt({ min: 1, max: 150 }).withMessage('Age must be between 1 and 150')
        .toInt()
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }

    next();
};

module.exports = {
    createUserValidation,
    handleValidationErrors
};
