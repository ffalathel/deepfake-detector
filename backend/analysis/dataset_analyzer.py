"""
Dataset Analysis Tool
Analyzes image quality, difficulty, and potential issues in the deepfake detection dataset
"""

import os
import cv2
import numpy as np
from pathlib import Path
import matplotlib.pyplot as plt
from PIL import Image
import json
import logging
from collections import Counter
import pandas as pd
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def analyze_image_quality(image_path):
    """Analyze individual image quality metrics"""
    try:
        img = cv2.imread(str(image_path))
        if img is None:
            return None
        
        # Basic quality metrics
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Calculate various quality indicators
        metrics = {
            'file_size': os.path.getsize(image_path),
            'dimensions': img.shape,
            'brightness': np.mean(gray),
            'contrast': np.std(gray),
            'sharpness': cv2.Laplacian(gray, cv2.CV_64F).var(),
            'noise_level': np.std(gray),
            'saturation': np.std(cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[:, :, 1]),
            'path': str(image_path),
            'filename': image_path.name
        }
        
        # Additional quality checks
        if metrics['sharpness'] < 100:
            metrics['quality_issue'] = 'blurry'
        elif metrics['contrast'] < 30:
            metrics['quality_issue'] = 'low_contrast'
        elif metrics['brightness'] < 50 or metrics['brightness'] > 200:
            metrics['quality_issue'] = 'extreme_brightness'
        else:
            metrics['quality_issue'] = 'good'
            
        return metrics
    except Exception as e:
        return {'error': str(e), 'path': str(image_path), 'filename': image_path.name}

def analyze_dataset_distribution():
    """Analyze the entire dataset distribution"""
    real_dir = Path("backend/data/real")
    fake_dir = Path("backend/data/fake")
    
    if not real_dir.exists() or not fake_dir.exists():
        logger.error("Data directories not found!")
        return None, None
    
    real_images = list(real_dir.glob("*.jpg"))
    fake_images = list(fake_dir.glob("*.jpg"))
    
    logger.info(f"Found {len(real_images)} real images")
    logger.info(f"Found {len(fake_images)} fake images")
    
    # Sample analysis (limit to avoid memory issues)
    sample_size = 10000
    logger.info(f"Analyzing {sample_size} images from each class...")
    
    real_sample = real_images[:sample_size]
    fake_sample = fake_images[:sample_size]
    
    # Analyze real images
    logger.info("Analyzing real images...")
    real_metrics = []
    for i, img_path in enumerate(real_sample):
        if i % 100 == 0:
            logger.info(f"Processed {i}/{len(real_sample)} real images")
        metrics = analyze_image_quality(img_path)
        if metrics and 'error' not in metrics:
            metrics['class'] = 'real'
            real_metrics.append(metrics)
    
    # Analyze fake images
    logger.info("Analyzing fake images...")
    fake_metrics = []
    for i, img_path in enumerate(fake_sample):
        if i % 100 == 0:
            logger.info(f"Processed {i}/{len(fake_sample)} fake images")
        metrics = analyze_image_quality(img_path)
        if metrics and 'error' not in metrics:
            metrics['class'] = 'fake'
            fake_metrics.append(metrics)
    
    logger.info(f"Successfully analyzed {len(real_metrics)} real and {len(fake_metrics)} fake images")
    
    return real_metrics, fake_metrics

def generate_quality_report(real_metrics, fake_metrics):
    """Generate comprehensive quality analysis report"""
    
    if not real_metrics or not fake_metrics:
        logger.error("No metrics available for analysis")
        return
    
    # Combine all metrics
    all_metrics = real_metrics + fake_metrics
    
    # Create DataFrame for analysis
    df = pd.DataFrame(all_metrics)
    
    # Quality distribution analysis
    quality_analysis = {
        'total_images_analyzed': len(all_metrics),
        'real_images': len(real_metrics),
        'fake_images': len(fake_metrics),
        'quality_distribution': df['quality_issue'].value_counts().to_dict(),
        'class_distribution': df['class'].value_counts().to_dict(),
        
        # Real vs Fake quality comparison
        'real_avg_brightness': df[df['class'] == 'real']['brightness'].mean(),
        'fake_avg_brightness': df[df['class'] == 'fake']['brightness'].mean(),
        'real_avg_contrast': df[df['class'] == 'real']['contrast'].mean(),
        'fake_avg_contrast': df[df['class'] == 'fake']['contrast'].mean(),
        'real_avg_sharpness': df[df['class'] == 'real']['sharpness'].mean(),
        'fake_avg_sharpness': df[df['class'] == 'fake']['sharpness'].mean(),
        'real_avg_noise': df[df['class'] == 'real']['noise_level'].mean(),
        'fake_avg_noise': df[df['class'] == 'fake']['noise_level'].mean(),
        
        # File size analysis
        'real_avg_file_size': df[df['class'] == 'real']['file_size'].mean(),
        'fake_avg_file_size': df[df['class'] == 'fake']['file_size'].mean(),
        
        # Dimension analysis
        'real_dimensions': {str(k): v for k, v in df[df['class'] == 'real']['dimensions'].value_counts().to_dict().items()},
        'fake_dimensions': {str(k): v for k, v in df[df['class'] == 'fake']['dimensions'].value_counts().to_dict().items()},
    }
    
    # Identify potential issues
    issues = []
    
    # Check for quality imbalance
    if abs(quality_analysis['real_avg_sharpness'] - quality_analysis['fake_avg_sharpness']) > 50:
        issues.append(f"Sharpness imbalance: Real ({quality_analysis['real_avg_sharpness']:.1f}) vs Fake ({quality_analysis['fake_avg_sharpness']:.1f})")
    
    if abs(quality_analysis['real_avg_contrast'] - quality_analysis['fake_avg_contrast']) > 20:
        issues.append(f"Contrast imbalance: Real ({quality_analysis['real_avg_contrast']:.1f}) vs Fake ({quality_analysis['fake_avg_contrast']:.1f})")
    
    # Check for quality issues
    quality_issues = df['quality_issue'].value_counts()
    if quality_issues.get('blurry', 0) > len(all_metrics) * 0.1:
        issues.append(f"High number of blurry images: {quality_issues.get('blurry', 0)} ({quality_issues.get('blurry', 0)/len(all_metrics)*100:.1f}%)")
    
    if quality_issues.get('low_contrast', 0) > len(all_metrics) * 0.1:
        issues.append(f"High number of low contrast images: {quality_issues.get('low_contrast', 0)} ({quality_issues.get('low_contrast', 0)/len(all_metrics)*100:.1f}%)")
    
    quality_analysis['identified_issues'] = issues
    quality_analysis['analysis_timestamp'] = datetime.now().isoformat()
    
    return quality_analysis

def save_detailed_metrics(real_metrics, fake_metrics, output_dir="analysis_output"):
    """Save detailed metrics for further analysis"""
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    # Save individual metrics
    with open(output_path / 'real_metrics.json', 'w') as f:
        json.dump(real_metrics, f, indent=2, default=str)
    
    with open(output_path / 'fake_metrics.json', 'w') as f:
        json.dump(fake_metrics, f, indent=2, default=str)
    
    # Create CSV for easy analysis
    all_metrics = real_metrics + fake_metrics
    df = pd.DataFrame(all_metrics)
    df.to_csv(output_path / 'all_metrics.csv', index=False)
    
    logger.info(f"Detailed metrics saved to {output_path}")

def create_visualization(real_metrics, fake_metrics, output_dir="analysis_output"):
    """Create visualizations of the analysis"""
    try:
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # Create comparison plots
        fig, axes = plt.subplots(2, 3, figsize=(18, 12))
        fig.suptitle('Dataset Quality Analysis', fontsize=16)
        
        # Brightness comparison
        real_brightness = [m['brightness'] for m in real_metrics if 'brightness' in m]
        fake_brightness = [m['brightness'] for m in fake_metrics if 'brightness' in m]
        
        axes[0,0].hist(real_brightness, alpha=0.7, label='Real', bins=30)
        axes[0,0].hist(fake_brightness, alpha=0.7, label='Fake', bins=30)
        axes[0,0].set_title('Brightness Distribution')
        axes[0,0].set_xlabel('Brightness')
        axes[0,0].set_ylabel('Count')
        axes[0,0].legend()
        
        # Contrast comparison
        real_contrast = [m['contrast'] for m in real_metrics if 'contrast' in m]
        fake_contrast = [m['contrast'] for m in fake_metrics if 'contrast' in m]
        
        axes[0,1].hist(real_contrast, alpha=0.7, label='Real', bins=30)
        axes[0,1].hist(fake_contrast, alpha=0.7, label='Fake', bins=30)
        axes[0,1].set_title('Contrast Distribution')
        axes[0,1].set_xlabel('Contrast')
        axes[0,1].set_ylabel('Count')
        axes[0,1].legend()
        
        # Sharpness comparison
        real_sharpness = [m['sharpness'] for m in real_metrics if 'sharpness' in m]
        fake_sharpness = [m['sharpness'] for m in fake_metrics if 'sharpness' in m]
        
        axes[0,2].hist(real_sharpness, alpha=0.7, label='Real', bins=30)
        axes[0,2].hist(fake_sharpness, alpha=0.7, label='Fake', bins=30)
        axes[0,2].set_title('Sharpness Distribution')
        axes[0,2].set_xlabel('Sharpness')
        axes[0,2].set_ylabel('Count')
        axes[0,2].legend()
        
        # Quality issues
        all_metrics = real_metrics + fake_metrics
        quality_counts = Counter([m.get('quality_issue', 'unknown') for m in all_metrics])
        
        axes[1,0].pie(quality_counts.values(), labels=quality_counts.keys(), autopct='%1.1f%%')
        axes[1,0].set_title('Overall Quality Distribution')
        
        # File size comparison
        real_sizes = [m['file_size']/1024 for m in real_metrics if 'file_size' in m]  # Convert to KB
        fake_sizes = [m['file_size']/1024 for m in fake_metrics if 'file_size' in m]
        
        axes[1,1].boxplot([real_sizes, fake_sizes], labels=['Real', 'Fake'])
        axes[1,1].set_title('File Size Distribution (KB)')
        axes[1,1].set_ylabel('File Size (KB)')
        
        # Class balance
        class_counts = Counter([m['class'] for m in all_metrics])
        axes[1,2].bar(class_counts.keys(), class_counts.values())
        axes[1,2].set_title('Class Distribution')
        axes[1,2].set_ylabel('Count')
        
        plt.tight_layout()
        plt.savefig(output_path / 'quality_analysis.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"Visualizations saved to {output_path / 'quality_analysis.png'}")
        
    except Exception as e:
        logger.error(f"Failed to create visualizations: {e}")

def main():
    """Main analysis function"""
    logger.info("Starting dataset analysis...")
    
    # Analyze dataset
    real_metrics, fake_metrics = analyze_dataset_distribution()
    
    if not real_metrics or not fake_metrics:
        logger.error("Analysis failed - no metrics generated")
        return
    
    # Generate quality report
    logger.info("Generating quality report...")
    quality_report = generate_quality_report(real_metrics, fake_metrics)
    
    # Save detailed metrics
    logger.info("Saving detailed metrics...")
    save_detailed_metrics(real_metrics, fake_metrics)
    
    # Create visualizations
    logger.info("Creating visualizations...")
    create_visualization(real_metrics, fake_metrics)
    
    # Print summary
    logger.info("=" * 60)
    logger.info("DATASET ANALYSIS SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Total images analyzed: {quality_report['total_images_analyzed']}")
    logger.info(f"Real images: {quality_report['real_images']}")
    logger.info(f"Fake images: {quality_report['fake_images']}")
    logger.info(f"Class balance: {quality_report['class_distribution']}")
    logger.info(f"Quality distribution: {quality_report['quality_distribution']}")
    
    if quality_report['identified_issues']:
        logger.info("\n🚨 IDENTIFIED ISSUES:")
        for issue in quality_report['identified_issues']:
            logger.info(f"  - {issue}")
    else:
        logger.info("\n✅ No major quality issues identified")
    
    # Save final report
    with open('analysis_output/quality_report.json', 'w') as f:
        json.dump(quality_report, f, indent=2, default=str)
    
    logger.info(f"\nDetailed report saved to: analysis_output/quality_report.json")
    logger.info("Analysis completed successfully!")

if __name__ == "__main__":
    main()
