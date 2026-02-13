# Vercel 500 Error - Troubleshooting Guide

## Error: FUNCTION_INVOCATION_FAILED

This means the serverless function crashed. Here's how to fix it:

## ✅ Step-by-Step Fix:

### 1. **Check MongoDB Atlas Setup**

Make sure you've completed these steps:

- [ ] Created MongoDB Atlas account (free M0 tier)
- [ ] Created a cluster
- [ ] Created database user with password
- [ ] Set Network Access to `0.0.0.0/0` (allow from anywhere)
- [ ] Got your connection string

### 2. **Verify Connection String Format**

Your connection string should look like:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/hirework?retryWrites=true&w=majority
```

**Common mistakes:**
- ❌ `<password>` not replaced with actual password
- ❌ Missing `/hirework` database name
- ❌ Using `mongodb://` instead of `mongodb+srv://`
- ❌ Special characters in password not URL-encoded

### 3. **Set Environment Variable in Vercel**

1. Go to Vercel → Your Project → Settings
2. Click **"Environment Variables"**
3. Add:
   - **Name**: `MONGODB_URI`
   - **Value**: Your full connection string
   - **Environments**: Check all three (Production, Preview, Development)
4. Click **"Save"**

### 4. **Redeploy**

After adding the environment variable:
1. Go to **Deployments** tab
2. Find latest deployment
3. Click **"..."** (three dots)
4. Click **"Redeploy"**

OR push a new commit:
```bash
git add .
git commit -m "Fix serverless MongoDB connection"
git push
```

---

## 🔍 How to Check Logs:

### Method 1: Vercel Dashboard
1. Go to your project
2. Click **"Deployments"**
3. Click latest deployment
4. Click **"Functions"** tab
5. Look for errors in red

### Method 2: Vercel CLI
```bash
npm i -g vercel
vercel login
vercel logs YOUR_PROJECT_NAME --follow
```

---

## 🐛 Common Error Messages:

### "MongooseServerSelectionError"
**Cause**: Can't connect to MongoDB
**Fix**:
- Check Network Access in MongoDB Atlas allows `0.0.0.0/0`
- Verify connection string is correct
- Make sure `MONGODB_URI` is set in Vercel

### "Authentication failed"
**Cause**: Wrong username/password
**Fix**:
- Verify database user credentials in MongoDB Atlas
- Regenerate password if needed
- URL-encode special characters in password

### "MONGODB_URI is not set"
**Cause**: Environment variable not configured
**Fix**: Add `MONGODB_URI` in Vercel Settings → Environment Variables

### "Module not found"
**Cause**: Dependencies not installed
**Fix**: Make sure `package.json` is in the `project` folder

---

## ✅ Test Your Setup:

### Test 1: Health Check Endpoint
Visit: `https://your-app.vercel.app/api/health`

Should return:
```json
{
  "status": "ok",
  "mongodb": "configured",
  "environment": "vercel"
}
```

If `mongodb: "not configured"` → Environment variable not set!

### Test 2: Workers Endpoint
Visit: `https://your-app.vercel.app/api/workers`

Should return JSON array of workers.

### Test 3: Homepage
Visit: `https://your-app.vercel.app`

Should show the HireWork homepage.

---

## 🚨 Still Not Working?

### Check These:
1. **Root Directory** = `project` in Vercel settings
2. **vercel.json** exists in `project` folder
3. **MONGODB_URI** is set and correct
4. **MongoDB Atlas** network allows all IPs
5. **Database user** has read/write permissions

### Get More Help:
1. Check Vercel function logs
2. Test MongoDB connection string locally
3. Try connecting with MongoDB Compass using same string
4. Check MongoDB Atlas metrics for connection attempts

---

## 📝 Quick Checklist:

Before asking for help, verify:
- [ ] `MONGODB_URI` environment variable is set in Vercel
- [ ] Connection string format is correct
- [ ] MongoDB Atlas allows connections from `0.0.0.0/0`
- [ ] Database user exists and has correct password
- [ ] Root directory is set to `project`
- [ ] Latest code is pushed to GitHub
- [ ] Redeployed after adding environment variable
