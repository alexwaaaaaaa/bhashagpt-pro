# 🚀 Deploy BhashaGPT Pro NOW!

## ⚡ Quick Deploy (5 minutes)

### Option 1: Automated Script
```bash
# Run the deployment script
./deploy.sh

# Choose option 1 for full deployment
```

### Option 2: Manual Deploy

#### Step 1: Deploy Backend to Railway
```bash
cd server

# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize and deploy
railway init
railway up
```

#### Step 2: Deploy Frontend to Vercel
```bash
cd bhashagpt-pro

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## 🔧 Environment Variables to Set

### In Railway (Backend)
```
NODE_ENV=production
AI_PROVIDER=free
HUGGING_FACE_TOKEN=your_hugging_face_token_here
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

### In Vercel (Frontend)
```
BACKEND_URL=https://your-railway-app.railway.app
```

## ✅ Post-Deploy Testing

### 1. Test Backend
```bash
curl https://your-railway-app.railway.app/api/v1/chat/health
```

### 2. Test Frontend
Visit: `https://your-vercel-app.vercel.app/test-integration`

### 3. Test Integration
Try sending a message in different languages!

## 🎯 You're Ready!

**Everything is prepared for deployment. The app will be live in under 5 minutes!**

Choose your deployment method and let's go live! 🚀