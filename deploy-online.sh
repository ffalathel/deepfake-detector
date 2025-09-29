#!/bin/bash

# Deepfake Detector - Online Deployment Script
# Deploys frontend to Vercel and backend to Railway

set -e

echo "🚀 Deepfake Detector - Online Deployment"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "backend/app/main.py" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if models exist
if [ ! -f "backend/models/image_model.pt" ]; then
    echo "❌ Model file not found: backend/models/image_model.pt"
    echo "Please ensure your trained model is in the correct location"
    exit 1
fi

echo "✅ Model file found: backend/models/image_model.pt"

# Check if required tools are installed
echo "🔍 Checking deployment tools..."

if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

echo "✅ Deployment tools ready"

# Deploy backend to Railway
echo "🚀 Deploying backend to Railway..."
cd backend

# Login to Railway if not already logged in
if ! railway whoami &> /dev/null; then
    echo "Please login to Railway:"
    railway login
fi

# Deploy to Railway
echo "Deploying backend..."
railway up --detach

# Get the Railway URL
RAILWAY_URL=$(railway status --json | jq -r '.deployments[0].url' 2>/dev/null || echo "https://deepfake-detector-backend.railway.app")
echo "✅ Backend deployed to: $RAILWAY_URL"

cd ..

# Update frontend configuration with Railway URL
echo "🔧 Updating frontend configuration..."
sed -i.bak "s|https://deepfake-detector-backend.railway.app|$RAILWAY_URL|g" frontend/vercel.json

# Deploy frontend to Vercel
echo "🚀 Deploying frontend to Vercel..."
cd frontend

# Login to Vercel if not already logged in
if ! vercel whoami &> /dev/null; then
    echo "Please login to Vercel:"
    vercel login
fi

# Deploy to Vercel
echo "Deploying frontend..."
vercel --prod

# Get the Vercel URL
VERCEL_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "https://deepfake-detector.vercel.app")
echo "✅ Frontend deployed to: $VERCEL_URL"

cd ..

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "🌐 Frontend: $VERCEL_URL"
echo "🔧 Backend: $RAILWAY_URL"
echo "📚 API Docs: $RAILWAY_URL/docs"
echo "❤️ Health Check: $RAILWAY_URL/health"
echo ""
echo "🔧 Update CORS settings:"
echo "   Replace '*' in backend/app/main.py with your Vercel domain"
echo ""
echo "🧪 Test your deployment:"
echo "   curl $RAILWAY_URL/health"
echo "   curl $VERCEL_URL/api/health"
