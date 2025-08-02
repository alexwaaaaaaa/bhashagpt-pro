#!/bin/bash

echo "🚀 Quick Deploy BhashaGPT Pro"
echo "=============================="

# Deploy Backend to Railway
echo "📦 Deploying Backend to Railway..."
cd server

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Deploy to Railway
railway up --detach

echo "✅ Backend deployed to Railway"

# Deploy Frontend to Vercel
echo "📦 Deploying Frontend to Vercel..."
cd ../bhashagpt-pro

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
vercel --prod --yes

echo "✅ Frontend deployed to Vercel"

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "Next steps:"
echo "1. Get your Railway backend URL from Railway dashboard"
echo "2. Update BACKEND_URL in Vercel environment variables"
echo "3. Test your deployed application"
echo ""
echo "🔗 Links:"
echo "- Railway Dashboard: https://railway.app/dashboard"
echo "- Vercel Dashboard: https://vercel.com/dashboard"