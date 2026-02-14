const mongoose = require('mongoose');

const feedbackCommentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: [true, 'Comment is required'],
        trim: true,
        maxlength: [400, 'Comment cannot exceed 400 characters']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    _id: true
});

const feedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: [true, 'Post content is required'],
        trim: true,
        maxlength: [1500, 'Post content cannot exceed 1500 characters']
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [feedbackCommentSchema]
}, {
    timestamps: true,
    collection: 'feedback_posts'
});

feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
