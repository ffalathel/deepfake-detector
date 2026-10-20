# Backend-only Dockerfile for Hugging Face Spaces
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# No system packages needed: inference runs on ONNX Runtime, whose wheel is
# self-contained (no PyTorch, no OpenCV)

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip cache purge

# Copy the backend application
COPY . .

# Create necessary directories
RUN mkdir -p models logs data/fake data/real

# Expose Hugging Face default port
EXPOSE 7860

# Start the backend service
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
