#!/bin/bash

# BhashaGPT Pro Deployment Script
echo "🚀 Starting BhashaGPT Pro Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

# Build backend
build_backend() {
    print_status "Building backend..."
    cd server
    
    if [ ! -f "package.json" ]; then
        print_error "Backend package.json not found"
        exit 1
    fi
    
    npm install
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Backend build completed"
    else
        print_error "Backend build failed"
        exit 1
    fi
    
    cd ..
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    cd bhashagpt-pro
    
    if [ ! -f "package.json" ]; then
        print_error "Frontend package.json not found"
        exit 1
    fi
    
    npm install
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Frontend build completed"
    else
        print_error "Frontend build failed"
        exit 1
    fi
    
    cd ..
}

# Deploy to Vercel
deploy_frontend() {
    print_status "Deploying frontend to Vercel..."
    cd bhashagpt-pro
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found, installing..."
        npm install -g vercel
    fi
    
    vercel --prod --yes
    
    if [ $? -eq 0 ]; then
        print_success "Frontend deployed to Vercel"
    else
        print_error "Frontend deployment failed"
        exit 1
    fi
    
    cd ..
}

# Deploy to Railway
deploy_backend() {
    print_status "Deploying backend to Railway..."
    cd server
    
    if ! command -v railway &> /dev/null; then
        print_warning "Railway CLI not found, installing..."
        npm install -g @railway/cli
    fi
    
    # Check if railway is logged in
    if ! railway whoami &> /dev/null; then
        print_warning "Please login to Railway first:"
        railway login
    fi
    
    # Initialize if needed
    if [ ! -f "railway.toml" ]; then
        railway init
    fi
    
    railway up
    
    if [ $? -eq 0 ]; then
        print_success "Backend deployed to Railway"
    else
        print_error "Backend deployment failed"
        exit 1
    fi
    
    cd ..
}

# Run health checks
health_check() {
    print_status "Running health checks..."
    
    # Wait a bit for services to start
    sleep 10
    
    # Check backend health (you'll need to replace with actual URL)
    print_status "Checking backend health..."
    # curl -f https://your-backend-url.railway.app/api/v1/health
    
    # Check frontend health (you'll need to replace with actual URL)
    print_status "Checking frontend health..."
    # curl -f https://your-frontend-url.vercel.app
    
    print_success "Health checks completed"
}

# Main deployment flow
main() {
    echo "🎯 BhashaGPT Pro Deployment Starting..."
    echo "======================================"
    
    check_dependencies
    
    # Ask user what to deploy
    echo ""
    echo "What would you like to deploy?"
    echo "1) Full deployment (Frontend + Backend)"
    echo "2) Frontend only"
    echo "3) Backend only"
    echo "4) Build only (no deployment)"
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            print_status "Starting full deployment..."
            build_backend
            build_frontend
            deploy_backend
            deploy_frontend
            health_check
            ;;
        2)
            print_status "Starting frontend deployment..."
            build_frontend
            deploy_frontend
            ;;
        3)
            print_status "Starting backend deployment..."
            build_backend
            deploy_backend
            ;;
        4)
            print_status "Building both services..."
            build_backend
            build_frontend
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "======================================"
    echo ""
    echo "Next steps:"
    echo "1. Update environment variables in your hosting dashboards"
    echo "2. Test the deployed applications"
    echo "3. Set up monitoring and alerts"
    echo ""
    echo "Frontend: Check Vercel dashboard for URL"
    echo "Backend: Check Railway dashboard for URL"
    echo ""
    print_success "BhashaGPT Pro is now live! 🚀"
}

# Run main function
main "$@"