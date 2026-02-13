const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./mongodb');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const hireRoutes = require('./routes/hires');
const workerRoutes = require('./routes/workers');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/hires', hireRoutes);
app.use('/api/workers', workerRoutes);

// Serve frontend pages (catch-all route)
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export for Vercel serverless
module.exports = app;

// Start server locally if not on Vercel
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}




// now i want you to make a better posting page maybe use facebook as reference post should be just like its on facebook and people should be able to add reactions and also comment on other peoples post and theres an issue when user is not logged in the hire button is invisible instead it should say Log In To Hire