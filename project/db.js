const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'hirework.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        hourly_rate REAL NOT NULL,
        rating REAL DEFAULT 4.5,
        avatar TEXT,
        location TEXT DEFAULT 'Available Nationwide',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS hires (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        worker_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        hired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (worker_id) REFERENCES workers(id)
    );
`);

// Seed workers if table is empty
const workerCount = db.prepare('SELECT COUNT(*) as count FROM workers').get();
if (workerCount.count === 0) {
    const insertWorker = db.prepare(`
        INSERT INTO workers (name, category, description, hourly_rate, rating, location)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const workers = [
        // Design
        ['Sarah Chen', 'Design', 'UI/UX designer with 8 years of experience in web and mobile design.', 65, 4.9, 'San Francisco, CA'],
        ['Marcus Rivera', 'Design', 'Brand identity specialist and graphic designer.', 55, 4.7, 'New York, NY'],
        ['Aisha Patel', 'Design', 'Motion graphics and visual design expert.', 70, 4.8, 'Los Angeles, CA'],
        ['James O\'Brien', 'Design', 'Interior designer specializing in commercial spaces.', 80, 4.6, 'Chicago, IL'],

        // Construction
        ['Mike Johnson', 'Construction', 'Licensed general contractor with 15 years experience.', 85, 4.8, 'Houston, TX'],
        ['Carlos Hernandez', 'Construction', 'Residential and commercial framing specialist.', 60, 4.5, 'Phoenix, AZ'],
        ['David Kim', 'Construction', 'Expert electrician, certified master electrician.', 75, 4.9, 'Seattle, WA'],
        ['Robert Taylor', 'Construction', 'Plumbing contractor with full licensing.', 70, 4.7, 'Denver, CO'],

        // Technology
        ['Emma Wilson', 'Technology', 'Full-stack developer specializing in React and Node.js.', 95, 4.9, 'Austin, TX'],
        ['Alex Nguyen', 'Technology', 'DevOps engineer and cloud infrastructure expert.', 100, 4.8, 'Portland, OR'],
        ['Priya Sharma', 'Technology', 'Mobile app developer for iOS and Android.', 90, 4.7, 'Boston, MA'],
        ['Tom Martinez', 'Technology', 'Cybersecurity analyst and penetration tester.', 110, 4.9, 'Washington, DC'],

        // Cleaning
        ['Lisa Brown', 'Cleaning', 'Professional house cleaner with eco-friendly products.', 35, 4.8, 'Miami, FL'],
        ['Grace Lee', 'Cleaning', 'Deep cleaning and move-in/move-out specialist.', 40, 4.6, 'Atlanta, GA'],
        ['Maria Santos', 'Cleaning', 'Commercial office cleaning services.', 38, 4.7, 'Dallas, TX'],

        // Plumbing
        ['Frank Miller', 'Plumbing', 'Emergency plumbing and pipe repair specialist.', 80, 4.8, 'Philadelphia, PA'],
        ['Hassan Ali', 'Plumbing', 'Bathroom and kitchen remodeling plumber.', 75, 4.5, 'Detroit, MI'],

        // Electrical
        ['Ryan Cooper', 'Electrical', 'Residential wiring and panel upgrades.', 70, 4.7, 'Nashville, TN'],
        ['Steven Park', 'Electrical', 'Solar panel installation and electrical systems.', 85, 4.9, 'San Diego, CA'],

        // Moving
        ['Big T Moving Co.', 'Moving', 'Full-service local and long-distance moving.', 50, 4.6, 'Charlotte, NC'],
        ['Jake Williams', 'Moving', 'Furniture assembly and small moves specialist.', 40, 4.5, 'Orlando, FL'],

        // Landscaping
        ['Green Thumb Landscaping', 'Landscaping', 'Lawn care, garden design, and maintenance.', 45, 4.7, 'Sacramento, CA'],
        ['Pedro Gonzalez', 'Landscaping', 'Tree service and hardscape installation.', 55, 4.8, 'San Antonio, TX'],
    ];

    const insertMany = db.transaction((workers) => {
        for (const w of workers) {
            insertWorker.run(...w);
        }
    });

    insertMany(workers);
    console.log('Seeded workers database');
}

module.exports = db;
