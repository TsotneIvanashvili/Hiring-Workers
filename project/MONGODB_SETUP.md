# MongoDB Setup & Usage Guide

## Overview
This project has been migrated from SQLite to MongoDB. User information including name, email, age, and password (hashed) is now stored in MongoDB.

## Database Configuration

### MongoDB Connection
The MongoDB connection string is configured in `mongodb.js`:
```
mongodb://localhost:27017/hirework
```

You can change this by setting the `MONGODB_URI` environment variable.

## User Schema
Users are stored with the following fields:
- `username`: String (required, unique)
- `email`: String (required, unique)
- `password`: String (required, hashed with bcrypt)
- `age`: Number (optional)
- `balance`: Number (default: 0)
- `created_at`: Date (auto-generated)

## Features

### 1. User Registration
Users can register with:
- Username
- Email
- Password
- Age (optional)

### 2. Change Password
Users can change their password by:
1. Going to the auth page
2. Clicking "Change Password" tab
3. Entering their email and new password
4. Passwords are automatically hashed before storage

### 3. View User Information

#### Via MongoDB Shell (mongosh)
```bash
# Connect to MongoDB
mongosh

# Switch to hirework database
use hirework

# View all users (without passwords)
db.users.find({}, { password: 0 })

# Find user by email
db.users.findOne({ email: "user@example.com" }, { password: 0 })

# View specific fields
db.users.find({}, { username: 1, email: 1, age: 1, balance: 1, _id: 0 })
```

#### Via API Endpoint
You can also view user information via the API:

**GET** `/api/auth/user/:email`

Example:
```bash
curl http://localhost:3000/api/auth/user/john@example.com
```

Response:
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john",
    "email": "john@example.com",
    "age": 25,
    "balance": 100,
    "created_at": "2024-02-14T00:00:00.000Z"
  }
}
```

## Starting the Server

### 1. Make sure MongoDB is running
```bash
# Windows - MongoDB should be running as a service
# Or start it manually:
mongod
```

### 2. Start the application
```bash
cd project
npm start
```

The server will:
- Connect to MongoDB
- Seed the workers collection if it's empty
- Start on http://localhost:3000

## Collections

The database has 4 collections:
1. **users** - User accounts with authentication
2. **workers** - Available workers for hire
3. **posts** - Community posts
4. **hires** - Records of users hiring workers

## Testing

1. **Register a new user:**
   - Go to http://localhost:3000
   - Click "Sign Up"
   - Fill in username, email, age (optional), and password
   - Submit

2. **Change password:**
   - Go to http://localhost:3000
   - Click "Change Password"
   - Enter email and new password
   - Submit

3. **View user data:**
   - Use mongosh: `db.users.find({}, { password: 0 })`
   - Or API: `curl http://localhost:3000/api/auth/user/YOUR_EMAIL`

## Notes

- Passwords are hashed using bcryptjs (salt rounds: 10)
- MongoDB stores user IDs as ObjectId, not integers
- All routes have been updated to work with Mongoose models
- Worker data is seeded automatically on first run
