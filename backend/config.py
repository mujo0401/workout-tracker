# backend/config.py
import os

# --- Basic Stream and Server Configuration ---
CAMERA_NAME = "MainCam"
RTSP_URL = os.environ.get("RTSP_URL", "rtsp://Equanox:80858081@10.0.0.226:554/stream2")
SOCKET_PORT = int(os.environ.get("SOCKET_PORT", 5000)) # Ensure port is an integer

# --- Object Detection Model Configuration ---
# Path to the ONNX model file
MODEL_PATH = os.environ.get("MODEL_PATH", "yolov5s.onnx")
# Path to the file containing class names (one per line)
CLASSES_PATH = os.environ.get("CLASSES_PATH", "coco.names")

# Model Input Size (YOLOv5 often uses 640x640)
INPUT_WIDTH = int(os.environ.get("INPUT_WIDTH", 320))
INPUT_HEIGHT = int(os.environ.get("INPUT_HEIGHT", 320))

# Confidence threshold to filter weak detections (overall box confidence)
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", 0.45))
# Score threshold for filtering classes within a detection (class probability)
SCORE_THRESHOLD = float(os.environ.get("SCORE_THRESHOLD", 0.5))
# Non-Maximum Suppression (NMS) threshold to remove overlapping boxes
NMS_THRESHOLD = float(os.environ.get("NMS_THRESHOLD", 0.45))

# Optional: Add a print statement to confirm loading (can be removed later)
print("-" * 30)
print("Configuration Loaded (config.py):")
print(f"  CAMERA_NAME: {CAMERA_NAME}")
print(f"  RTSP_URL: {RTSP_URL}")
print(f"  SOCKET_PORT: {SOCKET_PORT}")
print(f"  MODEL_PATH: {MODEL_PATH}")
print(f"  CLASSES_PATH: {CLASSES_PATH}")
print(f"  INPUT_WIDTH: {INPUT_WIDTH}")
print(f"  INPUT_HEIGHT: {INPUT_HEIGHT}")
print(f"  CONFIDENCE_THRESHOLD: {CONFIDENCE_THRESHOLD}")
print(f"  SCORE_THRESHOLD: {SCORE_THRESHOLD}")
print(f"  NMS_THRESHOLD: {NMS_THRESHOLD}")
print("-" * 30)