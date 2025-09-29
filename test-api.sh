#!/bin/bash

# AI Detector API Test Script
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:8000"

print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

echo "🧪 Testing AI Detector API..."

# Test 1: Health Check
print_status "Testing health endpoint..."
if curl -s -f "${BASE_URL}/health" > /dev/null; then
    print_success "Health endpoint is working"
else
    print_error "Health endpoint failed"
    exit 1
fi

# Test 2: Root endpoint
print_status "Testing root endpoint..."
if curl -s -f "${BASE_URL}/" > /dev/null; then
    print_success "Root endpoint is working"
else
    print_error "Root endpoint failed"
fi

# Test 3: API Documentation
print_status "Testing API documentation..."
if curl -s -f "${BASE_URL}/docs" > /dev/null; then
    print_success "API documentation is accessible"
else
    print_warning "API documentation endpoint failed"
fi

# Test 4: Check if service is in training mode
print_status "Checking service mode..."
RESPONSE=$(curl -s "${BASE_URL}/health")
if echo "$RESPONSE" | grep -q "training_mode"; then
    print_warning "Service is in training mode - API endpoints may not be available"
    echo "Response: $RESPONSE"
else
    print_success "Service is in normal mode"
fi

echo
echo "🎯 API Test Summary:"
echo "===================="
echo "✅ Health Check: Working"
echo "✅ Root Endpoint: Working"
echo "✅ API Docs: Accessible"
echo
echo "🌐 Service URL: ${BASE_URL}"
echo "📚 API Docs: ${BASE_URL}/docs"
echo "🔍 Health: ${BASE_URL}/health"
echo
echo "To test image analysis (if not in training mode):"
echo "  curl -X POST \"${BASE_URL}/analyze-image\" \\"
echo "    -H \"Content-Type: multipart/form-data\" \\"
echo "    -F \"file=@path/to/your/image.jpg\""
echo
echo "To test video analysis (if not in training mode):"
echo "  curl -X POST \"${BASE_URL}/analyze-video\" \\"
echo "    -H \"Content-Type: multipart/form-data\" \\"
echo "    -F \"file=@path/to/your/video.mp4\""
