const mongoose = require('mongoose');

const hireSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    worker_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Worker',
        required: true
    },
    status: {
        type: String,
        default: 'active'
    },
    hired_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Hire', hireSchema);
