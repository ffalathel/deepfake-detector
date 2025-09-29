#!/bin/bash

# Deepfake Detector - Render Deployment Script
# Deploys backend to Render and frontend to Vercel

set -e

echo "🚀 Deepfake Detector - Render Deployment"
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

echo "✅ Deployment tools ready"

echo ""
echo "📋 Render Deployment Instructions:"
echo "=================================="
echo ""
echo "1. Go to https://render.com and sign up/login"
echo "2. Click 'New +' → 'Web Service'"
echo "3. Connect your GitHub repository"
echo "4. Configure the service:"
echo "   - Name: deepfake-detector-backend"
echo "   - Environment: Python 3"
echo "   - Build Command: pip install -r requirements.txt"
echo "   - Start Command: uvicorn app.main:app --host 0.0.0.0 --port \$PORT"
echo "   - Health Check Path: /health"
echo ""
echo "5. Add Environment Variables:"
echo "   - THINKING_TIME = 3.0"
echo "   - PYTHON_VERSION = 3.11.0"
echo ""
echo "6. Click 'Create Web Service'"
echo ""
echo "7. Wait for deployment to complete"
echo "8. Note your Render URL (e.g., https://deepfake-detector-backend.onrender.com)"
echo ""

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
echo "🔧 Backend: https://deepfake-detector-backend.onrender.com (after Render deployment)"
echo "📚 API Docs: https://deepfake-detector-backend.onrender.com/docs"
echo "❤️ Health Check: https://deepfake-detector-backend.onrender.com/health"
echo ""
echo "🔧 Update CORS settings after Render deployment:"
echo "   Replace '*' in backend/app/main.py with your Vercel domain"
echo ""
echo "🧪 Test your deployment:"
echo "   curl https://deepfake-detector-backend.onrender.com/health"
echo "   curl $VERCEL_URL/api/health"
