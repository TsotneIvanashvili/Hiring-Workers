const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    hourly_rate: {
        type: Number,
        required: true
    },
    rating: {
        type: Number,
        default: 4.5
    },
    avatar: {
        type: String
    },
    location: {
        type: String,
        default: 'Available Nationwide'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Worker', workerSchema);
