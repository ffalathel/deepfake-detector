# Deepfake Detector - Quick Start Guide

## 🚀 Quick Deployment Options

I've created multiple Docker configurations for easy deployment:

### Option 1: Simple Single Container (Recommended for testing)
```bash
# Build and run everything in one container
docker build -f Dockerfile.simple -t deepfake-detector-simple .
docker run -d --name deepfake-detector-simple -p 3000:3000 -p 8000:8000 deepfake-detector-simple
```

### Option 2: Docker Compose (Recommended for production)
```bash
# Use the simplified docker-compose
docker-compose -f docker-compose.simple.yml up --build -d
```

### Option 3: Optimized Multi-stage Build
```bash
# Build optimized production image
docker build -f Dockerfile.optimized -t deepfake-detector-optimized .
docker run -d --name deepfake-detector-optimized -p 3000:3000 -p 8000:8000 deepfake-detector-optimized
```

### Option 4: Interactive Deployment Script
```bash
# Run the interactive deployment script
./deploy.sh
```

## 📋 What's Included

### New Docker Files:
- **Dockerfile.simple** - Single-stage build with both frontend and backend
- **Dockerfile.optimized** - Multi-stage optimized production build
- **docker-compose.simple.yml** - Simplified compose configuration
- **deploy.sh** - Interactive deployment script

### Features:
- ✅ Both frontend and backend in one container
- ✅ Automatic health checks
- ✅ Volume mounting for models and logs
- ✅ Production-ready configuration
- ✅ Easy deployment options

## 🌐 Access Points

Once deployed, access your application at:
- **Frontend**: http://localhost:3000
- **Backend API**: https://ffalathel-deepfake-detector.hf.space
- **API Documentation**: https://ffalathel-deepfake-detector.hf.space/docs
- **Health Check**: https://ffalathel-deepfake-detector.hf.space/health

## 🔧 Management Commands

### Check Status:
```bash
./deploy.sh status
```

### View Logs:
```bash
./deploy.sh logs
```

### Stop All:
```bash
./deploy.sh stop
```

## 📦 Model Requirements

Make sure you have trained models in:
- `backend/models/image_model.pt` (required)
- `backend/models/checkpoint.pt` (optional)
- `backend/models/checkpoint_epoch_99.pt` (optional)

## 🚨 Troubleshooting

If Docker Desktop has issues:
1. Restart Docker Desktop
2. Try the simple deployment first
3. Check logs with `./deploy.sh logs`
4. Verify models exist in `backend/models/`

## 🎯 Next Steps

1. **Test locally**: Use `./deploy.sh` for interactive deployment
2. **Deploy to cloud**: Use docker-compose for production
3. **Monitor**: Check health endpoints and logs
4. **Scale**: Add load balancer for high traffic

Your deepfake detector is ready for production deployment! 🎉



