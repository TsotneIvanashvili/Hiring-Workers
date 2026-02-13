const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: false
    },
    age: {
        type: Number,
        required: false
    },
    balance: {
        type: Number,
        default: 0
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'Users'  // Use 'Users' collection in userInfo database
});

module.exports = mongoose.model('User', userSchema);
