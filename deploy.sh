#!/bin/bash

# Deepfake Detector - Quick Deployment Script
# This script provides multiple deployment options

set -e

echo "🚀 Deepfake Detector Deployment Script"
echo "======================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"

# Function to deploy with simple Docker setup
deploy_simple() {
    echo "📦 Building with simple Docker setup..."
    docker build -f Dockerfile.simple -t deepfake-detector-simple .
    
    echo "🚀 Starting container..."
    docker run -d \
        --name deepfake-detector-simple \
        -p 3000:3000 \
        -p 8000:8000 \
        -v $(pwd)/backend/models:/app/backend/models:ro \
        -v $(pwd)/backend/logs:/app/backend/logs \
        deepfake-detector-simple
    
    echo "✅ Simple deployment complete!"
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📚 API Docs: http://localhost:8000/docs"
}

# Function to deploy with docker-compose
deploy_compose() {
    echo "📦 Building with docker-compose..."
    docker-compose -f docker-compose.simple.yml up --build -d
    
    echo "✅ Docker-compose deployment complete!"
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📚 API Docs: http://localhost:8000/docs"
}

# Function to deploy optimized version
deploy_optimized() {
    echo "📦 Building optimized version..."
    docker build -f Dockerfile.optimized -t deepfake-detector-optimized .
    
    echo "🚀 Starting optimized container..."
    docker run -d \
        --name deepfake-detector-optimized \
        -p 3000:3000 \
        -p 8000:8000 \
        -v $(pwd)/backend/models:/app/models:ro \
        -v $(pwd)/backend/logs:/app/logs \
        deepfake-detector-optimized
    
    echo "✅ Optimized deployment complete!"
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📚 API Docs: http://localhost:8000/docs"
}

# Function to check deployment status
check_status() {
    echo "📊 Checking deployment status..."
    
    # Check if any containers are running
    if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "deepfake-detector"; then
        echo "✅ Running containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "deepfake-detector"
        
        echo ""
        echo "🔍 Health checks:"
        
        # Check backend health
        if curl -s http://localhost:8000/health > /dev/null; then
            echo "✅ Backend API is healthy"
        else
            echo "❌ Backend API is not responding"
        fi
        
        # Check frontend health
        if curl -s http://localhost:3000/api/health > /dev/null; then
            echo "✅ Frontend is healthy"
        else
            echo "❌ Frontend is not responding"
        fi
    else
        echo "❌ No deepfake-detector containers are running"
    fi
}

# Function to stop all deployments
stop_all() {
    echo "🛑 Stopping all deployments..."
    
    # Stop and remove containers
    docker stop deepfake-detector-simple deepfake-detector-optimized 2>/dev/null || true
    docker rm deepfake-detector-simple deepfake-detector-optimized 2>/dev/null || true
    
    # Stop docker-compose
    docker-compose -f docker-compose.simple.yml down 2>/dev/null || true
    
    echo "✅ All deployments stopped"
}

# Function to show logs
show_logs() {
    echo "📋 Showing logs..."
    
    if docker ps --format "{{.Names}}" | grep -q "deepfake-detector"; then
        CONTAINER=$(docker ps --format "{{.Names}}" | grep "deepfake-detector" | head -1)
        echo "📄 Logs for $CONTAINER:"
        docker logs -f $CONTAINER
    else
        echo "❌ No running containers found"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "Choose deployment option:"
    echo "1) Simple Docker deployment"
    echo "2) Docker-compose deployment"
    echo "3) Optimized Docker deployment"
    echo "4) Check deployment status"
    echo "5) Show logs"
    echo "6) Stop all deployments"
    echo "7) Exit"
    echo ""
}

# Main script
if [ $# -eq 0 ]; then
    show_menu
    read -p "Enter your choice (1-7): " choice
    
    case $choice in
        1) deploy_simple ;;
        2) deploy_compose ;;
        3) deploy_optimized ;;
        4) check_status ;;
        5) show_logs ;;
        6) stop_all ;;
        7) echo "👋 Goodbye!"; exit 0 ;;
        *) echo "❌ Invalid choice"; exit 1 ;;
    esac
else
    case $1 in
        simple) deploy_simple ;;
        compose) deploy_compose ;;
        optimized) deploy_optimized ;;
        status) check_status ;;
        logs) show_logs ;;
        stop) stop_all ;;
        *) echo "Usage: $0 [simple|compose|optimized|status|logs|stop]"; exit 1 ;;
    esac
fi



