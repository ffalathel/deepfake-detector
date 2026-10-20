"""Check the served predictions against frames with known labels.

Run before uploading a new model to the Space (from backend/):
    python check_labels.py <data_dir> [model_path]

<data_dir> is the training dataset layout, with fake/ and real/ subfolders.
The frames can't live in this repo (FaceForensics++ terms forbid redistribution),
so this is a local check rather than part of CI.
"""
import random
import sys
from pathlib import Path

from PIL import Image

from app.main import MODEL_PATH, load_onnx_model, predict_image

data = Path(sys.argv[1])
model = load_onnx_model(sys.argv[2] if len(sys.argv) > 2 else MODEL_PATH)
if model is None:
    sys.exit("Model not found")

random.seed(0)
passed = True
for folder, expected in [("fake", "ai_generated"), ("real", "real")]:
    files = sorted((data / folder).glob("*.jpg"))
    files = random.sample(files, min(50, len(files)))
    hits = sum(predict_image(Image.open(f).convert("RGB"), model)[0] == expected for f in files)
    print(f"{folder}: {hits}/{len(files)} predicted {expected}")
    passed &= hits >= 0.8 * len(files)

print("PASS" if passed else "FAIL: predictions don't match the labels")
sys.exit(0 if passed else 1)
