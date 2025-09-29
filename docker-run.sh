#!/bin/bash

# AI Detector Docker Runner Script
set -e

echo "🚀 Starting AI Detector Docker Setup..."

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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_success "Docker is running"

# Check if model file exists
if [ ! -f "backend/models/image_model.pt" ]; then
    print_warning "Model file 'backend/models/image_model.pt' not found."
    print_warning "The service will run but may not function properly without the trained model."
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Setup cancelled. Please ensure your model file is in place."
        exit 1
    fi
fi

# Build the Docker image
print_status "Building Docker image..."
if docker build -t ai-detector:latest .; then
    print_success "Docker image built successfully"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Stop and remove existing containers
print_status "Cleaning up existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Start the services
print_status "Starting AI Detector service..."
if docker-compose up -d; then
    print_success "Services started successfully"
else
    print_error "Failed to start services"
    exit 1
fi

# Wait for service to be ready
print_status "Waiting for service to be ready..."
sleep 10

# Check service health
print_status "Checking service health..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    print_success "Service is healthy and responding!"
    echo
    echo "🎉 AI Detector is now running!"
    echo "📍 API Endpoint: http://localhost:8000"
    echo "📚 API Documentation: http://localhost:8000/docs"
    echo "🔍 Health Check: http://localhost:8000/health"
    echo
    echo "To test the service:"
    echo "  curl http://localhost:8000/health"
    echo
    echo "To stop the service:"
    echo "  docker-compose down"
    echo
    echo "To view logs:"
    echo "  docker-compose logs -f ai-detector"
else
    print_warning "Service health check failed. Checking logs..."
    docker-compose logs ai-detector
    print_error "Service may not be fully ready. Please check logs above."
fi

echo
print_status "Setup complete!"
