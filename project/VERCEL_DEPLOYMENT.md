# Deploy HireWork to Vercel

This guide will help you deploy your HireWork application to Vercel.

## Prerequisites

1. **GitHub Account** - Your code must be on GitHub
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **MongoDB Atlas** - Free cloud MongoDB database (required for production)

---

## Step 1: Set Up MongoDB Atlas (Free Cloud Database)

Since Vercel is serverless, you need a cloud MongoDB database:

### 1.1 Create MongoDB Atlas Account
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Try Free" and create an account
3. Choose the **FREE tier** (M0 Sandbox)

### 1.2 Create a Cluster
1. Select **AWS** as provider
2. Choose a region close to you
3. Click "Create Cluster" (takes 3-5 minutes)

### 1.3 Create Database User
1. Click "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `hirework-user`
5. Password: **Generate a secure password** (save it!)
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

### 1.4 Allow Network Access
1. Click "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

### 1.5 Get Your Connection String
1. Click "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string - it looks like:
   ```
   mongodb+srv://hirework-user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password
6. Add database name after `.net/`: `mongodb+srv://...mongodb.net/hirework?retryWrites=true...`

**Save this connection string!** You'll need it for Vercel.

---

## Step 2: Push Your Code to GitHub

### 2.1 Initialize Git (if not already)
```bash
cd project
git init
git add .
git commit -m "Prepare for Vercel deployment"
```

### 2.2 Create GitHub Repository
1. Go to [github.com/new](https://github.com/new)
2. Name: `hirework-app`
3. Click "Create repository"

### 2.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/hirework-app.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### 3.1 Import Project
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Click "Import" next to your `hirework-app` repository
4. Click "Import"

### 3.2 Configure Project
1. **Project Name**: `hirework` (or whatever you prefer)
2. **Framework Preset**: Leave as "Other"
3. **Root Directory**: `./` (default)
4. **Build Command**: Leave empty
5. **Output Directory**: Leave empty

### 3.3 Add Environment Variables
Click "Environment Variables" and add:

**Variable Name**: `MONGODB_URI`
**Value**: Your MongoDB Atlas connection string from Step 1.5

Example:
```
mongodb+srv://hirework-user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/hirework?retryWrites=true&w=majority
```

### 3.4 Deploy
1. Click "Deploy"
2. Wait 1-2 minutes for deployment
3. You'll get a URL like: `https://hirework-xxxxx.vercel.app`

---

## Step 4: Verify Deployment

### 4.1 Check Your Site
1. Visit your Vercel URL
2. The homepage should load
3. Try signing up with a new account
4. Check if workers are displayed

### 4.2 Common Issues & Fixes

#### ❌ 404 Error
- Make sure `vercel.json` is in the `project` folder
- Check that `server.js` exports the app: `module.exports = app`

#### ❌ Database Connection Error
- Verify MongoDB Atlas connection string
- Check Network Access allows 0.0.0.0/0
- Ensure database user password is correct

#### ❌ API Routes Not Working
- Check Vercel function logs: Dashboard → Project → Functions
- Verify routes start with `/api/`

#### ❌ Static Files Not Loading
- Check `vercel.json` routes configuration
- Ensure `public` folder is in the project

---

## Step 5: Update Your Site

Every time you push to GitHub, Vercel will automatically redeploy:

```bash
# Make changes to your code
git add .
git commit -m "Update feature"
git push
```

Vercel will automatically detect the push and redeploy in ~1 minute.

---

## Step 6: Custom Domain (Optional)

1. Go to your Vercel project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS instructions

---

## Helpful Vercel Commands

### View Logs
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# View logs
vercel logs
```

### Local Testing with Vercel
```bash
# Run locally with Vercel environment
vercel dev
```

---

## Important Notes

✅ **Free Tier Limits:**
- Vercel: 100GB bandwidth/month
- MongoDB Atlas: 512MB storage (enough for small apps)

✅ **Environment Variables:**
- Never commit `.env` files to GitHub
- Always use Vercel's environment variable system

✅ **Automatic Deployments:**
- Every push to `main` branch = new deployment
- Preview deployments for other branches

✅ **Function Timeout:**
- Free tier: 10 seconds max per request
- Hobby tier: 10 seconds
- Pro tier: 60 seconds

---

## Troubleshooting

### Check Vercel Logs
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your project
3. Click "Deployments"
4. Click latest deployment
5. Click "Functions" to see logs

### Check MongoDB Connection
1. Go to MongoDB Atlas
2. Click "Metrics"
3. Verify connections are being made

### Still Having Issues?
- Check browser console (F12) for JavaScript errors
- Verify all files are committed to GitHub
- Ensure `vercel.json` has correct routes

---

## Success! 🎉

Your HireWork app should now be live at:
`https://your-project-name.vercel.app`

Share the link with others and start hiring workers!
