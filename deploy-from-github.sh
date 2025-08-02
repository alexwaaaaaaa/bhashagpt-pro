#!/bin/bash

echo "🚀 Deploy BhashaGPT Pro from GitHub"
echo "===================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}This script will help you deploy BhashaGPT Pro to Railway and Vercel${NC}"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Not in a git repository. Please run this from your project root.${NC}"
    exit 1
fi

# Check if we have a remote origin
if ! git remote get-url origin &> /dev/null; then
    echo -e "${YELLOW}⚠️  No git remote found. Please set up GitHub first:${NC}"
    echo "1. Create a repository on GitHub"
    echo "2. Run: git remote add origin https://github.com/yourusername/bhashagpt-pro.git"
    echo "3. Run: git push -u origin main"
    exit 1
fi

echo -e "${GREEN}✅ Git repository detected${NC}"
echo "Remote: $(git remote get-url origin)"
echo ""

# Deploy Backend to Railway
echo -e "${BLUE}📦 Step 1: Deploy Backend to Railway${NC}"
echo "1. Go to https://railway.app"
echo "2. Click 'New Project'"
echo "3. Select 'Deploy from GitHub repo'"
echo "4. Choose your bhashagpt-pro repository"
echo "5. Set root directory to: server"
echo "6. Add environment variables:"
echo "   - NODE_ENV=production"
echo "   - AI_PROVIDER=free"
echo "   - HUGGING_FACE_TOKEN=your_hugging_face_token_here"
echo "   - CORS_ORIGIN=https://your-vercel-app.vercel.app"
echo ""
read -p "Press Enter when Railway deployment is complete..."

echo ""
echo -e "${BLUE}📦 Step 2: Deploy Frontend to Vercel${NC}"
echo "1. Go to https://vercel.com"
echo "2. Click 'New Project'"
echo "3. Import your bhashagpt-pro repository"
echo "4. Set root directory to: bhashagpt-pro"
echo "5. Add environment variable:"
echo "   - BACKEND_URL=https://your-railway-app.railway.app"
echo ""
read -p "Press Enter when Vercel deployment is complete..."

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "========================"
echo ""
echo "Your BhashaGPT Pro is now live! 🚀"
echo ""
echo "Next steps:"
echo "1. Test your deployed application"
echo "2. Visit /test-integration to verify functionality"
echo "3. Try different languages (EN, ES, HI)"
echo "4. Monitor logs for any issues"
echo ""
echo "🔗 Useful links:"
echo "- Railway Dashboard: https://railway.app/dashboard"
echo "- Vercel Dashboard: https://vercel.com/dashboard"
echo "- GitHub Repository: $(git remote get-url origin)"
echo ""
echo -e "${GREEN}✨ Congratulations! Your AI language learning platform is live!${NC}"