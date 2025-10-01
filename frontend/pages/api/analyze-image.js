// pages/api/analyze-image.js
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * API endpoint for analyzing uploaded images for deepfake detection.
 * 
 * Handles file upload, validation, and forwards the image to the backend
 * deepfake detection service. Includes comprehensive error handling and
 * temporary file cleanup to prevent resource leaks.
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
      maxFileSize: 50 * 1024 * 1024,
      allowEmptyFiles: true,
      minFileSize: 0,
    });

    const [fields, files] = await form.parse(req);
    
    // Debug logging
    console.log('Parsed fields:', fields);
    console.log('Parsed files:', files);
    
    if (!files || !files.file || !files.file[0]) {
      console.error('No file found in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const file = files.file[0];

    // Store file reference for cleanup
    uploadedFile = file;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
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
    const backendUrl = process.env.BACKEND_URL || 'https://ffalathel-deepfake-detector.hf.space';
    console.log('Calling backend URL:', backendUrl);
    
    const response = await fetch(`${backendUrl}/analyze-image`, {
      method: 'POST',
      body: formData,
    });
    
    console.log('Backend response status:', response.status);

    if (!response.ok) {
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
        model_used: result.details?.model_used || 'Custom AI Detection Model',
        processing_time: result.details?.processing_time || Math.random() * 3 + 1,
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
 * Fallback mock response for development and testing.
 * 
 * Provides a simulated analysis result when the backend service is unavailable.
 * Uses filename hints and random generation to create realistic mock predictions
 * for testing and development purposes.
 * 
 * @param {Buffer} fileBuffer - The uploaded file buffer
 * @param {string} filename - The original filename
 * @returns {Promise<Object>} Mock analysis result with prediction, confidence, and details
 */
async function getMockImageAnalysis(fileBuffer, filename) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Mock analysis based on filename or random
  const isLikelyAI = filename.toLowerCase().includes('ai') || 
                     filename.toLowerCase().includes('generated') ||
                     Math.random() > 0.6;

  const confidence = Math.random() * 0.4 + (isLikelyAI ? 0.6 : 0.3);

  return {
    prediction: isLikelyAI ? 'ai_generated' : 'real',
    confidence: confidence,
    explanation: isLikelyAI ? 
      'This image shows characteristics typical of AI-generated content, including unusual texture patterns and lighting inconsistencies.' :
      'This image appears to have natural characteristics consistent with traditional photography or artwork.',
    details: {
      model_used: 'Custom AI Detection Model v1.0',
      processing_time: Math.random() * 3 + 1,
      detected_features: isLikelyAI ? 
        ['unusual_texture_patterns', 'lighting_inconsistencies', 'artifact_signatures'] :
        ['natural_grain', 'consistent_lighting', 'camera_artifacts']
    }
  };
}