const mongoose = require('mongoose');
const Worker = require('./models/Worker');

// MongoDB connection string - update with your MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hirework';

let isConnected = false;

const connectDB = async () => {
    // Reuse existing connection for serverless
    if (isConnected) {
        console.log('Using existing MongoDB connection');
        return;
    }

    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
        });

        isConnected = true;
        console.log('✅ MongoDB connected successfully');

        // Seed workers if collection is empty
        await seedWorkers();
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        if (!process.env.VERCEL) {
            process.exit(1);
        }
    }
};

const seedWorkers = async () => {
    try {
        const workerCount = await Worker.countDocuments();

        if (workerCount === 0) {
            const workers = [
                // Design
                { name: 'Sarah Chen', category: 'Design', description: 'UI/UX designer with 8 years of experience in web and mobile design.', hourly_rate: 65, rating: 4.9, location: 'San Francisco, CA' },
                { name: 'Marcus Rivera', category: 'Design', description: 'Brand identity specialist and graphic designer.', hourly_rate: 55, rating: 4.7, location: 'New York, NY' },
                { name: 'Aisha Patel', category: 'Design', description: 'Motion graphics and visual design expert.', hourly_rate: 70, rating: 4.8, location: 'Los Angeles, CA' },
                { name: 'James O\'Brien', category: 'Design', description: 'Interior designer specializing in commercial spaces.', hourly_rate: 80, rating: 4.6, location: 'Chicago, IL' },

                // Construction
                { name: 'Mike Johnson', category: 'Construction', description: 'Licensed general contractor with 15 years experience.', hourly_rate: 85, rating: 4.8, location: 'Houston, TX' },
                { name: 'Carlos Hernandez', category: 'Construction', description: 'Residential and commercial framing specialist.', hourly_rate: 60, rating: 4.5, location: 'Phoenix, AZ' },
                { name: 'David Kim', category: 'Construction', description: 'Expert electrician, certified master electrician.', hourly_rate: 75, rating: 4.9, location: 'Seattle, WA' },
                { name: 'Robert Taylor', category: 'Construction', description: 'Plumbing contractor with full licensing.', hourly_rate: 70, rating: 4.7, location: 'Denver, CO' },

                // Technology
                { name: 'Emma Wilson', category: 'Technology', description: 'Full-stack developer specializing in React and Node.js.', hourly_rate: 95, rating: 4.9, location: 'Austin, TX' },
                { name: 'Alex Nguyen', category: 'Technology', description: 'DevOps engineer and cloud infrastructure expert.', hourly_rate: 100, rating: 4.8, location: 'Portland, OR' },
                { name: 'Priya Sharma', category: 'Technology', description: 'Mobile app developer for iOS and Android.', hourly_rate: 90, rating: 4.7, location: 'Boston, MA' },
                { name: 'Tom Martinez', category: 'Technology', description: 'Cybersecurity analyst and penetration tester.', hourly_rate: 110, rating: 4.9, location: 'Washington, DC' },

                // Cleaning
                { name: 'Lisa Brown', category: 'Cleaning', description: 'Professional house cleaner with eco-friendly products.', hourly_rate: 35, rating: 4.8, location: 'Miami, FL' },
                { name: 'Grace Lee', category: 'Cleaning', description: 'Deep cleaning and move-in/move-out specialist.', hourly_rate: 40, rating: 4.6, location: 'Atlanta, GA' },
                { name: 'Maria Santos', category: 'Cleaning', description: 'Commercial office cleaning services.', hourly_rate: 38, rating: 4.7, location: 'Dallas, TX' },

                // Plumbing
                { name: 'Frank Miller', category: 'Plumbing', description: 'Emergency plumbing and pipe repair specialist.', hourly_rate: 80, rating: 4.8, location: 'Philadelphia, PA' },
                { name: 'Hassan Ali', category: 'Plumbing', description: 'Bathroom and kitchen remodeling plumber.', hourly_rate: 75, rating: 4.5, location: 'Detroit, MI' },

                // Electrical
                { name: 'Ryan Cooper', category: 'Electrical', description: 'Residential wiring and panel upgrades.', hourly_rate: 70, rating: 4.7, location: 'Nashville, TN' },
                { name: 'Steven Park', category: 'Electrical', description: 'Solar panel installation and electrical systems.', hourly_rate: 85, rating: 4.9, location: 'San Diego, CA' },

                // Moving
                { name: 'Big T Moving Co.', category: 'Moving', description: 'Full-service local and long-distance moving.', hourly_rate: 50, rating: 4.6, location: 'Charlotte, NC' },
                { name: 'Jake Williams', category: 'Moving', description: 'Furniture assembly and small moves specialist.', hourly_rate: 40, rating: 4.5, location: 'Orlando, FL' },

                // Landscaping
                { name: 'Green Thumb Landscaping', category: 'Landscaping', description: 'Lawn care, garden design, and maintenance.', hourly_rate: 45, rating: 4.7, location: 'Sacramento, CA' },
                { name: 'Pedro Gonzalez', category: 'Landscaping', description: 'Tree service and hardscape installation.', hourly_rate: 55, rating: 4.8, location: 'San Antonio, TX' },
            ];

            await Worker.insertMany(workers);
            console.log('✅ Seeded workers database');
        }
    } catch (error) {
        console.error('Error seeding workers:', error);
    }
};

module.exports = connectDB;
