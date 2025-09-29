# 🚀 Render Deployment Guide

Deploy your Deepfake Detector to production with Render (backend) and Vercel (frontend).

## 📋 Prerequisites

1. **GitHub Account** - For code repository
2. **Render Account** - For backend hosting (free tier available)
3. **Vercel Account** - For frontend hosting
4. **Model File** - Ensure `backend/models/image_model.pt` exists

## 🎯 Quick Deployment

### Option 1: Automated Script
```bash
./deploy-render.sh
```

### Option 2: Manual Deployment

## 🔧 Backend Deployment (Render)

1. **Go to Render.com:**
   - Visit https://render.com
   - Sign up or login with GitHub

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `deepfake-detector` repository

3. **Configure the Service:**
   - **Name**: `deepfake-detector-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`

4. **Add Environment Variables:**
   - `THINKING_TIME` = `3.0`
   - `PYTHON_VERSION` = `3.11.0`

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note your Render URL (e.g., `https://deepfake-detector-backend.onrender.com`)

## 🌐 Frontend Deployment (Vercel)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy Frontend:**
   ```bash
   cd frontend
   vercel --prod
   ```

4. **Update API URL:**
   - Replace `https://deepfake-detector-backend.onrender.com` in `vercel.json` with your actual Render URL

## 🔒 Security Configuration

### Update CORS Settings
In `backend/app/main.py`, replace:
```python
allow_origins=["*"]
```
with:
```python
allow_origins=["https://your-vercel-domain.vercel.app"]
```

## 🧪 Testing Your Deployment

1. **Backend Health Check:**
   ```bash
   curl https://deepfake-detector-backend.onrender.com/health
   ```

2. **Frontend Health Check:**
   ```bash
   curl https://your-vercel-url.vercel.app/api/health
   ```

3. **Test Image Analysis:**
   - Visit your Vercel URL
   - Upload a test image
   - Verify celebrity photo detection works

## 📊 Environment Variables

### Render (Backend)
- `THINKING_TIME=3.0` (optional)
- `PYTHON_VERSION=3.11.0`
- `PORT` (automatically set by Render)

### Vercel (Frontend)
- `NEXT_PUBLIC_API_URL` (set in vercel.json)
- `NODE_ENV=production`

## 🎉 Your Live Application

Once deployed, your application will be available at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://deepfake-detector-backend.onrender.com`
- **API Documentation**: `https://deepfake-detector-backend.onrender.com/docs`

## 💰 Pricing

### Render (Backend)
- **Free Tier**: 750 hours/month
- **No time limit** on free tier
- **Automatic SSL** certificates
- **Custom domains** supported

### Vercel (Frontend)
- **Free Tier**: Unlimited personal projects
- **Automatic SSL** certificates
- **Global CDN** included

## 🔧 Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Update `allow_origins` in backend CORS settings
   - Ensure frontend URL is whitelisted

2. **Model Loading Issues:**
   - Verify model file exists in `backend/models/`
   - Check Render logs for model loading errors

3. **Build Failures:**
   - Check Render logs in dashboard
   - Verify all dependencies in `requirements.txt`

### Getting Help:
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Check deployment logs for specific errors

## 🎯 Next Steps

1. **Custom Domain:** Add your own domain to Vercel
2. **SSL Certificate:** Automatically handled by Vercel/Render
3. **Monitoring:** Set up error tracking and analytics
4. **Scaling:** Configure auto-scaling on Render

Your Deepfake Detector is now live and ready for users! 🚀
