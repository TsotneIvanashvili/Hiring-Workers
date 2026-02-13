const express = require('express');
const Post = require('../models/Post');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all posts (public)
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        let posts;

        if (category && category !== 'All') {
            posts = await Post.find({ category }).sort({ created_at: -1 });
        } else {
            posts = await Post.find().sort({ created_at: -1 });
        }

        res.json(posts);
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// Create a post (authenticated)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, content, category } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required.' });
        }

        const post = new Post({
            user_id: req.user.id,
            username: req.user.username,
            title,
            content,
            category: category || 'General'
        });

        await post.save();
        res.json(post);
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// Delete a post (only by owner)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found.' });
        if (post.user_id.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized.' });

        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: 'Post deleted.' });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

module.exports = router;
