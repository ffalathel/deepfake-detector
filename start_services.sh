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
