# Advanced Deepfake Detection System

A comprehensive AI-powered deepfake detection platform that helps users identify AI-generated images and videos with high accuracy. Built with modern web technologies and sophisticated machine learning models.

![Deepfake Detection](https://img.shields.io/badge/Deepfake-Detection-blue)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![Next.js](https://img.shields.io/badge/Next.js-14.0+-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.68+-red)
![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-orange)

## Overview

This project provides a complete deepfake detection solution with both image and video analysis capabilities. The system uses custom-trained deep learning models to detect AI-generated content with high precision, helping users navigate the digital landscape with confidence.

### Key Features

- **Advanced Image Detection** - Custom-trained ResNet/EfficientNet models for accurate image analysis
- **Modern Web Interface** - Responsive Next.js frontend with bilingual support (English/Arabic)
- **Secure API** - FastAPI backend with rate limiting and comprehensive validation
- **Docker Support** - Multiple deployment options for easy setup
- **Detailed Analytics** - Confidence scores, explanations, and technical details
- **Professional UI** - Beautiful, accessible interface with smooth animations

## Architecture

### Frontend (Next.js 14)
- **Framework**: Next.js with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion for smooth interactions
- **Components**: Modular React components with proper TypeScript interfaces
- **Internationalization**: English and Arabic language support
- **File Handling**: Drag-and-drop upload with validation

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.11+
- **ML Models**: PyTorch-trained ResNet50, exported to ONNX and served with ONNX Runtime (CPU)
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

### Training Data
The image model was trained on images from the [FaceForensics++](https://github.com/ondyari/FaceForensics) dataset, 17,434 images in total:

| Split | Images |
|-------|--------|
| Train | 12,203 (fake: 5,995, real: 6,208) |
| Validation | 2,614 |
| Test | 2,617 |

Classes: `fake`, `real`.

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (optional)
- `huggingface_hub` (`pip install huggingface_hub`) to fetch the model

The trained model (`image_model.onnx`) is stored on the Hugging Face Space, not in git.

### Local Development

1. **Clone the repository and fetch the model**
   ```bash
   git clone https://github.com/ffalathel/deepfake-detector.git
   cd deepfake-detector
   hf download ffalathel/deepfake-detector models/image_model.onnx --repo-type space --local-dir backend
   ```

2. **Backend** (from `backend/`)
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 7860
   ```

   Or run it in Docker, exactly as the Space does:
   ```bash
   docker build -t deepfake-backend backend
   docker run -p 7860:7860 deepfake-backend
   ```

   Check it with `backend/smoke_test.sh http://localhost:7860`.

3. **Frontend** (from the repo root, pointed at the local backend)
   ```bash
   npm install
   BACKEND_URL=http://localhost:7860 npm run dev
   ```

4. **Open** http://localhost:3000 (API docs at http://localhost:7860/docs)

### Deployment

- **Frontend:** Vercel builds the Next.js app from the repo root (`vercel.json`).
- **Backend:** the Hugging Face Space builds `backend/Dockerfile`. On every push to `main` that touches `backend/`, GitHub Actions (`.github/workflows/backend.yml`) builds and smoke-tests the image, uploads the code to the Space, waits for the new build to go live, and smoke-tests the live URL. Pull requests run the tests only.
- **Updating the model:** retrain or re-export with `python export_onnx.py` (needs `requirements-dev.txt`), then upload it:
  `hf upload ffalathel/deepfake-detector backend/models/image_model.onnx models/image_model.onnx --repo-type space`

## 📁 Project Structure

```
deepfake-detector/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py            # FastAPI application and endpoints
│   │   ├── model.py           # ML model definitions and loading
│   │   └── utils.py           # Utility functions and validation
│   ├── models/                # Model files (image_model.onnx, fetched from the Space)
│   ├── Dockerfile             # Backend image, built by the Hugging Face Space and CI
│   ├── export_onnx.py         # PyTorch -> ONNX export with parity check
│   ├── smoke_test.sh          # API smoke test used by CI
│   ├── requirements.txt       # Server dependencies (pinned)
│   ├── requirements-dev.txt   # Training and export dependencies
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
├── .github/workflows/       # CI/CD to the Hugging Face Space
├── test-api.sh             # API testing script
├── vercel.json             # Vercel deployment config
└── package.json            # Node.js dependencies
```

## Configuration

### Environment Variables

#### Backend
- `TRAINING_MODE`: Set to "true" to run in training mode (disables API endpoints)
- `BACKEND_URL`: Backend service URL for frontend communication

#### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NODE_ENV`: Environment mode (development/production)

### Model Configuration

The system supports multiple model architectures:
- **ResNet18/50**: Lightweight and fast inference
- **EfficientNet-B0**: Balanced accuracy and speed
- **Custom Classification Head**: Specialized for deepfake detection

## API Endpoints

### Core Endpoints

- `GET /` - API information and status
- `GET /health` - Health check with model status
- `POST /analyze-image` - Image deepfake detection
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

## Testing

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
npm run lint
npm run type-check
npm run build
```


## Security Features

- **Rate Limiting**: 10 requests per minute per IP
- **File Validation**: Comprehensive file type and size checks
- **Input Sanitization**: Filename sanitization and path traversal protection
- **CORS Protection**: Configurable cross-origin resource sharing
- **Error Handling**: Graceful error responses without sensitive information
- **Model Integrity**: SHA256 hash verification for model files

## User Interface

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

## Performance

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

## Contributing

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
