const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all posts (public)
router.get('/', (req, res) => {
    const { category } = req.query;
    let posts;
    if (category && category !== 'All') {
        posts = db.prepare('SELECT * FROM posts WHERE category = ? ORDER BY created_at DESC').all(category);
    } else {
        posts = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
    }
    res.json(posts);
});

// Create a post (authenticated)
router.post('/', authenticateToken, (req, res) => {
    const { title, content, category } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required.' });
    }

    const result = db.prepare(
        'INSERT INTO posts (user_id, username, title, content, category) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, req.user.username, title, content, category || 'General');

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
    res.json(post);
});

// Delete a post (only by owner)
router.delete('/:id', authenticateToken, (req, res) => {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized.' });

    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Post deleted.' });
});

module.exports = router;
