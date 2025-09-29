#!/bin/bash

# Deepfake Detector - Production Deployment Script
# This script deploys the complete application without Docker

set -e

echo "🚀 Deepfake Detector - Production Deployment"
echo "============================================="

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

# Install Python dependencies
echo "📦 Installing Python dependencies..."
cd backend
pip install -r requirements.txt
cd ..

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cd frontend
npm install
npm run build
cd ..

echo "✅ Dependencies installed successfully"

# Create startup script
cat > start_services.sh << 'EOF'
#!/bin/bash

# Start backend
echo "🚀 Starting FastAPI backend..."
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
echo "🚀 Starting Next.js frontend..."
cd ../frontend
npm start &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 10

echo "✅ Services started successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo "❤️ Health Check: http://localhost:8000/health"

# Function to stop services
stop_services() {
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Handle Ctrl+C
trap stop_services SIGINT SIGTERM

# Keep script running
wait
EOF

chmod +x start_services.sh

echo "✅ Deployment setup complete!"
echo ""
echo "To start the application:"
echo "  ./start_services.sh"
echo ""
echo "To test the API:"
echo "  curl http://localhost:8000/health"
echo ""
echo "Access points:"
echo "  🌐 Frontend: http://localhost:3000"
echo "  🔧 Backend API: http://localhost:8000"
echo "  📚 API Docs: http://localhost:8000/docs"
