"""
Export models/image_model.pt to models/image_model.onnx and verify it.

Run from backend/:  pip install -r requirements-dev.txt && python export_onnx.py

Checks that ONNX Runtime matches PyTorch on the same inputs and prints
CPU latency for both, so the numbers come from the actual exported model.
"""
import time

import numpy as np
import onnxruntime as ort
import torch

from app.model import load_image_model, export_to_onnx

PT_PATH = "models/image_model.pt"
ONNX_PATH = "models/image_model.onnx"
RUNS = 20


def median_ms(fn) -> float:
    fn()  # warm-up
    times = []
    for _ in range(RUNS):
        start = time.perf_counter()
        fn()
        times.append((time.perf_counter() - start) * 1000)
    return float(np.median(times))


def main():
    model = load_image_model(PT_PATH, torch.device("cpu"))
    assert model is not None, f"could not load {PT_PATH}"
    assert export_to_onnx(model, ONNX_PATH, "image"), "ONNX export failed"

    session = ort.InferenceSession(ONNX_PATH, providers=["CPUExecutionProvider"])

    x = torch.randn(4, 3, 224, 224)  # batch of 4 also checks the dynamic batch axis
    with torch.no_grad():
        expected = model(x).numpy()
    actual = session.run(None, {"input": x.numpy()})[0]
    max_diff = float(np.abs(expected - actual).max())
    print(f"max |pytorch - onnx| logit diff: {max_diff:.2e}")
    assert max_diff < 1e-3, "ONNX output does not match PyTorch"

    one = x[:1]
    with torch.no_grad():
        pt_ms = median_ms(lambda: model(one))
    ort_ms = median_ms(lambda: session.run(None, {"input": one.numpy()}))
    print(f"median CPU latency, 1 image: pytorch {pt_ms:.1f} ms, onnxruntime {ort_ms:.1f} ms")


if __name__ == "__main__":
    main()
