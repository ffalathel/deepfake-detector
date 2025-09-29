"""
Quality-Based Dataset Cleanup Script - Relaxed Parameters
Filters out blurry and low-quality images to create clean training datasets
"""

import os
import cv2
import numpy as np
import shutil
from pathlib import Path
import json
import logging
from collections import Counter
import argparse
from tqdm import tqdm

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class QualityFilter:
    def __init__(self, config):
        self.config = config
        self.stats = {
            'total_processed': 0,
            'total_passed': 0,
            'total_filtered': 0,
            'filtered_by_reason': Counter(),
            'class_distribution': Counter()
        }
        
    def analyze_image_quality(self, image_path):
        """Analyze individual image quality with detailed metrics"""
        try:
            img = cv2.imread(str(image_path))
            if img is None:
                return None
            
            # Basic quality metrics
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
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
            
            # Quality assessment
            quality_score = 0
            issues = []
            
            # Sharpness check (most important)
            if metrics['sharpness'] < self.config.min_sharpness:
                issues.append('blurry')
                quality_score -= 3
            elif metrics['sharpness'] > self.config.max_sharpness:
                issues.append('over_sharp')
                quality_score -= 1
            else:
                quality_score += 2
            
            # Contrast check
            if metrics['contrast'] < self.config.min_contrast:
                issues.append('low_contrast')
                quality_score -= 2
            elif metrics['contrast'] > self.config.max_contrast:
                issues.append('high_contrast')
                quality_score -= 1
            else:
                quality_score += 1
            
            # Brightness check
            if metrics['brightness'] < self.config.min_brightness or metrics['brightness'] > self.config.max_brightness:
                issues.append('extreme_brightness')
                quality_score -= 2
            else:
                quality_score += 1
            
            # File size check
            if metrics['file_size'] < self.config.min_file_size:
                issues.append('small_file')
                quality_score -= 2
            else:
                quality_score += 1
            
            # Saturation check
            if metrics['saturation'] < self.config.min_saturation:
                issues.append('low_saturation')
                quality_score -= 1
            else:
                quality_score += 1
            
            metrics['quality_score'] = quality_score
            metrics['issues'] = issues
            metrics['passed_filter'] = quality_score >= self.config.min_quality_score
            
            return metrics
            
        except Exception as e:
            return {
                'error': str(e), 
                'path': str(image_path), 
                'filename': image_path.name,
                'passed_filter': False,
                'issues': ['error']
            }
    
    def filter_dataset(self, source_dir, target_dir, class_name):
        """Filter images in a source directory and copy good ones to target"""
        source_path = Path(source_dir)
        target_path = Path(target_dir)
        
        if not source_path.exists():
            logger.error(f"Source directory {source_dir} does not exist!")
            return [], []
        
        # Create target directory
        target_path.mkdir(parents=True, exist_ok=True)
        
        # Get all image files
        image_files = list(source_path.glob("*.jpg")) + list(source_path.glob("*.jpeg")) + list(source_path.glob("*.png"))
        logger.info(f"Found {len(image_files)} images in {source_dir}")
        
        passed_images = []
        filtered_images = []
        
        # Process images with progress bar
        for img_path in tqdm(image_files, desc=f"Filtering {class_name} images"):
            self.stats['total_processed'] += 1
            
            metrics = self.analyze_image_quality(img_path)
            if not metrics:
                continue
            
            if metrics.get('passed_filter', False):
                # Copy good image to target directory
                target_file = target_path / img_path.name
                try:
                    shutil.copy2(img_path, target_file)
                    passed_images.append(metrics)
                    self.stats['total_passed'] += 1
                    self.stats['class_distribution'][class_name] += 1
                except Exception as e:
                    logger.error(f"Failed to copy {img_path}: {e}")
            else:
                # Track filtering reasons
                filtered_images.append(metrics)
                self.stats['total_filtered'] += 1
                for issue in metrics.get('issues', []):
                    self.stats['filtered_by_reason'][issue] += 1
        
        logger.info(f"{class_name}: {len(passed_images)} passed, {len(filtered_images)} filtered")
        return passed_images, filtered_images
    
    def create_balanced_dataset(self, real_clean_dir, fake_clean_dir, target_size=None):
        """Create a balanced dataset by limiting to the smaller class size"""
        real_files = list(Path(real_clean_dir).glob("*.jpg"))
        fake_files = list(Path(fake_clean_dir).glob("*.jpg"))
        
        real_count = len(real_files)
        fake_count = len(fake_files)
        
        logger.info(f"Clean dataset sizes: Real={real_count}, Fake={fake_count}")
        
        if target_size is None:
            target_size = min(real_count, fake_count)
        
        # Balance the dataset
        if real_count > target_size:
            logger.info(f"Reducing real images from {real_count} to {target_size}")
            real_to_remove = real_files[target_size:]
            for file_path in real_to_remove:
                file_path.unlink()
        
        if fake_count > target_size:
            logger.info(f"Reducing fake images from {fake_count} to {target_size}")
            fake_to_remove = fake_files[target_size:]
            for file_path in fake_to_remove:
                file_path.unlink()
        
        # Final count
        final_real = len(list(Path(real_clean_dir).glob("*.jpg")))
        final_fake = len(list(Path(fake_clean_dir).glob("*.jpg")))
        
        logger.info(f"Final balanced dataset: Real={final_real}, Fake={final_fake}")
        return final_real, final_fake
    
    def generate_filtering_report(self, output_dir):
        """Generate comprehensive filtering report"""
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        report = {
            'filtering_config': vars(self.config),
            'filtering_stats': dict(self.stats),
            'filtered_by_reason': dict(self.stats['filtered_by_reason']),
            'class_distribution': dict(self.stats['class_distribution']),
            'summary': {
                'total_processed': self.stats['total_processed'],
                'total_passed': self.stats['total_passed'],
                'total_filtered': self.stats['total_filtered'],
                'pass_rate': f"{(self.stats['total_passed'] / self.stats['total_processed'] * 100):.1f}%",
                'filter_rate': f"{(self.stats['total_filtered'] / self.stats['total_processed'] * 100):.1f}%"
            }
        }
        
        # Save report
        with open(output_path / 'filtering_report.json', 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        # Save detailed stats
        with open(output_path / 'filtering_stats.txt', 'w') as f:
            f.write("DATASET FILTERING REPORT\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Total Images Processed: {self.stats['total_processed']}\n")
            f.write(f"Total Images Passed: {self.stats['total_passed']}\n")
            f.write(f"Total Images Filtered: {self.stats['total_filtered']}\n")
            f.write(f"Pass Rate: {report['summary']['pass_rate']}\n")
            f.write(f"Filter Rate: {report['summary']['filter_rate']}\n\n")
            
            f.write("FILTERING REASONS:\n")
            f.write("-" * 20 + "\n")
            for reason, count in self.stats['filtered_by_reason'].most_common():
                f.write(f"{reason}: {count} images\n")
            
            f.write("\nCLASS DISTRIBUTION:\n")
            f.write("-" * 20 + "\n")
            for class_name, count in self.stats['class_distribution'].most_common():
                f.write(f"{class_name}: {count} images\n")
        
        logger.info(f"Filtering report saved to {output_path}")
        return report

def main():
    parser = argparse.ArgumentParser(description='Quality-based dataset filtering - Relaxed parameters')
    parser.add_argument('--source-real', default='data/real', help='Source directory for real images')
    parser.add_argument('--source-fake', default='data/fake', help='Source directory for fake images')
    parser.add_argument('--target-real', default='data/real_clean', help='Target directory for clean real images')
    parser.add_argument('--target-fake', default='data/fake_clean', help='Target directory for clean fake images')
    parser.add_argument('--min-sharpness', type=float, default=150.0, help='Minimum sharpness threshold (eliminates blurry images)')
    parser.add_argument('--max-sharpness', type=float, default=1000.0, help='Maximum sharpness threshold')
    parser.add_argument('--min-contrast', type=float, default=40.0, help='Minimum contrast threshold (eliminates low contrast)')
    parser.add_argument('--max-contrast', type=float, default=100.0, help='Maximum contrast threshold')
    parser.add_argument('--min-brightness', type=float, default=60.0, help='Minimum brightness threshold (eliminates dark images)')
    parser.add_argument('--max-brightness', type=float, default=180.0, help='Maximum brightness threshold (eliminates overexposed)')
    parser.add_argument('--min-file-size', type=int, default=25000, help='Minimum file size in bytes (eliminates corrupted)')
    parser.add_argument('--min-saturation', type=float, default=20.0, help='Minimum saturation threshold')
    parser.add_argument('--min-quality-score', type=int, default=1, help='Minimum quality score to pass (quality-focused)')
    parser.add_argument('--balance-dataset', action='store_true', help='Balance the final dataset')
    parser.add_argument('--target-size', type=int, help='Target size for each class after balancing')
    
    args = parser.parse_args()
    
    # Create configuration
    config = args
    
    logger.info("Starting dataset quality filtering with QUALITY-FOCUSED parameters...")
    logger.info(f"Quality thresholds: Sharpness[{config.min_sharpness}-{config.max_sharpness}], "
                f"Contrast[{config.min_contrast}-{config.max_contrast}], "
                f"Brightness[{config.min_brightness}-{config.max_brightness}]")
    
    # Initialize quality filter
    filter_tool = QualityFilter(config)
    
    # Filter real images
    logger.info("Filtering real images...")
    real_passed, real_filtered = filter_tool.filter_dataset(
        config.source_real, config.target_real, 'real'
    )
    
    # Filter fake images
    logger.info("Filtering fake images...")
    fake_passed, fake_filtered = filter_tool.filter_dataset(
        config.source_fake, config.target_fake, 'fake'
    )
    
    # Balance dataset if requested
    if config.balance_dataset:
        logger.info("Balancing dataset...")
        final_real, final_fake = filter_tool.create_balanced_dataset(
            config.target_real, config.target_fake, config.target_size
        )
    
    # Generate report
    logger.info("Generating filtering report...")
    report = filter_tool.generate_filtering_report('analysis_output')
    
    # Print summary
    logger.info("=" * 60)
    logger.info("FILTERING COMPLETED")
    logger.info("=" * 60)
    logger.info(f"Total processed: {report['summary']['total_processed']}")
    logger.info(f"Total passed: {report['summary']['total_passed']}")
    logger.info(f"Total filtered: {report['summary']['total_filtered']}")
    logger.info(f"Pass rate: {report['summary']['pass_rate']}")
    logger.info(f"Filter rate: {report['summary']['filter_rate']}")
    
    if report['filtered_by_reason']:
        logger.info("\nTop filtering reasons:")
        for reason, count in sorted(report['filtered_by_reason'].items(), key=lambda x: x[1], reverse=True)[:5]:
            logger.info(f"  {reason}: {count} images")
    
    logger.info(f"\nClass distribution: {report['class_distribution']}")
    logger.info(f"\nDetailed report saved to: analysis_output/filtering_report.json")
    logger.info("Dataset cleanup completed successfully!")

if __name__ == "__main__":
    main()