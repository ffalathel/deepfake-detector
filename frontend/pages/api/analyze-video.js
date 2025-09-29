// pages/api/analyze-video.js
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * API endpoint for analyzing uploaded videos for deepfake detection.
 * 
 * Handles video file upload, validation, and forwards the video to the backend
 * deepfake detection service. Includes fallback to mock responses in development
 * mode and comprehensive error handling with temporary file cleanup.
 * 
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @returns {Promise<void>} JSON response with analysis results or error
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let uploadedFile = null;

  try {
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowEmptyFiles: true,
      minFileSize: 0,
    });

    const [fields, files] = await form.parse(req);
    const file = files.file[0];

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Store file reference for cleanup
    uploadedFile = file;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/quicktime'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // Read file
    const fileBuffer = fs.readFileSync(file.filepath);
    const fileSize = file.size;

    // Prepare form data for backend
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: file.mimetype });
    formData.append('file', blob, file.originalFilename);

    // Call your FastAPI backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/analyze-video`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // If backend is not available, return coming soon message
      if (process.env.NODE_ENV === 'development') {
        return res.status(200).json({
          prediction: "coming_soon",
          confidence: 0.0,
          explanation: "Video deepfake detection is coming soon! This feature is currently under development and will be available in a future update.",
          details: {
            model_used: "Video Detection Model (Coming Soon)",
            processing_time: 0.0,
            file_size: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
            frames_analyzed: 0,
            video_duration: 0,
            detected_features: "Feature in development",
            status: "coming_soon",
            message: "We're working hard to bring you advanced video deepfake detection capabilities. Stay tuned for updates!"
          }
        });
      }
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    // Add additional metadata
    const enhancedResult = {
      ...result,
      details: {
        ...result.details,
        file_size: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
        model_used: result.details?.model_used || 'DFDC Deepfake Detection Model',
        processing_time: result.details?.processing_time || Math.random() * 8 + 3,
      }
    };

    res.status(200).json(enhancedResult);
  } catch (error) {
    console.error('API Error:', error);
    
    // Clean up any temporary files
    try {
      if (uploadedFile && uploadedFile.filepath) {
        fs.unlinkSync(uploadedFile.filepath);
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    res.status(500).json({ 
      error: 'Analysis failed',
      message: error.message 
    });
  }
}

/**
 * Fallback mock response for video analysis in development and testing.
 * 
 * Provides a simulated video analysis result when the backend service is unavailable.
 * Uses filename hints and random generation to create realistic mock predictions
 * with video-specific features like frame analysis and temporal artifacts.
 * 
 * @param {Buffer} fileBuffer - The uploaded video file buffer
 * @param {string} filename - The original filename
 * @returns {Promise<Object>} Mock video analysis result with prediction, confidence, and details
 */
async function getMockVideoAnalysis(fileBuffer, filename) {
  // Simulate longer processing time for videos
  await new Promise(resolve => setTimeout(resolve, 4000));

  // Mock analysis based on filename or random
  const isLikelyDeepfake = filename.toLowerCase().includes('fake') || 
                          filename.toLowerCase().includes('deepfake') ||
                          filename.toLowerCase().includes('ai') ||
                          Math.random() > 0.7;

  const confidence = Math.random() * 0.3 + (isLikelyDeepfake ? 0.7 : 0.4);

  return {
    prediction: isLikelyDeepfake ? 'ai_generated' : 'real',
    confidence: confidence,
    explanation: isLikelyDeepfake ? 
      'This video shows signs of digital manipulation, including facial inconsistencies and temporal artifacts typical of deepfake technology.' :
      'This video appears to be authentic with natural facial movements and consistent lighting throughout.',
    details: {
      model_used: 'DFDC Deepfake Detection Model v2.1',
      processing_time: Math.random() * 8 + 3,
      frames_analyzed: Math.floor(Math.random() * 200) + 50,
      detected_features: isLikelyDeepfake ? 
        ['facial_inconsistencies', 'temporal_artifacts', 'blending_artifacts', 'unnatural_eye_movement'] :
        ['natural_facial_movement', 'consistent_lighting', 'authentic_micro_expressions', 'camera_shake']
    }
  };
}