const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { protect } = require('../middleware/auth');

// @route   GET /api/feedback
// @desc    Get feedback feed
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const posts = await Feedback.find()
            .populate('userId', 'name')
            .populate('comments.userId', 'name')
            .sort({ createdAt: -1 })
            .limit(100);

        res.status(200).json({
            success: true,
            count: posts.length,
            data: posts
        });
    } catch (error) {
        console.error('Get feedback error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load feedback'
        });
    }
});

// @route   POST /api/feedback
// @desc    Create feedback post
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Post content is required'
            });
        }

        const post = await Feedback.create({
            userId: req.user._id,
            content: content.trim()
        });

        await post.populate('userId', 'name');

        res.status(201).json({
            success: true,
            message: 'Post published',
            data: post
        });
    } catch (error) {
        console.error('Create feedback post error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to publish post'
        });
    }
});

// @route   PATCH /api/feedback/:id/like
// @desc    Toggle like on feedback post
// @access  Private
router.patch('/:id/like', protect, async (req, res) => {
    try {
        const post = await Feedback.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        const currentUserId = req.user._id.toString();
        const likeIndex = post.likes.findIndex((likeId) => likeId.toString() === currentUserId);

        let liked = false;
        if (likeIndex === -1) {
            post.likes.push(req.user._id);
            liked = true;
        } else {
            post.likes.splice(likeIndex, 1);
        }

        await post.save();

        res.status(200).json({
            success: true,
            liked,
            likesCount: post.likes.length
        });
    } catch (error) {
        console.error('Toggle feedback like error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update like'
        });
    }
});

// @route   POST /api/feedback/:id/comments
// @desc    Add comment to feedback post
// @access  Private
router.post('/:id/comments', protect, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Comment text is required'
            });
        }

        const post = await Feedback.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        post.comments.push({
            userId: req.user._id,
            text: text.trim()
        });

        await post.save();
        await post.populate('comments.userId', 'name');

        const newComment = post.comments[post.comments.length - 1];

        res.status(201).json({
            success: true,
            message: 'Comment added',
            data: newComment
        });
    } catch (error) {
        console.error('Add feedback comment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add comment'
        });
    }
});

module.exports = router;
