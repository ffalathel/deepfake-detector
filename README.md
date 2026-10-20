# Deepfake Detector

A full-stack web app that estimates whether an uploaded image is real or AI-generated. A ResNet50 model trained in PyTorch is exported to ONNX and served by a FastAPI backend on Hugging Face Spaces; the Next.js frontend runs on Vercel.

**Live API:** https://ffalathel-deepfake-detector.hf.space ([docs](https://ffalathel-deepfake-detector.hf.space/docs))

![Python](https://img.shields.io/badge/Python-3.11-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.156-red)
![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-1.31-blue)

## Features

- **Image analysis**: real vs AI-generated prediction with a calibrated confidence score, an explanation, and image details
- **Bilingual UI**: English and Arabic, built with Tailwind CSS and Framer Motion
- **Lightweight serving**: ONNX Runtime on CPU, no PyTorch in the production image
- **CI/CD**: every backend change is built, smoke-tested, and deployed to the Space automatically
- **Video analysis**: not available yet; `/analyze-video` returns a "coming soon" response

## Architecture

```
Browser ──> Next.js on Vercel ──(server-side proxy, multipart)──> FastAPI on Hugging Face Spaces ──> ONNX Runtime
            src/app/api/analyze-image                              backend/app/main.py
```

The browser never calls the backend directly: the Next.js API route `/api/analyze-image` forwards the upload to the Space. `/api/warmup` pings the Space on page load and from a daily Vercel cron, because free Spaces sleep when idle.

### Backend (`backend/`)
- **FastAPI** with `POST /analyze-image` accepting multipart uploads (`UploadFile`)
- **Inference**: `models/image_model.onnx` runs on ONNX Runtime (`CPUExecutionProvider`). Preprocessing (resize to 224×224, ImageNet normalization) is done in NumPy and is identical to the torchvision pipeline used in training
- **Confidence calibration**: temperature scaling, bounded to 0.1–0.9
- **Validation**: content type and extension checks; corrupted images return `400`, a missing model returns `503`
- **Rate limiting**: 10 requests per minute per IP (in memory)

### Model
- **Architecture**: ResNet50 backbone with a custom head (1024 → 512 → 256 → 1, batch norm and dropout), binary logit output
- **Export**: `backend/export_onnx.py` uses `torch.onnx.export` (opset 17, dynamic batch axis, constant folding) and asserts that ONNX Runtime output matches PyTorch (max logit difference ~1e-6)

### Training Data
The image model was trained on images from the [FaceForensics++](https://github.com/ondyari/FaceForensics) dataset, 17,434 images in total:

| Split | Images |
|-------|--------|
| Train | 12,203 (fake: 5,995, real: 6,208) |
| Validation | 2,614 |
| Test | 2,617 |

Classes: `fake`, `real`.

## Performance

Measured on the live Space (free `cpu-basic` tier), 10 requests with a 1920×1080 JPEG:

| Metric | Median | Range |
|--------|--------|-------|
| Server-side processing (decode, preprocess, inference, calibration) | 0.05 s | 0.04–0.09 s |

Docker image size (`linux/amd64`):

| Version | Size |
|---------|------|
| PyTorch serving (torch, OpenCV, system libraries, 316 MB checkpoint) | 3.83 GB |
| ONNX Runtime serving (105 MB model) | 854 MB |

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (optional)
- `huggingface_hub` (`pip install huggingface_hub`) to fetch the model

The model (`image_model.onnx`) is stored on the Hugging Face Space, not in git.

### Local Development

1. **Clone the repository and fetch the model**
   ```bash
   git clone https://github.com/ffalathel/deepfake-detector.git
   cd deepfake-detector
   hf download ffalathel/deepfake-detector models/image_model.onnx --repo-type space --local-dir backend
   ```

2. **Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 7860
   ```

   Or run it in Docker, exactly as the Space does:
   ```bash
   docker build -t deepfake-backend backend
   docker run -p 7860:7860 deepfake-backend
   ```

3. **Frontend** (from the repo root, pointed at the local backend)
   ```bash
   npm install
   BACKEND_URL=http://localhost:7860 npm run dev
   ```

4. **Open** http://localhost:3000 (API docs at http://localhost:7860/docs)

### Environment Variables

| Variable | Used by | Purpose |
|----------|---------|---------|
| `BACKEND_URL` | Next.js API routes | Backend URL (defaults to the live Space) |
| `TRAINING_MODE` | Backend | `true` skips model loading and returns `503` from `/analyze-image` |

## Deployment

- **Frontend**: Vercel builds the Next.js app from the repo root (`vercel.json`), including the daily warm-up cron.
- **Backend**: the Hugging Face Space builds `backend/Dockerfile` (`python:3.11-slim`, pinned dependencies, no system packages). On every push to `main` that touches `backend/`, [GitHub Actions](.github/workflows/backend.yml):
  1. downloads the model from the Space, builds the image, and runs `backend/smoke_test.sh` against the container
  2. uploads the code to the Space using the `HF_TOKEN` repository secret
  3. waits until the Space is running the new commit, then smoke-tests the live URL

  Pull requests run step 1 only.
- **Updating the model**: re-export with `python export_onnx.py` (from `backend/`, needs `requirements-dev.txt` and `models/image_model.pt`), check the served labels against known frames with `python check_labels.py <data_dir>` (a folder with `fake/` and `real/`), then upload it:
  ```bash
  hf upload ffalathel/deepfake-detector backend/models/image_model.onnx models/image_model.onnx --repo-type space
  ```

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API information |
| `GET` | `/health` | Service status and whether the model is loaded |
| `POST` | `/analyze-image` | Analyze an image (JPEG, PNG, GIF, WebP, BMP) |
| `POST` | `/analyze-video` | Placeholder, returns "coming soon" |
| `GET` | `/docs` | Interactive OpenAPI docs |

```bash
curl -X POST https://ffalathel-deepfake-detector.hf.space/analyze-image -F "file=@image.jpg"
```

```json
{
  "prediction": "ai_generated",
  "confidence": 0.85,
  "explanation": "This image shows strong signs of AI generation...",
  "details": {
    "model_used": "Custom AI Detection Model v1.0",
    "processing_time": 0.81,
    "file_size": "1.77 MB",
    "image_dimensions": "1920x1080",
    "detected_features": ["Strong synthetic artifacts detected", "Inconsistent lighting patterns"]
  }
}
```

## Testing

```bash
# Backend smoke test (health, valid image, corrupted image, wrong content type)
backend/smoke_test.sh http://localhost:7860
backend/smoke_test.sh https://ffalathel-deepfake-detector.hf.space

# ONNX export parity check and latency comparison
cd backend && python export_onnx.py

# Frontend
npm run lint
npm run type-check
npm run build
```

`test-api.sh` runs a broader set of checks against the live API.

## Project Structure

```
deepfake-detector/
├── backend/                  # FastAPI backend (deployed to the Hugging Face Space)
│   ├── app/
│   │   ├── main.py           # Endpoints, ONNX inference, calibration
│   │   ├── model.py          # PyTorch model definitions, loading, ONNX export
│   │   └── utils.py          # Validation and processing helpers
│   ├── models/               # image_model.onnx (fetched from the Space)
│   ├── Dockerfile            # Backend image, built by the Space and CI
│   ├── export_onnx.py        # PyTorch -> ONNX export with parity check
│   ├── smoke_test.sh         # API smoke test used by CI
│   ├── requirements.txt      # Server dependencies (pinned)
│   ├── requirements-dev.txt  # Training and export dependencies
│   └── config.yaml           # Training configuration
├── src/
│   ├── app/
│   │   ├── api/              # Next.js API routes (proxy to the backend, warm-up)
│   │   ├── page.tsx          # Main page
│   │   └── layout.tsx        # Root layout
│   └── components/           # FileUpload, ResultDisplay, LoadingSpinner, LanguageToggle
├── .github/workflows/        # CI/CD to the Hugging Face Space
├── test-api.sh               # Live API checks
├── vercel.json               # Vercel config and warm-up cron
└── package.json
```

## Limitations

- Detection is probabilistic; confidence is capped at 90% and results should be treated as guidance.
- Video analysis is not implemented yet.
- CORS currently allows all origins, and the rate limit is per server process.
