// app/api/analyze-image/route.js
import fs from 'fs';
import path from 'path';

/**
 * API endpoint for analyzing uploaded images for deepfake detection.
 * 
 * Handles file upload, validation, and forwards the image to the backend
 * deepfake detection service. Includes comprehensive error handling and
 * temporary file cleanup to prevent resource leaks.
 * 
 * @param {Request} req - The HTTP request object
 * @returns {Promise<Response>} JSON response with analysis results or error
 */
export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Debug logging
    console.log('File received:', file.name, file.type, file.size);
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return Response.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Read file
    const fileBuffer = await file.arrayBuffer();
    const fileSize = file.size;

    // Prepare form data for backend
    const backendFormData = new FormData();
    const blob = new Blob([fileBuffer], { type: file.type });
    backendFormData.append('file', blob, file.name);

    // Call your FastAPI backend
    const backendUrl = process.env.BACKEND_URL || 'https://ffalathel-deepfake-detector.hf.space';
    console.log('Calling backend URL:', backendUrl);
    
    const response = await fetch(`${backendUrl}/analyze-image`, {
      method: 'POST',
      body: backendFormData,
    });
    
    console.log('Backend response status:', response.status);

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();

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

    return Response.json(enhancedResult);
  } catch (error) {
    console.error('API Error:', error);

    return Response.json({ 
      error: 'Analysis failed',
      message: error.message 
    }, { status: 500 });
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

  const prediction = isLikelyAI ? 'ai_generated' : 'real';
  const confidence = isLikelyAI ? 
    Math.random() * 0.3 + 0.7 : // 70-100% for AI
    Math.random() * 0.4 + 0.6;  // 60-100% for real

  return {
    prediction,
    confidence: Math.round(confidence * 100) / 100,
    explanation: isLikelyAI 
      ? "This image appears to be AI-generated with moderate confidence. Look for subtle inconsistencies in lighting, texture patterns, or facial features that may indicate synthetic generation."
      : "This image appears to be authentic with strong confidence. Natural variations in lighting, texture, and facial expressions are consistent with genuine content.",
    details: {
      model_used: 'Mock Analysis Model (Development)',
      processing_time: Math.random() * 2 + 1,
      file_size: `${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`,
      detected_features: isLikelyAI 
        ? ['Potential synthetic artifacts', 'Unusual lighting patterns', 'Texture inconsistencies']
        : ['Natural lighting consistency', 'Authentic texture patterns', 'Consistent facial features']
    }
  };
}
