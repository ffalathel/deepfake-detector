# 🧠✨ Advanced Deepfake Detection System

A comprehensive AI-powered deepfake detection platform that helps users identify AI-generated images and videos with high accuracy. Built with modern web technologies and sophisticated machine learning models.

![Deepfake Detection](https://img.shields.io/badge/Deepfake-Detection-blue)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![Next.js](https://img.shields.io/badge/Next.js-14.0+-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.68+-red)
![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-orange)

## 🎯 Overview

This project provides a complete deepfake detection solution with both image and video analysis capabilities. The system uses custom-trained deep learning models to detect AI-generated content with high precision, helping users navigate the digital landscape with confidence.

### Key Features

- ✅ **Advanced Image Detection** - Custom-trained ResNet/EfficientNet models for accurate image analysis
- 🎥 **Video Deepfake Detection** - Coming soon with temporal analysis capabilities
- 🌐 **Modern Web Interface** - Responsive Next.js frontend with bilingual support (English/Arabic)
- 🔒 **Secure API** - FastAPI backend with rate limiting and comprehensive validation
- 🐳 **Docker Support** - Multiple deployment options for easy setup
- 📊 **Detailed Analytics** - Confidence scores, explanations, and technical details
- 🎨 **Professional UI** - Beautiful, accessible interface with smooth animations

## 🏗️ Architecture

### Frontend (Next.js 14)
- **Framework**: Next.js with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion for smooth interactions
- **Components**: Modular React components with proper TypeScript interfaces
- **Internationalization**: English and Arabic language support
- **File Handling**: Drag-and-drop upload with validation

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.11+
- **ML Models**: PyTorch-based deepfake detection models
- **Image Processing**: PIL, OpenCV for image/video handling
- **Face Detection**: MTCNN and OpenCV Haar Cascades
- **Security**: Rate limiting, file validation, CORS protection
- **Documentation**: Auto-generated API docs with Swagger/OpenAPI

### Machine Learning
- **Image Model**: Custom-trained ResNet50/EfficientNet with specialized classification head
- **Video Model**: LSTM-based temporal analysis (in development)
- **Preprocessing**: Advanced image augmentation and normalization
- **Confidence Calibration**: Temperature scaling and domain-specific adjustments
- **Face Extraction**: MTCNN for focused face region analysis

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (optional)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/deepfake-detector.git
   cd deepfake-detector
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Frontend Setup**
   ```bash
   cd src  # Frontend is in src/ directory
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Docker Deployment

#### Option 1: Simple Single Container
```bash
docker build -t deepfake-detector .
docker run -d --name deepfake-detector -p 3000:3000 -p 8000:8000 deepfake-detector
```

#### Option 2: Docker Compose
```bash
docker-compose up --build -d
```

#### Option 3: Interactive Deployment Script
```bash
./start_services.sh
```

## 📁 Project Structure

```
deepfake-detector/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py            # FastAPI application and endpoints
│   │   ├── model.py           # ML model definitions and loading
│   │   └── utils.py           # Utility functions and validation
│   ├── models/                # Trained model files
│   ├── requirements.txt       # Python dependencies
│   └── config.yaml           # Configuration file
├── src/                       # Next.js frontend
│   ├── app/                   # App router pages
│   │   ├── api/              # API routes
│   │   ├── page.tsx          # Main application page
│   │   └── layout.tsx        # Root layout
│   └── components/           # React components
│       ├── FileUpload.tsx    # File upload component
│       ├── ResultDisplay.tsx # Results display component
│       ├── LoadingSpinner.tsx # Loading animation
│       └── LanguageToggle.tsx # Language switcher
├── public/                   # Static assets
├── docker-compose.yml        # Docker Compose configuration
├── Dockerfile               # Docker image definition
├── start_services.sh        # Service startup script
├── test-api.sh             # API testing script
├── vercel.json             # Vercel deployment config
└── package.json            # Node.js dependencies
```

## 🔧 Configuration

### Environment Variables

#### Backend
- `TRAINING_MODE`: Set to "true" to run in training mode (disables API endpoints)
- `THINKING_TIME`: Processing simulation time in seconds (default: 2.0)
- `BACKEND_URL`: Backend service URL for frontend communication

#### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NODE_ENV`: Environment mode (development/production)

### Model Configuration

The system supports multiple model architectures:
- **ResNet18/50**: Lightweight and fast inference
- **EfficientNet-B0**: Balanced accuracy and speed
- **Custom Classification Head**: Specialized for deepfake detection

## 📊 API Endpoints

### Core Endpoints

- `GET /` - API information and status
- `GET /health` - Health check with model status
- `POST /analyze-image` - Image deepfake detection
- `POST /analyze-video` - Video analysis (coming soon)
- `GET /docs` - Interactive API documentation

### Request/Response Format

#### Image Analysis Request
```bash
curl -X POST "https://ffalathel-deepfake-detector.hf.space/analyze-image" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@image.jpg"
```

#### Response Format
```json
{
  "prediction": "ai_generated",
  "confidence": 0.85,
  "explanation": "This image shows strong signs of AI generation...",
  "details": {
    "model_used": "Custom AI Detection Model v1.0",
    "processing_time": 2.3,
    "file_size": "2.5 MB",
    "image_dimensions": "1920x1080",
    "detected_features": ["Synthetic artifacts", "Lighting inconsistencies"]
  }
}
```

## 🧪 Testing

### API Testing
```bash
# Run the comprehensive API test suite
./test-api.sh

# Test specific endpoints
curl -f https://ffalathel-deepfake-detector.hf.space/health
curl -X POST https://ffalathel-deepfake-detector.hf.space/analyze-image \
  -F "file=@test_image.jpg"
```

### Frontend Testing
```bash
cd src
npm run lint
npm run type-check
npm run build
```

## 🚀 Deployment

### Vercel (Frontend)
The frontend is configured for Vercel deployment with automatic builds and environment variable management.

### Hugging Face Spaces (Backend)
The backend is deployed on Hugging Face Spaces with automatic model loading and health monitoring.

### Docker Production
```bash
# Build optimized production image
docker build -f Dockerfile -t deepfake-detector-prod .

# Run with production settings
docker run -d \
  --name deepfake-detector-prod \
  -p 3000:3000 \
  -p 8000:8000 \
  -e NODE_ENV=production \
  deepfake-detector-prod
```

## 🔒 Security Features

- **Rate Limiting**: 10 requests per minute per IP
- **File Validation**: Comprehensive file type and size checks
- **Input Sanitization**: Filename sanitization and path traversal protection
- **CORS Protection**: Configurable cross-origin resource sharing
- **Error Handling**: Graceful error responses without sensitive information
- **Model Integrity**: SHA256 hash verification for model files

## 🎨 User Interface

### Design System
- **Color Palette**: Luxury-inspired cream, gold, and deep tones
- **Typography**: Serif headings with sans-serif body text
- **Animations**: Smooth transitions and micro-interactions
- **Responsive**: Mobile-first design with tablet and desktop optimization
- **Accessibility**: WCAG 2.1 AA compliance with proper contrast ratios

### Key Components
- **FileUpload**: Drag-and-drop interface with preview
- **ResultDisplay**: Detailed analysis results with confidence visualization
- **LanguageToggle**: Seamless English/Arabic switching
- **LoadingSpinner**: Engaging loading animations

## 📈 Performance

### Optimization Features
- **Lazy Loading**: Models loaded on-demand
- **Image Compression**: Automatic image optimization
- **Caching**: Strategic caching for improved response times
- **Async Processing**: Non-blocking file processing
- **Memory Management**: Efficient resource cleanup

### Benchmarks
- **Image Processing**: ~2-3 seconds per image
- **Model Loading**: ~5-10 seconds on first request
- **API Response**: <100ms for cached responses
- **File Upload**: Supports up to 50MB images

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive docstrings for Python functions
- Include tests for new features
- Update documentation for API changes
- Follow the existing code style and formatting

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **University of South Florida** - Academic support and resources
- **Hugging Face** - Model hosting and deployment platform
- **Vercel** - Frontend hosting and deployment
- **Open Source Community** - PyTorch, FastAPI, Next.js, and other amazing tools

## 📞 Contact

**Fahada Alathel**
- **University**: University of South Florida
- **Project**: Advanced Deepfake Detection System
- **Mission**: Creating technology that protects and serves our communities

---

*Built with care for my family — and yours. 💛*  
*Because the truth should be easy to spot.*