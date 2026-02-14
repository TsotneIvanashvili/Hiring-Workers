const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { protect } = require('../middleware/auth');
const MAX_IMAGE_SIZE_CHARS = 5 * 1024 * 1024;
const HTTP_IMAGE_URL_PATTERN = /^https?:\/\/\S+$/i;
const DATA_IMAGE_URL_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;

function isValidFeedbackImage(image) {
    if (!image || typeof image !== 'string') {
        return false;
    }

    const value = image.trim();
    if (!value || value.length > MAX_IMAGE_SIZE_CHARS) {
        return false;
    }

    return HTTP_IMAGE_URL_PATTERN.test(value) || DATA_IMAGE_URL_PATTERN.test(value);
}

// @route   GET /api/feedback
// @desc    Get feedback feed
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const currentUserId = req.user._id.toString();
        const posts = await Feedback.find()
            .populate('userId', 'name email')
            .populate('comments.userId', 'name email')
            .sort({ createdAt: -1 })
            .limit(100);

        const feed = posts.map((post) => {
            const postObject = post.toObject();
            const ownerId = postObject.userId && typeof postObject.userId === 'object'
                ? postObject.userId._id
                : postObject.userId;
            postObject.canDelete = String(ownerId || '') === currentUserId;
            return postObject;
        });

        res.status(200).json({
            success: true,
            count: feed.length,
            data: feed
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
        const { content, image } = req.body;
        const trimmedContent = String(content || '').trim();
        const trimmedImage = typeof image === 'string' ? image.trim() : '';

        if (!trimmedContent) {
            return res.status(400).json({
                success: false,
                error: 'Post content is required'
            });
        }

        if (trimmedImage && !isValidFeedbackImage(trimmedImage)) {
            return res.status(400).json({
                success: false,
                error: 'Image must be a valid image URL or uploaded image data'
            });
        }

        const payload = {
            userId: req.user._id,
            content: trimmedContent
        };

        if (trimmedImage) {
            payload.image = trimmedImage;
        }

        const post = await Feedback.create(payload);

        await post.populate('userId', 'name email');
        const postObject = post.toObject();
        postObject.canDelete = true;

        res.status(201).json({
            success: true,
            message: 'Post published',
            data: postObject
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

// @route   DELETE /api/feedback/:id
// @desc    Delete feedback post (owner only)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const post = await Feedback.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        if (post.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You can only delete your own posts'
            });
        }

        await Feedback.deleteOne({ _id: post._id });

        res.status(200).json({
            success: true,
            message: 'Post deleted'
        });
    } catch (error) {
        console.error('Delete feedback post error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete post'
        });
    }
});

module.exports = router;
