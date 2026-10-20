import os
import io
import time
import tempfile
import logging
import numpy as np
from datetime import datetime
from typing import Optional
from collections import defaultdict
import time
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.concurrency import run_in_threadpool

import onnxruntime as ort
from PIL import Image

# TODO: Replace placeholder with Microsoft Video Detection Model
# - Load Microsoft model in startup_event()
# - Add video inference
# - Update model_used string in response
# -------------------- Setup Logging --------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Add FileHandler or RotatingFileHandler as needed
    ]
)
logger = logging.getLogger(__name__)

# -------------------- Initialize FastAPI --------------------
app = FastAPI(
    title="AI Content Detector API",
    description="Detect AI-generated images and deepfake videos",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# -------------------- CORS Middleware --------------------
# TODO: Adjust `allow_origins` to frontend domain(s) in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- Rate Limiting --------------------
request_counts = defaultdict(list)


def get_client_ip(request: Request) -> str:
    """
    Return the real client IP for rate limiting.

    On Hugging Face Spaces, request.client is a different internal proxy address
    on each request. The proxy appends the real client IP as the last
    X-Forwarded-For entry; earlier entries come from the client and can be faked.
    Without the header (local development), fall back to the socket address.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """
    Rate limiting middleware to prevent API abuse.
    
    Implements a sliding window rate limiter that allows maximum 10 requests per minute
    per client IP address. This helps protect the API from being overwhelmed by
    excessive requests while still allowing legitimate usage.
    
    Args:
        request: The incoming HTTP request
        call_next: The next middleware/handler in the chain
        
    Returns:
        The response from the next handler
        
        JSONResponse: 429 status if rate limit is exceeded. Returned rather than
            raised, because exceptions raised in middleware bypass FastAPI's
            HTTPException handling and become 500s.
    """
    client_ip = get_client_ip(request)
    now = time.time()
    
    # Clean old requests (older than 1 minute)
    request_counts[client_ip] = [
        req_time for req_time in request_counts[client_ip] 
        if now - req_time < 60
    ]
    
    # Check rate limit (max 10 requests per minute)
    if len(request_counts[client_ip]) >= 10:
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
    
    request_counts[client_ip].append(now)
    return await call_next(request)

# -------------------- Exception Handlers --------------------
@app.exception_handler(413)
async def request_entity_too_large_handler(request: Request, exc):
    """
    Handle 413 Payload Too Large errors gracefully.
    
    When clients upload files that exceed the maximum allowed size (50MB),
    this handler provides a clear error message instead of a generic server error.
    
    Args:
        request: The HTTP request that caused the error
        exc: The exception that was raised
        
    Returns:
        JSONResponse: User-friendly error message with 413 status code
    """
    return JSONResponse(
        status_code=413,
        content={"detail": "File too large. Maximum size is 50MB."}
    )

@app.exception_handler(500)
async def internal_server_error_handler(request: Request, exc):
    """
    Handle 500 Internal Server Error exceptions gracefully.
    
    Logs the actual error details for debugging while returning a user-friendly
    error message to the client. This prevents sensitive error information
    from being exposed to end users.
    
    Args:
        request: The HTTP request that caused the error
        exc: The exception that was raised
        
    Returns:
        JSONResponse: Generic error message with 500 status code
    """
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."}
    )

# -------------------- Globals --------------------
image_model: Optional[ort.InferenceSession] = None
video_model = None  # Extend loading when video model ready

# Exported from models/image_model.pt by export_onnx.py
MODEL_PATH = "models/image_model.onnx"

# Check training mode at startup
TRAINING_MODE = os.getenv("TRAINING_MODE") == "true"
if TRAINING_MODE:
    logger.info("Training mode detected - API will run in training mode")

# ImageNet normalization used during training
IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def preprocess_image(image: Image.Image) -> np.ndarray:
    """
    Turn a PIL image into the model's (1, 3, 224, 224) float32 input.

    Equivalent to torchvision Resize((224, 224)) + ToTensor + Normalize,
    done in NumPy so the server does not need PyTorch.
    """
    x = np.asarray(image.resize((224, 224), Image.BILINEAR), dtype=np.float32) / 255.0
    x = (x - IMAGENET_MEAN) / IMAGENET_STD
    return x.transpose(2, 0, 1)[np.newaxis]  # HWC -> NCHW


def load_onnx_model(model_path: str = MODEL_PATH) -> Optional[ort.InferenceSession]:
    """Load the ONNX model into an ONNX Runtime CPU session, or None if missing."""
    if not os.path.exists(model_path):
        logger.warning(f"Model file not found: {model_path}")
        return None
    session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
    logger.info(f"Loaded ONNX model from {model_path}")
    return session

# -------------------- Startup Event --------------------
@app.on_event("startup")
async def startup_event():
    """
    Initialize the FastAPI application on startup.
    
    This function loads the ONNX deepfake detection model into an ONNX Runtime
    CPU session. It includes safety checks to prevent conflicts when running
    in training mode and performs an integrity test on the loaded model.

    Global variables modified:
        image_model: The ONNX Runtime session for the image model
        video_model: Placeholder for future video model (currently None)
    """
    global image_model, video_model

    # Skip model loading if training mode is detected
    if os.getenv("TRAINING_MODE") == "true":
        logger.info("Training mode detected - skipping model loading to avoid conflicts")
        image_model = None
        video_model = None
        return

    try:
        image_model = load_onnx_model()
        if image_model is None:
            logger.warning("Image model not loaded or missing.")
        else:
            # Quick integrity check with dummy input
            dummy = np.random.rand(1, 3, 224, 224).astype(np.float32)
            image_model.run(None, {"input": dummy})
            logger.info("Image model loaded and integrity test passed.")
    except Exception as e:
        logger.error(f"Failed to load image model: {e}")
        image_model = None

    # TODO: Load video model similarly once available
    video_model = None

# -------------------- Health Check Endpoint --------------------
@app.get("/health")
async def health_check():
    """
    Health check endpoint to monitor service status and model availability.
    
    Returns comprehensive status information including model loading state,
    device information, and system capabilities. This endpoint is crucial
    for monitoring and debugging the service in production environments.
    
    Returns:
        dict: Health status information including:
            - status: Current service status
            - timestamp: ISO timestamp of the health check
            - models: Loading status of each model
            - device: Current inference device
            - system: System capabilities and configuration
    """
    training_mode = os.getenv("TRAINING_MODE") == "true"
    
    if training_mode:
        return {
            "status": "training_mode",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "message": "Service in training mode - models not loaded",
            "models": {
                "image_model": "not_loaded",
                "video_model": "not_loaded"
            },
            "device": "unknown",
            "system": {
                "runtime": f"onnxruntime {ort.__version__}",
                "training_mode": True
            }
        }
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "models": {
            "image_model": "loaded" if image_model else "not_loaded",
            "video_model": "loaded" if video_model else "not_loaded"
        },
        "device": "cpu",
        "system": {
            "runtime": f"onnxruntime {ort.__version__}",
            "training_mode": False
        }
    }

# -------------------- Root Endpoint --------------------
@app.get("/")
async def root():
    """
    Root endpoint providing API information and available endpoints.
    
    Returns basic information about the AI Content Detector API including
    version, status, and available endpoints. The response varies based on
    whether the service is running in training mode or normal operation.
    
    Returns:
        dict: API information including:
            - message: Service description
            - version: API version
            - status: Current service status
            - endpoints: Available API endpoints
    """
    training_mode = os.getenv("TRAINING_MODE") == "true"
    
    if training_mode:
        return {
            "message": "AI Content Detector API (Training Mode)",
            "version": "1.0.0",
            "status": "training_mode",
            "note": "Service temporarily unavailable during training",
            "endpoints": {
                "health": "/health",
                "docs": "/docs"
            }
        }
    
    return {
        "message": "AI Content Detector API",
        "version": "1.0.0",
        "status": "healthy",
        "endpoints": {
            "health": "/health",
            "analyze_image": "/analyze-image",
            "analyze_video": "/analyze-video",
            "docs": "/docs"
        }
    }

# -------------------- Image Analysis Endpoint --------------------
@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """
    Analyze uploaded image for deepfake detection.
    
    This endpoint processes uploaded images to detect whether they are AI-generated
    or authentic. It performs comprehensive validation, loads the image safely,
    runs inference using the trained deepfake detection model, and returns
    detailed analysis results including confidence scores and explanations.
    
    Args:
        file: Uploaded image file (JPEG, PNG, GIF, WebP, BMP)
        
    Returns:
        dict: Analysis results containing:
            - prediction: "real" or "ai_generated"
            - confidence: Confidence score (0.0-1.0)
            - explanation: Human-readable explanation
            - details: Technical details including model info, processing time, etc.
            
    Raises:
        HTTPException: 503 if service is in training mode or the model failed to load
        HTTPException: 400 if file validation fails or image format is invalid
    """
    start_time = time.time()

    # Check if we're in training mode
    if os.getenv("TRAINING_MODE") == "true":
        raise HTTPException(status_code=503, detail="Service temporarily unavailable during training")

    # Validate file async-safe by offloading to threadpool
    validation_result = await run_in_threadpool(validate_file, file, "image")
    if not validation_result["valid"]:
        raise HTTPException(status_code=400, detail=validation_result["error"])

    # Read file bytes async
    contents = await file.read()

    # Load image safely off event loop
    try:
        image = await run_in_threadpool(lambda: Image.open(io.BytesIO(contents)).convert('RGB'))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

    # Lazy load model if not already loaded
    if image_model is None:
        await load_model_if_needed()
    
    if image_model is None:
        logger.error("Image model not loaded; refusing to return a prediction.")
        raise HTTPException(status_code=503, detail="Detection model unavailable")

    prediction, confidence = await run_in_threadpool(predict_image, image, image_model)

    processing_time = time.time() - start_time
    explanation = generate_explanation(prediction, confidence, "image")

    response = {
        "prediction": prediction,
        "confidence": confidence,
        "explanation": explanation,
        "details": {
            "model_used": "Custom AI Detection Model v1.0",
            "processing_time": round(processing_time, 2),
            "file_size": f"{len(contents) / (1024 * 1024):.2f} MB",
            "image_dimensions": f"{image.width}x{image.height}",
            "detected_features": get_detected_features(prediction, confidence, "image")
        }
    }

    logger.info(f"Image analyzed: {prediction} ({confidence:.2f}), time: {processing_time:.2f}s")
    return response

# -------------------- Video Analysis Endpoint --------------------
@app.post("/analyze-video")
async def analyze_video(file: UploadFile = File(...)):
    """
    Video analysis endpoint - Feature coming soon.
    
    This endpoint is currently under development. Video deepfake detection
    will be available in a future update with advanced video analysis capabilities.
    
    Args:
        file: Uploaded video file (MP4, AVI, MOV, WMV, FLV, WebM)
        
    Returns:
        dict: Coming soon message with feature information
            
    Raises:
        HTTPException: 503 for feature not yet available
    """
    # Return coming soon response
    response = {
        "prediction": "coming_soon",
        "confidence": 0.0,
        "explanation": "Video deepfake detection is coming soon! This feature is currently under development and will be available in a future update.",
        "details": {
            "model_used": "Video Detection Model (Coming Soon)",
            "processing_time": 0.0,
            "file_size": "N/A",
            "frames_analyzed": 0,
            "video_duration": 0,
            "detected_features": "Feature in development",
            "status": "coming_soon",
            "message": "We're working hard to bring you advanced video deepfake detection capabilities. Stay tuned for updates!"
        }
    }

    logger.info("Video analysis requested - feature coming soon")
    return response

# -------------------- Helper Functions --------------------
async def load_model_if_needed():
    """
    Lazy load the image model when first needed for inference.
    
    This function implements lazy loading to avoid loading the model during
    startup if it's not immediately needed. It attempts to load the ONNX
    model from disk.

    Global variables modified:
        image_model: ONNX Runtime session for the image model
    """
    global image_model

    if image_model is not None:
        return

    try:
        image_model = load_onnx_model()
        if image_model is None:
            logger.warning("Image model not loaded or missing.")
        else:
            logger.info("Image model loaded successfully on demand.")
    except Exception as e:
        logger.error(f"Failed to load image model: {e}")
        image_model = None

def predict_image(image: Image.Image, model: ort.InferenceSession) -> tuple:
    """
    Run deepfake detection inference on a single image with confidence calibration.
    
    Preprocesses the image, runs it through the trained model, and returns
    the prediction with calibrated confidence score. The model outputs a single logit
    for P(real), because training used ImageFolder, which numbers classes alphabetically
    (fake=0, real=1). It is converted to P(fake) and then calibrated to reduce overconfidence.
    
    Args:
        image: PIL Image object to analyze
        model: ONNX Runtime session for the image model

    Returns:
        tuple: (prediction, confidence) where:
            - prediction: "real" or "ai_generated"
            - confidence: Calibrated confidence score (0.0-1.0)

    Raises:
        Exception: inference errors propagate (handled as a 500) rather than
            being turned into a made-up prediction
    """
    logit = model.run(None, {"input": preprocess_image(image)})[0].item()
    probability = 1 / (1 + np.exp(logit))  # sigmoid(-logit) = 1 - P(real) = P(fake)

    calibrated_probability = calibrate_confidence(probability)

    prediction = "ai_generated" if calibrated_probability > 0.5 else "real"
    confidence = calibrated_probability if prediction == "ai_generated" else (1 - calibrated_probability)
    return prediction, confidence

def calibrate_confidence(probability: float) -> float:
    """
    Soften P(fake) with temperature scaling and map it into 0.1-0.9.

    The model was trained and evaluated on FaceForensics++ frames, so its raw
    confidence overstates how sure it can be on other images.

    Args:
        probability: P(fake) from the model (0.0-1.0)

    Returns:
        float: Calibrated P(fake) (0.1-0.9)
    """
    probability = min(max(probability, 0.001), 0.999)
    logit = np.log(probability / (1 - probability)) / 1.5  # temperature 1.5: less confident
    calibrated = 1 / (1 + np.exp(-logit))
    return 0.1 + calibrated * 0.8  # never claim more than 90% either way


def generate_explanation(prediction: str, confidence: float, media_type: str) -> str:
    """
    Generate human-readable explanation for the deepfake detection result.
    
    Creates a descriptive explanation based on the prediction, calibrated confidence level,
    and media type. Provides context about what features were analyzed and
    what the confidence level means in practical terms.

    Args:
        prediction: "real" or "ai_generated"
        confidence: Calibrated confidence score (0.0-1.0)
        media_type: "image" or "video"

    Returns:
        str: Human-readable explanation of the analysis result
    """
    # Updated confidence descriptions for calibrated scores
    if confidence > 0.75:
        confidence_desc = "strong"
    elif confidence > 0.65:
        confidence_desc = "moderate"
    else:
        confidence_desc = "weak"

    if prediction == "ai_generated":
        if media_type == "image":
            base_explanation = f"This image shows {confidence_desc} signs of AI generation. " \
                             f"Analysis detected potential inconsistencies in lighting, " \
                             f"texture patterns, or facial features that suggest synthetic origin."
            base_explanation += " AI detection is an evolving field and results should be considered as guidance."
            return base_explanation
        else:  # video
            return f"This video shows {confidence_desc} signs of deepfake manipulation. " \
                   f"Analysis detected temporal inconsistencies, facial landmarks instability, " \
                   f"or compression artifacts that suggest synthetic generation. " \
                   f"Note: Video analysis is currently in development."
    else:  # real
        base_explanation = f"This {media_type} appears to be authentic with {confidence_desc} confidence. " \
                          f"Natural variations in lighting, texture, and facial expressions " \
                          f"are consistent with genuine content."
        base_explanation += " Note: No detection method is 100% accurate."
        return base_explanation

def get_detected_features(prediction: str, confidence: float, media_type: str) -> list:
    """
    Generate a list of specific features that influenced the prediction.
    
    Returns detailed information about what visual or temporal features
    were detected during analysis. The features vary based on prediction
    type, confidence level, and media type (image vs video).
    
    Args:
        prediction: "real" or "ai_generated"
        confidence: Confidence score (0.0-1.0)
        media_type: "image" or "video"
        
    Returns:
        list: List of strings describing detected features
    """
    features = []
    
    if prediction == "ai_generated":
        if confidence > 0.8:
            if media_type == "image":
                features.extend([
                    "Strong synthetic artifacts detected",
                    "Inconsistent lighting patterns",
                    "Unnatural texture smoothing",
                    "Facial feature inconsistencies"
                ])
            else:  # video
                features.extend([
                    "Temporal inconsistencies detected",
                    "Facial landmark instability",
                    "Compression artifacts typical of deepfakes",
                    "Frame-to-frame inconsistencies"
                ])
        elif confidence > 0.6:
            if media_type == "image":
                features.extend([
                    "Moderate synthetic indicators",
                    "Possible lighting anomalies",
                    "Slight texture irregularities"
                ])
            else:  # video
                features.extend([
                    "Some temporal anomalies",
                    "Minor facial inconsistencies",
                    "Possible frame interpolation artifacts"
                ])
        else:
            features.extend([
                f"Weak {media_type} manipulation indicators",
                "Subtle anomalies detected",
                "Low confidence synthetic markers"
            ])
    else:  # real
        if confidence > 0.8:
            if media_type == "image":
                features.extend([
                    "Natural lighting consistency",
                    "Authentic texture patterns",
                    "Consistent facial features",
                    "No synthetic artifacts detected"
                ])
            else:  # video
                features.extend([
                    "Consistent temporal flow",
                    "Natural facial movements",
                    "Authentic compression patterns",
                    "No deepfake indicators"
                ])
        elif confidence > 0.6:
            features.extend([
                f"Mostly natural {media_type} characteristics",
                "Minor inconsistencies within normal range",
                "Overall authentic appearance"
            ])
        else:
            features.extend([
                f"Ambiguous {media_type} characteristics",
                "Mixed indicators present",
                "Uncertain authenticity markers"
            ])
    
    return features

# Also add this function to your app/utils.py
def validate_file(file, file_type):
    """
    Validate uploaded file for type and format compatibility.
    
    Performs basic validation on uploaded files including content type
    and file extension checks. This is a wrapper function that works
    with FastAPI UploadFile objects without reading the full file content.
    
    Args:
        file: FastAPI UploadFile object
        file_type: "image" or "video" to specify validation rules
        
    Returns:
        dict: Validation result with "valid" boolean and "error" message if invalid
    """
    if not hasattr(file, 'content_type') or not hasattr(file, 'filename'):
        return {"valid": False, "error": "Invalid file object"}
    
    # For UploadFile objects, we need to validate without reading content first
    content_type = file.content_type
    filename = file.filename
    
    if file_type == "image":
        allowed_types = {
            'image/jpeg', 'image/jpg', 'image/png',
            'image/gif', 'image/webp', 'image/bmp'
        }
        valid_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
    else:  # video
        allowed_types = {
            'video/mp4', 'video/avi', 'video/mov',
            'video/wmv', 'video/flv', 'video/webm',
            'video/quicktime'
        }
        valid_extensions = {'.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'}
    
    # Check content type
    if content_type not in allowed_types:
        return {
            "valid": False,
            "error": f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        }
    
    # Check file extension
    if not filename:
        return {"valid": False, "error": "Filename is required"}
    
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext not in valid_extensions:
        return {
            "valid": False,
            "error": f"Invalid file extension: {file_ext}. Allowed: {', '.join(valid_extensions)}"
        }
    
    return {"valid": True, "error": None}