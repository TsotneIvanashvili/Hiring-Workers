const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    hourlyRate: {
        type: Number,
        required: true,
        min: [1, 'Rate must be positive']
    },
    skills: [{
        type: String
    }],
    rating: {
        type: Number,
        default: 5.0,
        min: 0,
        max: 5
    },
    availability: {
        type: String,
        enum: ['available', 'busy', 'unavailable'],
        default: 'available'
    },
    category: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: 'https://ui-avatars.com/api/?size=200&background=6366f1&color=fff'
    }
}, {
    timestamps: true
});

workerSchema.index({ category: 1 });
workerSchema.index({ hourlyRate: 1 });

module.exports = mongoose.model('Worker', workerSchema);
