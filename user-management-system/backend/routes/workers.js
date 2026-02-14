const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');

// Seed workers if none exist
const seedWorkers = async () => {
    const count = await Worker.countDocuments();
    if (count === 0) {
        const workers = [
            {
                name: 'Sarah Johnson',
                title: 'Senior Web Developer',
                description: 'Full-stack developer with 8 years of experience in React, Node.js, and cloud architecture.',
                hourlyRate: 85,
                skills: ['React', 'Node.js', 'AWS', 'MongoDB'],
                rating: 4.9,
                category: 'Development',
                image: 'https://i.pravatar.cc/200?img=5'
            },
            {
                name: 'Michael Chen',
                title: 'UI/UX Designer',
                description: 'Creative designer specializing in modern, user-centered design for web and mobile applications.',
                hourlyRate: 70,
                skills: ['Figma', 'Adobe XD', 'Prototyping', 'User Research'],
                rating: 4.8,
                category: 'Design',
                image: 'https://i.pravatar.cc/200?img=12'
            },
            {
                name: 'David Martinez',
                title: 'Data Scientist',
                description: 'Expert in machine learning, data analysis, and building predictive models for business insights.',
                hourlyRate: 95,
                skills: ['Python', 'TensorFlow', 'SQL', 'Statistics'],
                rating: 5.0,
                category: 'Data Science',
                image: 'https://i.pravatar.cc/200?img=33'
            },
            {
                name: 'Emily Rodriguez',
                title: 'Digital Marketing Specialist',
                description: 'Results-driven marketer with expertise in SEO, social media, and content strategy.',
                hourlyRate: 60,
                skills: ['SEO', 'Google Ads', 'Social Media', 'Analytics'],
                rating: 4.7,
                category: 'Marketing',
                image: 'https://i.pravatar.cc/200?img=47'
            },
            {
                name: 'James Wilson',
                title: 'DevOps Engineer',
                description: 'Infrastructure specialist focused on CI/CD, containerization, and cloud deployment.',
                hourlyRate: 90,
                skills: ['Docker', 'Kubernetes', 'Jenkins', 'Terraform'],
                rating: 4.9,
                category: 'DevOps',
                image: 'https://i.pravatar.cc/200?img=14'
            },
            {
                name: 'Lisa Anderson',
                title: 'Content Writer',
                description: 'Professional writer creating engaging content for blogs, websites, and marketing materials.',
                hourlyRate: 50,
                skills: ['Copywriting', 'SEO Writing', 'Research', 'Editing'],
                rating: 4.6,
                category: 'Writing',
                image: 'https://i.pravatar.cc/200?img=29'
            }
        ];

        await Worker.insertMany(workers);
        console.log('✅ Workers seeded');
    }
};

// Initialize on import
seedWorkers().catch(err => console.error('Seed error:', err));

// @route   GET /api/workers
// @desc    Get all workers
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        const query = category ? { category } : {};

        const workers = await Worker.find(query).sort({ rating: -1 });

        res.status(200).json({
            success: true,
            count: workers.length,
            data: workers
        });

    } catch (error) {
        console.error('Get workers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch workers'
        });
    }
});

// @route   GET /api/workers/:id
// @desc    Get single worker
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const worker = await Worker.findById(req.params.id);

        if (!worker) {
            return res.status(404).json({
                success: false,
                error: 'Worker not found'
            });
        }

        res.status(200).json({
            success: true,
            data: worker
        });

    } catch (error) {
        console.error('Get worker error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch worker'
        });
    }
});

module.exports = router;
