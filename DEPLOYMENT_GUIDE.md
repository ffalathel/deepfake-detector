# 🚀 Online Deployment Guide

Deploy your Deepfake Detector to production with Vercel (frontend) and Railway (backend).

## 📋 Prerequisites

1. **GitHub Account** - For code repository
2. **Vercel Account** - For frontend hosting
3. **Railway Account** - For backend hosting
4. **Model File** - Ensure `backend/models/image_model.pt` exists

## 🎯 Quick Deployment

### Option 1: Automated Script
```bash
./deploy-online.sh
```

### Option 2: Manual Deployment

## 🔧 Backend Deployment (Railway)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Deploy Backend:**
   ```bash
   cd backend
   railway up
   ```

4. **Get your Railway URL:**
   ```bash
   railway status
   ```

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
   - Replace `https://deepfake-detector-backend.railway.app` in `vercel.json` with your Railway URL

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
   curl https://your-railway-url.railway.app/health
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

### Railway (Backend)
- `THINKING_TIME=3.0` (optional)
- `PORT` (automatically set by Railway)

### Vercel (Frontend)
- `NEXT_PUBLIC_API_URL` (set in vercel.json)
- `NODE_ENV=production`

## 🎉 Your Live Application

Once deployed, your application will be available at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://your-app.railway.app`
- **API Documentation**: `https://your-app.railway.app/docs`

## 🔧 Troubleshooting

### Common Issues:

1. **CORS Errors:**
   - Update `allow_origins` in backend CORS settings
   - Ensure frontend URL is whitelisted

2. **Model Loading Issues:**
   - Verify model file exists in `backend/models/`
   - Check Railway logs for model loading errors

3. **Build Failures:**
   - Check Railway logs: `railway logs`
   - Check Vercel logs in dashboard

### Getting Help:
- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Check deployment logs for specific errors

## 🎯 Next Steps

1. **Custom Domain:** Add your own domain to Vercel
2. **SSL Certificate:** Automatically handled by Vercel/Railway
3. **Monitoring:** Set up error tracking and analytics
4. **Scaling:** Configure auto-scaling on Railway

Your Deepfake Detector is now live and ready for users! 🚀
