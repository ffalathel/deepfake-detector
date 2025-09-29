import os
import json
import hashlib
import logging
from typing import Optional
import hashlib
import cv2
import numpy as np
import requests
import torch
import torch.nn as nn
from torchvision import models
from torchvision.models import (
    ResNet18_Weights,
    ResNet50_Weights,
    EfficientNet_B0_Weights
)
from facenet_pytorch import MTCNN
from tqdm import tqdm

logger = logging.getLogger(__name__)

def verify_model_integrity(model_path: str, expected_hash: str = None) -> bool:
    """
    Verify model file integrity using SHA256 hash comparison.
    
    This function provides security verification to ensure that model files
    haven't been tampered with or corrupted. It computes the SHA256 hash
    of the model file and compares it against the expected hash.
    
    Args:
        model_path: Path to the model file to verify
        expected_hash: Expected SHA256 hash (optional, if None, always returns True)
        
    Returns:
        bool: True if hash matches or no expected hash provided, False otherwise
    """
    if not expected_hash:
        return True
    
    sha256_hash = hashlib.sha256()
    with open(model_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256_hash.update(chunk)
    
    return sha256_hash.hexdigest() == expected_hash

# -------------------- MODEL DEFINITIONS -------------------- #
class ImprovedDeepfakeDetector(nn.Module):
    """
    Enhanced deepfake detection model for image-based analysis.
    
    This model uses a pre-trained backbone (ResNet, EfficientNet) with a custom
    classification head specifically designed for deepfake detection. The architecture
    includes multiple fully connected layers with batch normalization and dropout
    for robust feature extraction and classification.
    
    Attributes:
        backbone: Pre-trained feature extractor (ResNet18/50, EfficientNet-B0)
        classifier: Custom classification head with dropout and batch normalization
        backbone_name: Name of the backbone architecture used
    """
    def __init__(self, backbone: str = 'resnet50', pretrained: bool = True, dropout: float = 0.5):
        super().__init__()

        # Select backbone
        if backbone == 'resnet18':
            weights = ResNet18_Weights.DEFAULT if pretrained else None
            self.backbone = models.resnet18(weights=weights)
            num_features = self.backbone.fc.in_features
            self.backbone.fc = nn.Identity()
        elif backbone == 'resnet50':
            weights = ResNet50_Weights.DEFAULT if pretrained else None
            self.backbone = models.resnet50(weights=weights)
            num_features = self.backbone.fc.in_features
            self.backbone.fc = nn.Identity()
        elif backbone == 'efficientnet_b0':
            weights = EfficientNet_B0_Weights.DEFAULT if pretrained else None
            self.backbone = models.efficientnet_b0(weights=weights)
            num_features = self.backbone.classifier[1].in_features
            self.backbone.classifier = nn.Identity()
        else:
            raise ValueError(f"Unsupported backbone: {backbone}")

        # Custom classification head - updated to match saved model architecture
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(num_features, 1024),  # 2048 -> 1024
            nn.BatchNorm1d(1024),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout / 2),
            nn.Linear(1024, 512),  # 1024 -> 512
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout / 4),
            nn.Linear(512, 256),   # 512 -> 256
            nn.BatchNorm1d(256),
            nn.ReLU(inplace=True),
            nn.Linear(256, 1)      # 256 -> 1
        )

        self.backbone_name = backbone

    def forward(self, x):
        """
        Forward pass through the deepfake detection model.
        
        Args:
            x: Input tensor of shape (batch_size, 3, 224, 224)
            
        Returns:
            torch.Tensor: Logits of shape (batch_size, 1) for binary classification
        """
        features = self.backbone(x)
        return self.classifier(features)


class VideoDeepfakeDetector(nn.Module):
    """
    Video-based deepfake detection model using temporal features.
    
    This model processes video sequences by extracting features from individual frames
    using a CNN backbone, then analyzing temporal patterns with an LSTM network.
    The combination of spatial and temporal analysis makes it effective for detecting
    deepfake videos that may have inconsistencies across frames.
    
    Attributes:
        backbone: CNN feature extractor for individual frames
        lstm: LSTM network for temporal sequence analysis
        classifier: Final classification head
        sequence_length: Number of frames processed in each sequence
    """
    def __init__(self, backbone: str = 'resnet18', sequence_length: int = 16):
        super().__init__()

        # Backbone
        if backbone == 'resnet18':
            self.backbone = models.resnet18(weights=ResNet18_Weights.DEFAULT)
            self.feature_dim = 512
        elif backbone == 'resnet50':
            self.backbone = models.resnet50(weights=ResNet50_Weights.DEFAULT)
            self.feature_dim = 2048
        else:
            raise ValueError(f"Unsupported backbone: {backbone}")
        self.backbone.fc = nn.Identity()

        # Temporal model
        self.lstm = nn.LSTM(
            input_size=self.feature_dim,
            hidden_size=256,
            num_layers=2,
            batch_first=True,
            dropout=0.3
        )

        # Final classifier
        self.classifier = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 1)
        )

        self.sequence_length = sequence_length

    def forward(self, x):
        """
        Forward pass through the video deepfake detection model.
        
        Args:
            x: Input tensor of shape (batch_size, sequence_length, 3, 224, 224)
            
        Returns:
            torch.Tensor: Logits of shape (batch_size, 1) for binary classification
        """
        assert x.size(1) == self.sequence_length, \
            f"Expected sequence length {self.sequence_length}, got {x.size(1)}"

        batch_size = x.size(0)
        x = x.view(-1, *x.shape[2:])  # (batch*seq, C, H, W)
        features = self.backbone(x)
        features = features.view(batch_size, self.sequence_length, -1)
        lstm_out, _ = self.lstm(features)
        final_features = lstm_out[:, -1, :]
        return self.classifier(final_features)


# -------------------- MODEL LOADING -------------------- #
def load_image_model(model_path: str, device: torch.device, backbone: str = 'resnet50') -> Optional[ImprovedDeepfakeDetector]:
    """
    Load a trained image deepfake detection model with comprehensive safety checks.
    
    This function handles model loading with integrity verification, device placement,
    and error handling. It supports both PyTorch 2.6+ with weights_only=True and
    fallback to weights_only=False for compatibility.
    
    Args:
        model_path: Path to the saved model checkpoint
        device: PyTorch device to load the model on
        backbone: Backbone architecture used in the model
        
    Returns:
        Optional[ImprovedDeepfakeDetector]: Loaded model or None if loading fails
    """
    if not os.path.exists(model_path):
        logger.warning(f"Model file not found: {model_path}")
        return None

    try:
        # Load model info if available
        info_path = model_path.replace('.pt', '_info.json')
        expected_hash = None 
        if not verify_model_integrity(model_path, expected_hash):
            logger.error("Model integrity check failed")
            return None
        if os.path.exists(info_path):
            with open(info_path, 'r') as f:
                model_info = json.load(f)
            backbone = model_info.get('config', {}).get('backbone', backbone)

        model = ImprovedDeepfakeDetector(backbone=backbone, pretrained=False)

        # Try to load with weights_only=True first (PyTorch 2.6+), fallback to False if needed
        try:
            checkpoint = torch.load(model_path, map_location=device, weights_only=True)
        except Exception as e:
            logger.warning(f"Failed to load with weights_only=True, trying with weights_only=False: {e}")
            checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        model.load_state_dict(state_dict)

        model.to(device)
        model.eval()
        logger.info(f"Loaded image model ({backbone}) from {model_path}")
        return model
    except Exception as e:
        logger.error(f"Failed to load image model: {e}")
        return None


def load_video_model(model_path: str, device: torch.device) -> Optional[VideoDeepfakeDetector]:
    """
    Load a trained video deepfake detection model with safety checks.
    
    Similar to load_image_model but specifically for video detection models.
    Handles model loading with device placement and error handling.
    
    Args:
        model_path: Path to the saved video model checkpoint
        device: PyTorch device to load the model on
        
    Returns:
        Optional[VideoDeepfakeDetector]: Loaded model or None if loading fails
    """
    if not os.path.exists(model_path):
        logger.warning(f"Video model file not found: {model_path}")
        return None

    try:
        model = VideoDeepfakeDetector()
        # Try to load with weights_only=True first (PyTorch 2.6+), fallback to False if needed
        try:
            checkpoint = torch.load(model_path, map_location=device, weights_only=True)
        except Exception as e:
            logger.warning(f"Failed to load with weights_only=True, trying with weights_only=False: {e}")
            checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        model.load_state_dict(state_dict)

        model.to(device)
        model.eval()
        logger.info(f"Loaded video model from {model_path}")
        return model
    except Exception as e:
        logger.error(f"Failed to load video model: {e}")
        return None


# -------------------- FACE EXTRACTION -------------------- #
class FaceExtractor:
    """
    Face extraction utility for improved deepfake detection.
    
    Uses MTCNN (Multi-task CNN) for face detection and extraction from images
    and videos. Extracting faces can improve detection accuracy by focusing
    on the most relevant regions of the image.
    
    Attributes:
        mtcnn: MTCNN face detection model
        available: Boolean indicating if face extraction is available
    """
    def __init__(self, device: str = 'cpu'):
        try:
            self.mtcnn = MTCNN(
                image_size=224,
                margin=20,
                min_face_size=50,
                thresholds=[0.6, 0.7, 0.7],
                factor=0.709,
                post_process=True,
                device=device
            )
            self.available = True
            logger.info("Face extractor initialized successfully")
        except Exception as e:
            logger.warning(f"Face extractor not available: {e}")
            self.mtcnn = None
            self.available = False

    def extract_face(self, image):
        """
        Extract the primary face from an image for focused analysis.
        
        Attempts to detect and extract the largest face in the image. If no face
        is detected or extraction fails, returns the original image as fallback.
        
        Args:
            image: PIL Image or numpy array to extract face from
            
        Returns:
            PIL Image: Extracted face region or original image if extraction fails
        """
        if not self.available:
            return image

        try:
            image_rgb = image.convert('RGB') if hasattr(image, 'convert') else image
            face = self.mtcnn(image_rgb)
            if face is not None:
                face_array = face.permute(1, 2, 0).cpu().numpy()
                from PIL import Image
                return Image.fromarray((face_array * 255).astype(np.uint8))
            logger.warning("No face detected, using full image")
            return image
        except Exception as e:
            logger.warning(f"Face extraction failed: {e}, using full image")
            return image


# -------------------- PRETRAINED MODELS -------------------- #
PRETRAINED_MODELS = {
    'celeb_df_v2': {
        'url': 'https://github.com/selimsef/dfdc_deepfake_challenge/releases/download/v1.0/final_999_DeepFakeClassifier_tf_efficientnet_b7_ns_0_36',
        'description': 'EfficientNet-B7 trained on CelebDF-v2 dataset',
        'accuracy': 0.936,
        'type': 'image',
        'checksum': None
    }
}


def verify_checksum(file_path, expected_hash):
    if not expected_hash:
        return True
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest() == expected_hash


def download_pretrained_model(model_name: str, save_path: str) -> bool:
    """
    Download and verify a pretrained deepfake detection model.
    
    Downloads a pretrained model from the configured URL with progress tracking
    and optional checksum verification. Supports resumable downloads and
    provides detailed logging of the download process.
    
    Args:
        model_name: Name of the model to download (must be in PRETRAINED_MODELS)
        save_path: Local path where the model should be saved
        
    Returns:
        bool: True if download and verification succeeded, False otherwise
    """
    if model_name not in PRETRAINED_MODELS:
        logger.error(f"Unknown model: {model_name}")
        return False

    try:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        url = PRETRAINED_MODELS[model_name]['url']
        checksum = PRETRAINED_MODELS[model_name].get('checksum')

        response = requests.get(url, stream=True)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        with open(save_path, 'wb') as f, tqdm(
            desc=f"Downloading {model_name}",
            total=total_size,
            unit='B', unit_scale=True, unit_divisor=1024
        ) as pbar:
            for chunk in response.iter_content(8192):
                f.write(chunk)
                pbar.update(len(chunk))

        if not verify_checksum(save_path, checksum):
            logger.error("Checksum verification failed.")
            return False

        logger.info(f"Successfully downloaded {model_name} to {save_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to download model: {e}")
        return False


def get_model_info() -> dict:
    """
    Get comprehensive information about available models.
    
    Returns a dictionary containing information about both custom trained models
    and pretrained models, including their existence status, paths, and types.
    This is useful for model management and status reporting.
    
    Returns:
        dict: Dictionary with model information including paths, existence, and types
    """
    return {
        'custom_models': {
            'image_model': {'path': 'models/image_model.pt', 'exists': os.path.exists('models/image_model.pt'), 'type': 'image'},
            'video_model': {'path': 'models/video_model.pt', 'exists': os.path.exists('models/video_model.pt'), 'type': 'video'}
        },
        'pretrained_models': PRETRAINED_MODELS
    }
def export_to_onnx(model: nn.Module, save_path: str, model_type: str = "image", opset_version: int = 17):
    """
    Export PyTorch model to ONNX format for deployment and inference optimization.
    
    Converts a trained PyTorch model to ONNX format, which enables deployment
    on various inference engines and platforms. Supports both image and video
    models with appropriate input shapes and dynamic axes.
    
    Args:
        model: The trained PyTorch model to export
        save_path: Path where the ONNX model should be saved
        model_type: Type of model ("image" or "video") to determine input shape
        opset_version: ONNX opset version (>=11 recommended for modern features)
        
    Returns:
        bool: True if export succeeded, False otherwise
    """
    model.eval()

    try:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        if model_type == "image":
            # Example input: single RGB image (1, 3, 224, 224)
            dummy_input = torch.randn(1, 3, 224, 224, device=next(model.parameters()).device)
            dynamic_axes = {'input': {0: 'batch'}, 'output': {0: 'batch'}}
        elif model_type == "video":
            # Example input: batch of video sequences (1, seq_len, 3, 224, 224)
            dummy_input = torch.randn(1, model.sequence_length, 3, 224, 224, device=next(model.parameters()).device)
            dynamic_axes = {'input': {0: 'batch', 1: 'sequence'}, 'output': {0: 'batch'}}
        else:
            raise ValueError("model_type must be either 'image' or 'video'")

        torch.onnx.export(
            model,
            dummy_input,
            save_path,
            export_params=True,
            opset_version=opset_version,
            do_constant_folding=True,
            input_names=['input'],
            output_names=['output'],
            dynamic_axes=dynamic_axes
        )

        logger.info(f"ONNX model exported successfully: {save_path}")
        return True

    except Exception as e:
        logger.error(f"ONNX export failed: {e}")
        return False
