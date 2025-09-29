"""
Utility functions for deepfake detection training
"""
import tempfile
import os
import random
import logging
import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_curve, auc, average_precision_score
from typing import Optional, Tuple, Dict, Any, List
from pathlib import Path
from tqdm import tqdm

logger = logging.getLogger(__name__)

def set_seed(seed: int = 42):
    """
    Set random seed for reproducibility across all random number generators.
    
    Ensures that training runs produce identical results when given the same seed.
    This includes PyTorch, NumPy, Python random, and CUDA operations.
    
    Args:
        seed: Random seed value (default: 42)
    """
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    # For deterministic behavior (may reduce performance)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
    logger.info(f"Random seed set to {seed}")

def get_device(prefer_gpu: bool = True) -> torch.device:
    """
    Get the available device for training, preferring GPU if available.
    
    Automatically detects and returns the best available device for training.
    Logs device information for debugging and monitoring purposes.
    
    Args:
        prefer_gpu: Whether to prefer GPU over CPU (default: True)
        
    Returns:
        torch.device: The selected device for training
    """
    if prefer_gpu and torch.cuda.is_available():
        device = torch.device('cuda')
        logger.info(f"Using GPU device: {torch.cuda.get_device_name(0)}")
    else:
        device = torch.device('cpu')
        logger.info("Using CPU device")
    return device

def save_checkpoint(
    model: torch.nn.Module,
    optimizer: torch.optim.Optimizer,
    scheduler: Optional[torch.optim.lr_scheduler._LRScheduler],
    scaler: Optional[torch.cuda.amp.GradScaler],
    epoch: int,
    metrics: Dict[str, float],
    output_dir: Path,
    is_best: bool = False,
    logger: Optional[logging.Logger] = None
):
    """
    Save model checkpoint with atomic write to prevent corruption.
    
    Creates comprehensive checkpoints containing model state, optimizer state,
    scheduler state, and training metrics. Uses atomic writes to prevent
    checkpoint corruption during training interruptions.
    
    Args:
        model: The PyTorch model to save
        optimizer: The optimizer state to save
        scheduler: The learning rate scheduler state (optional)
        scaler: The gradient scaler state for mixed precision (optional)
        epoch: Current training epoch
        metrics: Dictionary containing training metrics
        output_dir: Directory to save the checkpoint
        is_best: Whether this is the best model so far
        logger: Logger instance for logging (optional)
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    checkpoint = {
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'metrics': metrics,
        'is_best': is_best
    }
    
    if scheduler is not None:
        checkpoint['scheduler_state_dict'] = scheduler.state_dict()
    if scaler is not None:
        checkpoint['scaler_state_dict'] = scaler.state_dict()

    def atomic_save(obj, filepath):
        """
        Atomic save to prevent checkpoint corruption.
        
        Uses temporary files and atomic rename operations to ensure
        checkpoint integrity even if the process is interrupted.
        
        Args:
            obj: Object to save (checkpoint dictionary)
            filepath: Target file path for the checkpoint
        """
        filepath = Path(filepath)
        with tempfile.NamedTemporaryFile(dir=filepath.parent, delete=False, suffix='.tmp') as tmp:
            torch.save(obj, tmp.name)
            temp_path = tmp.name
        os.replace(temp_path, filepath)
    
    # Save regular checkpoint
    checkpoint_path = output_dir / f'checkpoint_epoch_{epoch}.pt'
    atomic_save(checkpoint, checkpoint_path)
    
    # Also maintain a rolling pointer to the latest checkpoint
    latest_path = output_dir / 'checkpoint.pt'
    atomic_save(checkpoint, latest_path)
    
    if logger:
        logger.info(f"Checkpoint saved at epoch {epoch} to {checkpoint_path}")
        logger.info(f"Updated latest checkpoint pointer: {latest_path}")
    
    if is_best:
        best_path = output_dir / 'image_model.pt'
        atomic_save(checkpoint, best_path)
        if logger:
            logger.info(f"Best model saved at epoch {epoch} to {best_path}")
    
    
def load_checkpoint(
    checkpoint_path: str,
    model: torch.nn.Module,
    optimizer: Optional[torch.optim.Optimizer] = None,
    scheduler: Optional[torch.optim.lr_scheduler._LRScheduler] = None,
    scaler: Optional[torch.cuda.amp.GradScaler] = None,
    logger: Optional[logging.Logger] = None,
    map_location: Optional[str] = None
) -> Tuple[int, Dict[str, float]]:
    """
    Load checkpoint and restore training state.
    
    Loads model weights, optimizer state, scheduler state, and training
    metrics from a saved checkpoint. Handles missing components gracefully.
    
    Args:
        checkpoint_path: Path to the checkpoint file
        model: The PyTorch model to load weights into
        optimizer: The optimizer to restore state (optional)
        scheduler: The scheduler to restore state (optional)
        scaler: The gradient scaler to restore state (optional)
        logger: Logger instance for logging (optional)
        map_location: Device mapping for loading (optional)
        
    Returns:
        Tuple[int, Dict[str, float]]: Last epoch and metrics from checkpoint
        
    Raises:
        FileNotFoundError: If checkpoint file doesn't exist
    """
    checkpoint_path = Path(checkpoint_path)
    
    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")
        
    checkpoint = torch.load(checkpoint_path, map_location=map_location or "cpu", weights_only=False)
    
    # Load model weights
    model.load_state_dict(checkpoint["model_state_dict"])
    
    # Optionally restore optimizer
    if optimizer and "optimizer_state_dict" in checkpoint:
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
    
    # Optionally restore scheduler
    if scheduler and "scheduler_state_dict" in checkpoint:
        scheduler.load_state_dict(checkpoint["scheduler_state_dict"])
    
    # Optionally restore AMP scaler
    if scaler and "scaler_state_dict" in checkpoint:
        scaler.load_state_dict(checkpoint["scaler_state_dict"])
    
    epoch = checkpoint.get("epoch", 0)
    metrics = checkpoint.get("metrics", {})
    
    if logger:
        logger.info(f"Loaded checkpoint from {checkpoint_path} (epoch {epoch})")
    
    return epoch, metrics

def calculate_metrics(outputs: torch.Tensor, targets: torch.Tensor, threshold: float = 0.5) -> Dict[str, float]:
    """
    Calculate comprehensive metrics from model outputs and true labels.
    
    Computes accuracy, precision, recall, F1-score, AUC, and average precision
    for both binary and multi-class classification tasks. Handles edge cases
    gracefully and provides fallback values when metrics cannot be calculated.
    
    Args:
        outputs: Model output logits
        targets: True labels
        threshold: Classification threshold for binary tasks (default: 0.5)
        
    Returns:
        Dict[str, float]: Dictionary containing all calculated metrics
    """
    metrics: Dict[str, float] = {}

    outputs = outputs.detach()
    targets = targets.detach()

    # Normalize shapes
    if outputs.dim() == 2 and outputs.shape[1] > 1:
        # Multi-class logits: use softmax -> predicted class by argmax
        probs = torch.softmax(outputs, dim=1).cpu().numpy()
        preds = np.argmax(probs, axis=1)
        targets_np = targets.cpu().numpy().flatten().astype(int)
        # Basic metrics (use macro averages for multi-class)
        metrics['accuracy'] = float(accuracy_score(targets_np, preds))
        metrics['precision_macro'] = float(precision_score(targets_np, preds, average='macro', zero_division=0))
        metrics['recall_macro'] = float(recall_score(targets_np, preds, average='macro', zero_division=0))
        metrics['f1_macro'] = float(f1_score(targets_np, preds, average='macro', zero_division=0))
        # Multi-class AUC using One-vs-Rest if possible
        try:
            from sklearn.metrics import roc_auc_score
            # roc_auc_score expects shape (n_samples, n_classes) for probs
            metrics['roc_auc_ovr'] = float(roc_auc_score(targets_np, probs, multi_class='ovr'))
        except Exception:
            metrics['roc_auc_ovr'] = 0.0
    else:
        # Binary / single-output case: ensure 1D probs
        probs = torch.sigmoid(outputs).cpu().numpy().flatten()
        preds = (probs > threshold).astype(int)
        targets_np = targets.cpu().numpy().flatten().astype(int)

        metrics['accuracy'] = float(accuracy_score(targets_np, preds))
        metrics['precision'] = float(precision_score(targets_np, preds, zero_division=0))
        metrics['recall'] = float(recall_score(targets_np, preds, zero_division=0))
        metrics['f1'] = float(f1_score(targets_np, preds, zero_division=0))

        # AUC and avg precision only valid when both classes present
        if len(np.unique(targets_np)) > 1:
            try:
                fpr, tpr, _ = roc_curve(targets_np, probs)
                metrics['auc'] = float(auc(fpr, tpr))
                metrics['avg_precision'] = float(average_precision_score(targets_np, probs))
            except Exception as e:
                logger.warning(f"AUC calculation failed: {e}")
                metrics['auc'] = 0.5
                metrics['avg_precision'] = 0.5
        else:
            metrics['auc'] = 0.5
            metrics['avg_precision'] = float(np.mean(targets_np) if len(targets_np) > 0 else 0.5)

    return metrics

class EarlyStopping:
    """
    Early stopping with model checkpointing and device consistency.
    
    Monitors a specified metric during training and stops training early
    if no improvement is observed for a specified number of epochs.
    Automatically saves and restores the best model weights.
    
    Attributes:
        patience: Number of epochs to wait for improvement
        min_delta: Minimum change to qualify as improvement
        metric: Metric to monitor for early stopping
        mode: Whether to maximize ('max') or minimize ('min') the metric
        best_score: Best metric score observed so far
        counter: Number of epochs without improvement
        best_weights: Best model weights saved to CPU
        device: Device for consistent weight handling
    """
    def __init__(self, patience: int = 15, min_delta: float = 1e-4, metric: str = 'f1', mode: str = 'max'):
        """
        Initialize early stopping monitor.
        
        Args:
            patience: Number of epochs to wait for improvement
            min_delta: Minimum change to qualify as improvement
            metric: Metric name to monitor (e.g., 'f1', 'accuracy', 'loss')
            mode: Whether to maximize ('max') or minimize ('min') the metric
        """
        self.patience = patience
        self.min_delta = min_delta
        self.metric = metric
        self.mode = mode
        self.best_score = None
        self.counter = 0
        self.best_weights = None
        self.device = None  # Track device for consistency

    def __call__(self, metrics: Dict[str, float], model: torch.nn.Module) -> bool:
        """
        Check if early stopping should be triggered.
        
        Args:
            metrics: Dictionary containing current epoch metrics
            model: The model to save weights from
            
        Returns:
            bool: True if early stopping should be triggered
            
        Raises:
            ValueError: If the specified metric is not found in metrics
        """
        score = metrics.get(self.metric)
        if score is None:
            raise ValueError(f"Metric '{self.metric}' not found in metrics")
        
        # Store device on first call
        if self.device is None:
            self.device = next(model.parameters()).device
        
        if self.best_score is None:
            self.best_score = score
            self.save_checkpoint(model)
        elif self._is_better(score):
            self.best_score = score
            self.counter = 0
            self.save_checkpoint(model)
        else:
            self.counter += 1
        
        return self.counter >= self.patience
    
    def _is_better(self, score: float) -> bool:
        """
        Check if the current score is better than the best score.
        
        Args:
            score: Current metric score
            
        Returns:
            bool: True if current score is better
        """
        if self.mode == 'max':
            return score > self.best_score + self.min_delta
        else:
            return score < self.best_score - self.min_delta
    
    def save_checkpoint(self, model: torch.nn.Module):
        """
        Save best model weights to CPU for device independence.
        
        Stores the current model weights on CPU to ensure they can be
        loaded on any device later.
        
        Args:
            model: The model to save weights from
        """
        self.best_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}
    
    def load_best_weights(self, model: torch.nn.Module):
        """
        Load best model weights with proper device handling.
        
        Restores the best model weights to the current model, ensuring
        they are moved to the correct device.
        
        Args:
            model: The model to load weights into
        """
        if self.best_weights:
            # Get current model device
            current_device = next(model.parameters()).device
            # Move weights to correct device
            device_weights = {k: v.to(current_device) for k, v in self.best_weights.items()}
            model.load_state_dict(device_weights)
            logger.info("Loaded best weights from early stopping")


def clip_gradients(model: torch.nn.Module, max_norm: float = 1.0, norm_type: float = 2.0):
    """
    Clip gradients to avoid exploding gradients.
    
    Applies gradient clipping to prevent gradient explosion during training,
    which can cause training instability and poor convergence.
    
    Args:
        model: The PyTorch model
        max_norm: Maximum gradient norm allowed
        norm_type: Type of norm to use for clipping (default: 2.0 for L2 norm)
    """
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm, norm_type)

def get_lr_scheduler(
    optimizer: torch.optim.Optimizer,
    scheduler_name: str = 'StepLR',
    step_size: int = 5,
    gamma: float = 0.1,
    patience: int = 3,
    min_lr: float = 1e-6
):
    """
    Get learning rate scheduler for training.
    
    Creates and returns a learning rate scheduler based on the specified type.
    Supports multiple scheduler types including StepLR, ReduceLROnPlateau,
    and CosineAnnealingLR.
    
    Args:
        optimizer: The optimizer to schedule
        scheduler_name: Type of scheduler to create
        step_size: Step size for StepLR and CosineAnnealingLR
        gamma: Multiplicative factor for StepLR
        patience: Patience for ReduceLROnPlateau
        min_lr: Minimum learning rate for ReduceLROnPlateau
        
    Returns:
        torch.optim.lr_scheduler._LRScheduler: The configured scheduler
        
    Raises:
        ValueError: If unsupported scheduler type is specified
    """
    from torch.optim.lr_scheduler import StepLR, ReduceLROnPlateau, CosineAnnealingLR

    if scheduler_name == 'StepLR':
        scheduler = StepLR(optimizer, step_size=step_size, gamma=gamma)
    elif scheduler_name == 'ReduceLROnPlateau':
        scheduler = ReduceLROnPlateau(optimizer, patience=patience, min_lr=min_lr)
    elif scheduler_name == 'CosineAnnealingLR':
        scheduler = CosineAnnealingLR(optimizer, T_max=step_size)
    else:
        raise ValueError(f"Unsupported scheduler: {scheduler_name}")
    return scheduler

class MixedPrecisionTrainer:
    """
    Mixed precision training helper for automatic mixed precision (AMP).
    
    Provides a context manager for mixed precision training, which can
    significantly speed up training on modern GPUs while maintaining
    numerical stability.
    
    Attributes:
        use_amp: Whether to use automatic mixed precision
        scaler: Gradient scaler for mixed precision training
    """
    def __init__(self, use_amp: bool = True):
        """
        Initialize mixed precision trainer.
        
        Args:
            use_amp: Whether to use automatic mixed precision
        """
        self.use_amp = use_amp
        if self.use_amp and not torch.cuda.is_available():
            self.use_amp = False
        self.scaler = torch.cuda.amp.GradScaler() if self.use_amp else None

    def __enter__(self):
        """
        Enter the mixed precision context.
        
        Returns:
            torch.cuda.amp.GradScaler: The gradient scaler for AMP
        """
        return self.scaler

    def __exit__(self, exc_type, exc_val, exc_tb):
        """
        Exit the mixed precision context.
        
        Args:
            exc_type: Exception type
            exc_val: Exception value
            exc_tb: Exception traceback
        """
        pass

class WarmupScheduler:
    """
    Learning rate warmup scheduler for stable training start.
    
    Gradually increases the learning rate from 0 to the target learning rate
    over a specified number of warmup epochs. This helps stabilize training
    at the beginning and can improve convergence.
    
    Attributes:
        optimizer: The optimizer to schedule
        warmup_epochs: Number of epochs for warmup
        base_lr: Target learning rate after warmup
    """
    def __init__(self, optimizer: torch.optim.Optimizer, warmup_epochs: int, base_lr: float):
        """
        Initialize warmup scheduler.
        
        Args:
            optimizer: The optimizer to schedule
            warmup_epochs: Number of epochs for warmup
            base_lr: Target learning rate after warmup
        """
        self.optimizer = optimizer
        self.warmup_epochs = warmup_epochs
        self.base_lr = base_lr
    
    def step(self, epoch: float):
        """
        Update learning rate during warmup period.
        
        Linearly increases the learning rate from 0 to base_lr over
        the warmup period.
        
        Args:
            epoch: Current epoch (can be fractional)
        """
        if epoch < self.warmup_epochs:
            lr = self.base_lr * epoch / self.warmup_epochs
            for param_group in self.optimizer.param_groups:
                param_group['lr'] = lr

def train_one_epoch(
    model: torch.nn.Module,
    dataloader: torch.utils.data.DataLoader,
    device: torch.device,
    criterion: torch.nn.Module,
    optimizer: torch.optim.Optimizer,
    scaler: Optional[torch.cuda.amp.GradScaler] = None,
    clip_grad: Optional[float] = None,
    warmup_scheduler: Optional['WarmupScheduler'] = None,
    current_epoch: int = 0,
    scheduler: Optional[torch.optim.lr_scheduler._LRScheduler] = None,
    accumulation_steps: int = 1,  # NEW: Add gradient accumulation
) -> Tuple[float, Dict[str, float], List[int], List[int], List[float]]:
    """
    Run one training epoch with proper mixed precision and gradient clipping.
    
    Executes a complete training epoch including forward pass, loss calculation,
    backward pass, gradient clipping, and optimizer step. Supports mixed precision
    training, gradient accumulation, and learning rate warmup.
    
    Args:
        model: The PyTorch model to train
        dataloader: DataLoader for training data
        device: Device to train on
        criterion: Loss function
        optimizer: Optimizer for training
        scaler: Gradient scaler for mixed precision (optional)
        clip_grad: Gradient clipping threshold (optional)
        warmup_scheduler: Learning rate warmup scheduler (optional)
        current_epoch: Current epoch number
        scheduler: Learning rate scheduler (optional)
        accumulation_steps: Number of steps for gradient accumulation
        
    Returns:
        Tuple containing:
            - Average training loss
            - Dictionary of training metrics
            - List of true labels
            - List of predictions
            - List of prediction scores
    """
    model.train()
    running_loss = 0.0
    all_logits = []
    all_targets = []
    all_probs = []
    all_preds = []
    
    # FIX: Add gradient accumulation counter
    optimizer.zero_grad()
    accumulation_counter = 0

    # Apply warmup if needed
    if warmup_scheduler and current_epoch < getattr(warmup_scheduler, 'warmup_epochs', 0):
        warmup_scheduler.step(current_epoch)

    for inputs, targets in tqdm(dataloader, desc="Training"):
        inputs = inputs.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True).float().unsqueeze(1)

        # Mixed precision forward pass
        if scaler is not None:
            with torch.cuda.amp.autocast():
                logits = model(inputs)
                loss = criterion(logits, targets) / accumulation_steps  # Scale loss
            
            # Backward pass with scaling
            scaler.scale(loss).backward()
        else:
            # Standard training
            logits = model(inputs)
            loss = criterion(logits, targets) / accumulation_steps  # Scale loss
            loss.backward()
        
        # FIX: Gradient accumulation logic
        accumulation_counter += 1
        if accumulation_counter % accumulation_steps == 0:
            # Gradient clipping
            if clip_grad is not None:
                if scaler is not None:
                    scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), clip_grad)
            
            # Optimizer step
            if scaler is not None:
                scaler.step(optimizer)
                scaler.update()
            else:
                optimizer.step()
            
            optimizer.zero_grad()

        # Update running loss (multiply by accumulation_steps to get correct total)
        running_loss += loss.item() * inputs.size(0) * accumulation_steps

        # Predictions
        with torch.no_grad():
            probs = torch.sigmoid(logits).detach().cpu().numpy().flatten()
            preds = (probs > 0.5).astype(int)
            targets_np = targets.cpu().numpy().flatten().astype(int)

            all_logits.extend(logits.detach().cpu().numpy().flatten())
            all_targets.extend(targets_np.tolist())
            all_probs.extend(probs.tolist())
            all_preds.extend(preds.tolist())

    # Average loss over dataset
    avg_loss = running_loss / len(dataloader.dataset)

    # Calculate metrics
    targets_np = np.array(all_targets)
    preds_np = np.array(all_preds)
    probs_np = np.array(all_probs)

    metrics = {
        "accuracy": accuracy_score(targets_np, preds_np),
        "precision": precision_score(targets_np, preds_np, zero_division=0),
        "recall": recall_score(targets_np, preds_np, zero_division=0),
        "f1": f1_score(targets_np, preds_np, zero_division=0),
    }

    # AUC calculation with safety checks
    if len(np.unique(targets_np)) > 1 and len(probs_np) > 1:
        try:
            fpr, tpr, _ = roc_curve(targets_np, probs_np)
            metrics["auc"] = auc(fpr, tpr)
            metrics["avg_precision"] = average_precision_score(targets_np, probs_np)
        except Exception as e:
            logger.warning(f"AUC calculation failed: {e}")
            metrics["auc"] = 0.5
            metrics["avg_precision"] = 0.5
    else:
        metrics["auc"] = 0.5
        metrics["avg_precision"] = np.mean(targets_np) if len(targets_np) > 0 else 0.5

    return avg_loss, metrics, all_targets, all_preds, all_probs

def validate_one_epoch(
    model: torch.nn.Module,
    dataloader: torch.utils.data.DataLoader,
    device: torch.device,
    criterion: torch.nn.Module,
) -> Tuple[float, Dict[str, float], List, List, List]:
    """
    Run one validation epoch.
    
    Executes a complete validation epoch with the model in evaluation mode.
    Computes loss and comprehensive metrics without updating model parameters.
    
    Args:
        model: The PyTorch model to validate
        dataloader: DataLoader for validation data
        device: Device to validate on
        criterion: Loss function
        
    Returns:
        Tuple containing:
            - Average validation loss
            - Dictionary of validation metrics
            - List of true labels
            - List of predictions
            - List of prediction scores
    """
    model.eval()
    running_loss = 0.0
    total_samples = 0
    all_logits = [] # Raw model outputs for threshold tuning
    all_targets = [] # Ground truth labels
    all_probs = [] # Sigmoid probabilities
    all_preds = [] # Binary predictions

    with torch.no_grad():
        for inputs, targets in tqdm(dataloader, desc="Validating"):
            inputs = inputs.to(device)
            targets = targets.to(device).float().unsqueeze(1)
            
            # Get raw logits
            logits = model(inputs)
            loss = criterion(logits, targets)
            running_loss += loss.item() * inputs.size(0)
            total_samples += inputs.size(0)

            # Calculate probabilities and predictions
            probs = torch.sigmoid(logits).cpu().numpy().flatten()
            preds = (probs > 0.5).astype(int)
            targets_np = targets.cpu().numpy().flatten().astype(int)
            
            # Store all values
            all_logits.extend(logits.cpu().numpy().flatten())
            all_targets.extend(targets_np)
            all_probs.extend(probs)
            all_preds.extend(preds)


    # FIX: Use total_samples instead of len(dataloader)
    avg_loss = running_loss / total_samples
    
    # Calculate metrics using numpy arrays
    targets_np = np.array(all_targets)
    preds_np = np.array(all_preds)
    probs_np = np.array(all_probs)
    
    metrics = {
        'accuracy': accuracy_score(targets_np, preds_np),
        'precision': precision_score(targets_np, preds_np, zero_division=0),
        'recall': recall_score(targets_np, preds_np, zero_division=0),
        'f1': f1_score(targets_np, preds_np, zero_division=0),
    }
    
    # AUC metrics
    if len(np.unique(targets_np)) > 1 and len(probs_np) > 1:
        try:
            fpr, tpr, _ = roc_curve(targets_np, probs_np)
            metrics['auc'] = auc(fpr, tpr)
            metrics['avg_precision'] = average_precision_score(targets_np, probs_np)
        except Exception as e:
            logger.warning(f"AUC calculation failed: {e}")
            metrics['auc'] = 0.5
            metrics['avg_precision'] = 0.5
    else:
        metrics['auc'] = 0.5
        metrics['avg_precision'] = np.mean(targets_np) if len(targets_np) > 0 else 0.5


    return avg_loss, metrics, all_targets, all_preds, all_probs

def create_directory_structure(base_path: str):
    """
    Create necessary directory structure for the project.
    
    Creates the standard directory structure for deepfake detection training,
    including data splits, model storage, and logging directories.
    
    Args:
        base_path: Base path where directories should be created
    """
    base_path = Path(base_path)
    directories = [
        'data/train/real',
        'data/train/fake',
        'data/val/real', 
        'data/val/fake',
        'data/test/real',
        'data/test/fake',
        'models',
        'logs',
        'logs/tensorboard'
    ]
    
    for directory in directories:
        (base_path / directory).mkdir(parents=True, exist_ok=True)
    
    print(f"Created directory structure in {base_path}")

def count_parameters(model: torch.nn.Module) -> Tuple[int, int]:
    """
    Count total and trainable parameters in a model.
    
    Args:
        model: The PyTorch model to analyze
        
    Returns:
        Tuple[int, int]: (total_parameters, trainable_parameters)
    """
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    return total_params, trainable_params

def get_model_size(model: torch.nn.Module) -> float:
    """
    Get model size in MB.
    
    Calculates the total memory footprint of the model including
    parameters and buffers.
    
    Args:
        model: The PyTorch model to analyze
        
    Returns:
        float: Model size in megabytes
    """
    param_size = 0
    buffer_size = 0
    
    for param in model.parameters():
        param_size += param.nelement() * param.element_size()
    
    for buffer in model.buffers():
        buffer_size += buffer.nelement() * buffer.element_size()
    
    size_mb = (param_size + buffer_size) / 1024 / 1024
    return size_mb

def freeze_backbone(model: torch.nn.Module, freeze: bool = True):
    """
    Freeze or unfreeze backbone parameters.
    
    Controls whether the backbone (feature extractor) parameters are
    trainable or frozen during training.
    
    Args:
        model: The PyTorch model
        freeze: Whether to freeze (True) or unfreeze (False) backbone parameters
    """
    for name, param in model.named_parameters():
        if 'backbone' in name:
            param.requires_grad = not freeze
    
    status = "frozen" if freeze else "unfrozen"
    print(f"Backbone parameters {status}")

def print_model_summary(model: torch.nn.Module):
    """
    Print a comprehensive summary of the model.
    
    Displays model architecture information including parameter counts,
    model size, and other relevant details.
    
    Args:
        model: The PyTorch model to summarize
    """
    total_params, trainable_params = count_parameters(model)
    model_size = get_model_size(model)
    
    print("\n" + "="*50)
    print("MODEL SUMMARY")
    print("="*50)
    print(f"Total parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")
    print(f"Model size: {model_size:.2f} MB")
    print("="*50 + "\n")

def setup_environment():
    """
    Setup environment variables and settings for optimal training.
    
    Configures PyTorch settings for better performance and memory usage,
    including CUDA optimization and thread management.
    """
    # Set memory allocation strategy for better GPU utilization
    if torch.cuda.is_available():
        torch.backends.cudnn.benchmark = True
        # Set memory fraction to avoid OOM
        torch.cuda.empty_cache()
    
    # Set number of threads for CPU operations
    torch.set_num_threads(min(8, torch.get_num_threads()))
    
    print("Environment setup completed")

def validate_config(config) -> bool:
    """
    Validate configuration parameters for training.
    
    Checks that all configuration parameters are valid and compatible.
    Provides detailed error messages for any issues found.
    
    Args:
        config: Training configuration object to validate
        
    Returns:
        bool: True if configuration is valid, False otherwise
    """
    errors = []
    
    # Check paths
    if not os.path.exists(config.data_path):
        errors.append(f"Data path does not exist: {config.data_path}")
    
    # Check numeric values
    if config.batch_size <= 0:
        errors.append("Batch size must be positive")
    
    if config.learning_rate <= 0:
        errors.append("Learning rate must be positive")
    
    if config.epochs <= 0:
        errors.append("Number of epochs must be positive")
    
    if config.train_ratio + config.val_ratio >= 1.0:
        errors.append("Train ratio + validation ratio must be less than 1.0")
    
    if errors:
        print("Configuration validation errors:")
        for error in errors:
            print(f"  - {error}")
        return False
    
    return True

def log_system_info():
    """
    Log comprehensive system information for debugging.
    
    Displays information about PyTorch version, CUDA availability,
    GPU details, and system specifications.
    """
    logger.info("=" * 50)
    logger.info("SYSTEM INFORMATION")
    logger.info("=" * 50)
    logger.info(f"PyTorch version: {torch.__version__}")
    logger.info(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        try:
            logger.info(f"CUDA version: {torch.version.cuda}")
            logger.info(f"GPU count: {torch.cuda.device_count()}")
            for i in range(torch.cuda.device_count()):
                logger.info(f"GPU {i}: {torch.cuda.get_device_name(i)}")
        except Exception as e:
            logger.warning(f"Failed to query GPU details: {e}")
    logger.info(f"CPU count: {os.cpu_count()}")
    logger.info("=" * 50)

class LearningRateFinder:
    """
    Automatic learning rate finder using exponential increase and loss tracking.
    
    Implements a learning rate finder that exponentially increases the learning
    rate during training and tracks the loss to find the optimal learning rate.
    Based on the approach described in "Cyclical Learning Rates for Training
    Neural Networks" by Leslie N. Smith.
    
    Attributes:
        model: The model to train
        optimizer: The optimizer to use
        criterion: The loss function
        device: Device to train on
        min_lr: Minimum learning rate to test
        max_lr: Maximum learning rate to test
        num_iter: Number of iterations to run
        original_lrs: Original learning rates to restore
    """
    
    def __init__(self, model, optimizer, criterion, device, min_lr=1e-7, max_lr=10, num_iter=100):
        """
        Initialize the learning rate finder.
        
        Args:
            model: The model to train
            optimizer: The optimizer to use
            criterion: The loss function
            device: Device to train on
            min_lr: Minimum learning rate to test
            max_lr: Maximum learning rate to test
            num_iter: Number of iterations to run
        """
        self.model = model
        self.optimizer = optimizer
        self.criterion = criterion
        self.device = device
        self.min_lr = min_lr
        self.max_lr = max_lr
        self.num_iter = num_iter
        
        # Store original learning rates
        self.original_lrs = [group['lr'] for group in optimizer.param_groups]
        
    def find_lr(self, dataloader):
        """
        Find optimal learning rate using exponential increase.
        
        Runs training with exponentially increasing learning rates and
        tracks the loss to identify the optimal learning rate range.
        
        Args:
            dataloader: DataLoader for training data
            
        Returns:
            Tuple containing:
                - optimal_lr: The optimal learning rate found
                - lr_history: List of learning rates tested
                - loss_history: List of corresponding losses
        """
        self.model.train()
        
        # Calculate learning rate multiplier
        lr_mult = (self.max_lr / self.min_lr) ** (1 / self.num_iter)
        
        # Set initial learning rate
        for group in self.optimizer.param_groups:
            group['lr'] = self.min_lr
        
        lr_history = []
        loss_history = []
        
        # Create iterator for the dataloader
        data_iter = iter(dataloader)
        
        for i in range(self.num_iter):
            try:
                inputs, targets = next(data_iter)
            except StopIteration:
                # Restart iterator if we run out of data
                data_iter = iter(dataloader)
                inputs, targets = next(data_iter)
            
            inputs = inputs.to(self.device)
            targets = targets.to(self.device).float().unsqueeze(1)
            
            # Forward pass
            self.optimizer.zero_grad()
            outputs = self.model(inputs)
            loss = self.criterion(outputs, targets)
            
            # Backward pass
            loss.backward()
            self.optimizer.step()
            
            # Record learning rate and loss
            current_lr = self.optimizer.param_groups[0]['lr']
            lr_history.append(current_lr)
            loss_history.append(loss.item())
            
            # Increase learning rate exponentially
            for group in self.optimizer.param_groups:
                group['lr'] *= lr_mult
            
            # Stop if loss explodes
            if len(loss_history) > 10 and loss_history[-1] > 4 * min(loss_history[-10:]):
                logger.warning("Loss exploded, stopping learning rate finder")
                break
        
        # Restore original learning rates
        for group, original_lr in zip(self.optimizer.param_groups, self.original_lrs):
            group['lr'] = original_lr
        
        # Find optimal learning rate (minimum loss)
        min_loss_idx = np.argmin(loss_history)
        optimal_lr = lr_history[min_loss_idx]
        
        logger.info(f"Optimal learning rate found: {optimal_lr:.2e}")
        
        return optimal_lr, lr_history, loss_history

def find_optimal_learning_rate(model, optimizer, criterion, dataloader, device, **kwargs):
    """
    Convenience function to find optimal learning rate.
    
    Creates a LearningRateFinder instance and runs the learning rate
    finding process.
    
    Args:
        model: The model to train
        optimizer: The optimizer to use
        criterion: The loss function
        dataloader: DataLoader for training data
        device: Device to train on
        **kwargs: Additional arguments for LearningRateFinder
        
    Returns:
        Tuple containing optimal learning rate and history
    """
    lr_finder = LearningRateFinder(model, optimizer, criterion, device, **kwargs)
    return lr_finder.find_lr(dataloader)