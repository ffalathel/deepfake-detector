#!/usr/bin/env python3
"""
Parallel batch processing for faster extraction
"""
import os
import cv2
import random
import shutil
import subprocess
import time
from pathlib import Path
from tqdm import tqdm
import argparse
import json
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import multiprocessing

def extract_frames_from_video(video_path, output_dir, target_frames=50):
    """Extract frames from a single video - optimized version"""
    video_name = Path(video_path).stem
    cap = cv2.VideoCapture(str(video_path))
    
    if not cap.isOpened():
        return 0
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        cap.release()
        return 0
    
    # Calculate frame interval
    interval = max(1, total_frames // target_frames)
    
    extracted = 0
    frame_positions = range(0, total_frames, interval)[:target_frames]
    
    for pos in frame_positions:
        cap.set(cv2.CAP_PROP_POS_FRAMES, pos)
        ret, frame = cap.read()
        
        if not ret:
            continue
            
        # Quick quality check
        if frame.mean() > 20:  # Skip very dark frames
            output_path = output_dir / f"{video_name}_{extracted:04d}.jpg"
            # Use faster JPEG encoding
            cv2.imwrite(str(output_path), frame, 
                       [cv2.IMWRITE_JPEG_QUALITY, 85,  # Lower quality for speed
                        cv2.IMWRITE_JPEG_OPTIMIZE, 1])
            extracted += 1
    
    cap.release()
    return extracted

def process_videos_parallel(video_files, output_dir, target_total, max_workers=2):
    """Process multiple videos in parallel"""
    if not video_files:
        return 0
    
    frames_per_video = max(10, target_total // len(video_files))
    
    # Use process pool for CPU-intensive video processing
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        for video_file in video_files[:target_total//frames_per_video + 1]:
            future = executor.submit(extract_frames_from_video, 
                                   video_file, output_dir, frames_per_video)
            futures.append(future)
        
        total_extracted = 0
        for future in tqdm(futures, desc="Processing videos"):
            try:
                extracted = future.result(timeout=300)  # 5 minute timeout
                total_extracted += extracted
                if total_extracted >= target_total:
                    break
            except Exception as e:
                print(f"Video processing failed: {e}")
    
    return total_extracted

def download_large_batch(dataset, compression, num_videos, output_dir):
    """Download larger batch"""
    print(f"Downloading {num_videos} {dataset} videos...")
    
    batch_dir = Path(output_dir) / f"large_batch_{dataset}"
    batch_dir.mkdir(parents=True, exist_ok=True)
    
    cmd = [
        'python', 'download.py', str(batch_dir),
        '-d', dataset,
        '-c', compression,
        '-t', 'videos',
        '-n', str(num_videos),
        '--server', 'EU2'
    ]
    
    try:
        subprocess.run(cmd, check=True)
        return batch_dir
    except subprocess.CalledProcessError:
        return None

def fast_process_dataset(output_dir, target_real=10000, target_fake=10000):
    """Fast processing with larger batches and parallel extraction"""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    temp_dir = output_path / "temp_large_batches"
    temp_dir.mkdir(exist_ok=True)
    
    # Get CPU count for parallel processing
    cpu_count = multiprocessing.cpu_count()
    max_workers = min(2, cpu_count)  # Don't overwhelm the system
    print(f"Using {max_workers} parallel workers")
    
    # Process real images with larger batch
    print("Downloading real images in large batch...")
    real_batch_size = min(100, target_real // 50)  # Assume ~50 frames per video
    real_batch_dir = download_large_batch('original', 'c40', real_batch_size, temp_dir)
    
    if real_batch_dir:
        print("Extracting real images in parallel...")
        real_videos = list(real_batch_dir.rglob("*.mp4"))
        real_dir = output_path / "real"
        real_dir.mkdir(exist_ok=True)
        
        real_extracted = process_videos_parallel(real_videos, real_dir, 
                                                target_real, max_workers)
        print(f"Extracted {real_extracted} real images")
        
        # Cleanup
        shutil.rmtree(real_batch_dir)
        
        # Cooling break after real images
        print("Taking a 60-second cooling break...")
        import time
        time.sleep(60)
    
    # Process fake images
    print("Processing fake images...")
    manipulation_methods = ['Deepfakes', 'Face2Face', 'FaceSwap', 'NeuralTextures']
    fake_per_method = target_fake // len(manipulation_methods)
    total_fake = 0
    
    fake_dir = output_path / "fake"
    fake_dir.mkdir(exist_ok=True)
    
    for method in manipulation_methods:
        print(f"Processing {method}...")
        method_batch_size = min(50, fake_per_method // 50)
        
        method_batch_dir = download_large_batch(method, 'c40', method_batch_size, temp_dir)
        
        if method_batch_dir:
            method_videos = list(method_batch_dir.rglob("*.mp4"))
            method_extracted = process_videos_parallel(method_videos, fake_dir,
                                                     fake_per_method, max_workers)
            total_fake += method_extracted
            print(f"Extracted {method_extracted} {method} images")
            
            # Cleanup
            shutil.rmtree(method_batch_dir)
            
            # Cooling break after each method
            print("Taking a 30-second cooling break...")
            import time
            time.sleep(30)
    
    # Cleanup temp directory
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    
    # Summary
    summary = {
        'real_images': real_extracted,
        'fake_images': total_fake,
        'total_images': real_extracted + total_fake
    }
    
    with open(output_path / 'dataset_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\nCompleted! Real: {real_extracted}, Fake: {total_fake}")

def main():
    parser = argparse.ArgumentParser(description='Fast parallel batch processing')
    parser.add_argument('output_dir', help='Output directory')
    parser.add_argument('--real', type=int, default=10000)
    parser.add_argument('--fake', type=int, default=10000)
    
    args = parser.parse_args()
    
    fast_process_dataset(args.output_dir, args.real, args.fake)

if __name__ == "__main__":
    main()