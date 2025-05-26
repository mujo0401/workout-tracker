import os
import time
import cv2
import numpy as np
import threading
import traceback
from collections import deque
from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import flask_socketio
from flask_socketio import SocketIO
from openai import OpenAI

# Check CUDA and GStreamer availability
def check_system_capabilities():
    """Check if CUDA and GStreamer are available on the system."""
    cuda_available = False
    gstreamer_available = False
    nvdec_available = False  # NVIDIA decoder specifically
    
    print("\n🔍 CHECKING SYSTEM CAPABILITIES...")
    print("=================================")
    
    # Check OpenCV version
    try:
        print(f"OpenCV Version: {cv2.__version__}")
    except AttributeError:
        print("OpenCV Version: Unknown (attribute missing)")
    
    # Check for CUDA availability
    try:
        if hasattr(cv2, 'cuda') and hasattr(cv2.cuda, 'getCudaEnabledDeviceCount'):
            cuda_available = cv2.cuda.getCudaEnabledDeviceCount() > 0
            if cuda_available:
                print(f"✅ CUDA is available with {cv2.cuda.getCudaEnabledDeviceCount()} device(s)")
                
                # Print CUDA device properties
                try:
                    for i in range(cv2.cuda.getCudaEnabledDeviceCount()):
                        try:
                            gpu_props = cv2.cuda.getDevice(i)
                            print(f"   - GPU {i}: {cv2.cuda.printCudaDeviceInfo(i)}")
                        except AttributeError:
                            print(f"   - GPU {i}: Unable to get device properties")
                except Exception as e:
                    print(f"   - Unable to enumerate CUDA devices: {e}")
                    
                # Check if CUDA modules are available
                cuda_modules = []
                if hasattr(cv2, 'cuda') and hasattr(cv2.cuda, 'Stream'):
                    cuda_modules.append('Stream')
                if hasattr(cv2, 'cuda') and hasattr(cv2.cuda, 'GpuMat'):
                    cuda_modules.append('GpuMat')
                
                if cuda_modules:
                    print(f"   - CUDA modules available: {', '.join(cuda_modules)}")
                else:
                    print("   - Warning: CUDA is available but core modules are missing")
                    
            else:
                print("❌ CUDA is not available in this OpenCV build")
        else:
            print("❌ CUDA module is not available in this OpenCV build")
            cuda_available = False
    except Exception as e:
        print(f"❌ Error checking CUDA availability: {e}")
        cuda_available = False
    
    # Check GPU properties
    try:
        import subprocess
        gpu_info = subprocess.check_output("nvidia-smi", shell=True).decode()
        print("\n📊 NVIDIA GPU INFO:")
        for line in gpu_info.split('\n')[:10]:  # First 10 lines with most relevant info
            if 'NVIDIA-SMI' in line or 'GPU Name' in line or 'MiB' in line:
                print(f"   {line}")
    except:
        print("❌ Could not retrieve NVIDIA GPU info (nvidia-smi not available)")
    
    # Check for GStreamer support
    try:
        # Check for GStreamer support in OpenCV build
        try:
            if hasattr(cv2, 'getBuildInformation') and 'GStreamer' in cv2.getBuildInformation():
                print("✅ OpenCV was built with GStreamer support")
                has_gstreamer_build = True
            else:
                print("❌ OpenCV was NOT built with GStreamer support")
                has_gstreamer_build = False
        except Exception as e:
            print(f"❌ Error checking OpenCV build information: {e}")
            has_gstreamer_build = False
            
        # Define constants if missing
        if not hasattr(cv2, 'CAP_GSTREAMER'):
            print("   - CAP_GSTREAMER constant not found, using fallback value")
            cv2.CAP_GSTREAMER = 1800  # This is the standard value for CAP_GSTREAMER
            
        # Create a simple test pipeline
        gstreamer_available = False
        try:
            test_pipeline = "videotestsrc num-buffers=1 ! videoconvert ! appsink"
            test_cap = cv2.VideoCapture(test_pipeline, cv2.CAP_GSTREAMER)
            
            if test_cap.isOpened():
                gstreamer_available = True
                print("✅ GStreamer is working with OpenCV")
                test_cap.release()
                
                # Test NVIDIA decoder
                try:
                    # Try to create a pipeline with NVIDIA decoder
                    nvdec_test = "videotestsrc num-buffers=1 ! videoconvert ! nvh264dec ! videoconvert ! appsink"
                    nvdec_cap = cv2.VideoCapture(nvdec_test, cv2.CAP_GSTREAMER)
                    if nvdec_cap.isOpened():
                        nvdec_available = True
                        print("✅ NVIDIA hardware decoding is available through GStreamer")
                        nvdec_cap.release()
                    else:
                        print("❌ NVIDIA hardware decoding not available through GStreamer")
                        nvdec_available = False
                except Exception as e:
                    print(f"❌ Error testing NVIDIA decoder: {e}")
                    nvdec_available = False
            else:
                print("❌ GStreamer is not working with OpenCV")
                gstreamer_available = False
        except Exception as e:
            print(f"❌ Error testing GStreamer: {e}")
            gstreamer_available = False
            nvdec_available = False
    except Exception as e:
        print(f"❌ Error checking GStreamer availability: {e}")
        gstreamer_available = False
        nvdec_available = False
    
    # Print system recommendations
    if not cuda_available or not gstreamer_available:
        print("\n⚠️ SYSTEM RECOMMENDATIONS:")
        if not cuda_available:
            print("  - Install CUDA toolkit and rebuild OpenCV with CUDA support")
            print("  - Ensure you have the opencv-contrib-python-gpu package installed")
        if not gstreamer_available:
            print("  - Install GStreamer and rebuild OpenCV with GStreamer support")
            print("  - On Windows, make sure GStreamer 1.0 is installed and in your PATH")
            print("  - Make sure you have the required plugins (e.g., nvdec, nvenc)")
    
    print("=================================\n")
    
    return cuda_available, gstreamer_available, nvdec_available

# Call this function at startup
CUDA_AVAILABLE, GSTREAMER_AVAILABLE, NVDEC_AVAILABLE = check_system_capabilities()

# --- Configuration Loading ---
try:
    from config import (
        RTSP_URL, SOCKET_PORT, CAMERA_NAME, MODEL_PATH, CLASSES_PATH,
        INPUT_WIDTH, INPUT_HEIGHT, CONFIDENCE_THRESHOLD, SCORE_THRESHOLD, NMS_THRESHOLD
    )
except ImportError:
    print("Error: config.py not found or missing required variables.")
    exit(1)

# Stream processing constants
FRAME_QUEUE_SIZE     = 2
DEFAULT_JPEG_QUALITY = 75
EMIT_RESIZE_SCALE    = 1.0
TARGET_FPS           = 30
EMIT_INTERVAL        = 1.0 / TARGET_FPS
RESIZE_BEFORE_EMIT   = False

# Recovery/monitoring constants
REOPEN_DELAY_SECONDS     = 5
MAX_CONSECUTIVE_FAILURES = 5
MAX_FRAME_DELAY_WARN     = 2.0
KEEP = {"person"}

# --- Camera State ---
camera_state = {
    CAMERA_NAME: {
        "frame_queue": deque(maxlen=FRAME_QUEUE_SIZE),
        "last_frame_time_capture": time.time(),
        "last_frame_time_emit": time.time(),
        "capture_active": True,
        "stream_failures": 0,
        "last_failure_time": 0,
        "ai_processor": None,
        "last_fps_check_time": time.time(),
        "emitted_frame_counter": 0,
        "current_emit_fps": 0,
        "current_jpeg_quality": DEFAULT_JPEG_QUALITY,
        "current_emit_scale": EMIT_RESIZE_SCALE,
        "last_detection_data": None,
    }
}

# --- AI Detector Import and Initialization ---
AI_ENABLED = True
DNN_BACKEND = None
DNN_TARGET   = None

if AI_ENABLED:
    try:
        from detection import ExerciseDetector
        print("INFO: AI Processing Enabled.")
    except ImportError:
        print("ERROR: AI is enabled, but the detector module couldn't be imported.")
        AI_ENABLED = False
        ExerciseDetector = None
        print("INFO: AI Processing disabled due to import error.")

    if AI_ENABLED:
        try:
            DNN_BACKEND = cv2.dnn.DNN_BACKEND_OPENCV
            DNN_TARGET  = cv2.dnn.DNN_TARGET_CPU
            print(f"INFO: DNN Backend set to {DNN_BACKEND}, Target set to {DNN_TARGET}")
        except AttributeError:
            print("="*60)
            print("ERROR: 'cv2.dnn' module not found, but AI_ENABLED is True.")
            print("Install opencv-contrib-python for dnn support. Falling back to AI_ENABLED=False")
            print("="*60)
            AI_ENABLED = False
            ExerciseDetector = None
            DNN_BACKEND = None
            DNN_TARGET  = None

    if AI_ENABLED and ExerciseDetector is not None:
        try:
            camera_state[CAMERA_NAME]["ai_processor"] = ExerciseDetector(
                model_complexity=1,
                min_detection_confidence=CONFIDENCE_THRESHOLD,
                min_tracking_confidence=SCORE_THRESHOLD
             )
            print(f"[{CAMERA_NAME}] AI Processor initialized.")
        except Exception as e:
            print(f"[{CAMERA_NAME}] ERROR initializing AI Processor: {e}")
            traceback.print_exc()
            camera_state[CAMERA_NAME]["ai_processor"] = None
            AI_ENABLED = False
            print(f"[{CAMERA_NAME}] AI Processing disabled due to initialization error.")
else:
    ExerciseDetector = None
    print("INFO: AI Processing is explicitly disabled.")

# Higher quality with GPU acceleration

print(f"INFO: Running with AI={AI_ENABLED}, JPEG Quality={DEFAULT_JPEG_QUALITY}")
print(f"INFO: Using CUDA-accelerated GStreamer decoding when available.")

# Use CUDA if available
DNN_BACKEND = cv2.dnn.DNN_BACKEND_CUDA if CUDA_AVAILABLE else cv2.dnn.DNN_BACKEND_OPENCV
DNN_TARGET = cv2.dnn.DNN_TARGET_CUDA if CUDA_AVAILABLE else cv2.dnn.DNN_TARGET_CPU

# --- Globals ---
shared_lock = threading.Lock()
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

# Flask and SocketIO Initialization
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading",
                    logger=False, engineio_logger=False)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json(force=True)
    messages = data.get('messages')
    if not isinstance(messages, list):
        return jsonify({ 'error': 'Invalid request format. Messages array required.' }), 400
    try:
        client = OpenAI()
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.7,
            max_tokens=150
        )
        return jsonify({
            'response': completion.choices[0].message,
            'usage': completion.usage
        })
    except Exception as e:
        return jsonify({ 'error': 'Error processing your request', 'details': str(e) }), 500
    
@app.route('/api/workout/analyze-pose', methods=['POST'])
def analyze_pose():
    data = request.get_json(force=True)
    landmarks = data.get('landmarks')
    exerciseType = data.get('exerciseType')
    heartRate = data.get('heartRate')
    if not isinstance(landmarks, list):
        return jsonify({ 'error': 'Invalid request format. Landmarks array required.' }), 400
    analysis = {
        'exerciseType': exerciseType or 'unknown',
        'formQuality': np.random.choice(['good','fair','needs improvement']),
        'suggestions': [],
        'timestamp': time.time()
    }
    if exerciseType == 'pushup':
        analysis['suggestions'] = ['Keep your back straight','Lower your chest fully']
    elif exerciseType == 'situp':
        analysis['suggestions'] = ['Engage your core','Don\'t pull your neck']
    return jsonify(analysis)

@app.route('/api/workout/track', methods=['POST'])
def track_workout():
    data = request.get_json(force=True)
    count = data.get('count', {})
    heartRate = data.get('heartRate')
    session = {
        'pushUps': count.get('pushups'),
        'sitUps': count.get('situps'),
        'heartRates': heartRate and [{'bpm': heartRate, 'timestamp': time.time()}] or []
    }
    return jsonify({ 'success': True, 'session': session, 'timestamp': time.time() })


class AIProcessor:
    pass

# --- Stream Opening Function ---
def open_stream(camera_name):
    """Attempts to open the RTSP stream using the best available method."""
    url = RTSP_URL
    print(f"[{camera_name}] Attempting to open stream: {url}")
    cap = None
    
    # --- METHOD 1: GStreamer with CUDA acceleration (NVDEC) ---
    if CUDA_AVAILABLE and GSTREAMER_AVAILABLE:
        # Try NVIDIA specific hardware decoding
        if NVDEC_AVAILABLE:
            try:
                print(f"   Trying GStreamer pipeline with NVDEC hardware acceleration...")
                # Create GStreamer pipeline for RTSP with hardware acceleration (Windows)
                # Use any NVIDIA decoder that might be available on this system
                gst_pipeline = (
                    f"rtspsrc location={url} latency=200 ! "
                    f"rtph264depay ! h264parse ! "
                    f"nvh264dec ! videoconvert ! "
                    f"appsink max-buffers=1 drop=true sync=false"
                )
                
                # Log pipeline details for debugging
                print(f"   Pipeline: {gst_pipeline}")
                
                # Open capture with GStreamer pipeline
                cap_gstreamer = cv2.VideoCapture(gst_pipeline, cv2.CAP_GSTREAMER)
                
                if cap_gstreamer.isOpened():
                    print(f"   Successfully opened with NVDEC hardware acceleration")
                    ret, frame = cap_gstreamer.read()  # Test read
                    if ret and frame is not None and frame.size > 0:
                        print(f"   Test frame read successful ({frame.shape[1]}x{frame.shape[0]}).")
                        return cap_gstreamer
                    else:
                        print(f"   Opened but failed to read test frame.")
                        cap_gstreamer.release()
                        cap_gstreamer = None
                else:
                    print(f"   Failed to open with NVDEC acceleration.")
            except Exception as e:
                print(f"   Error with NVDEC pipeline: {e}")
        
        # Try direct CUDA acceleration without NVDEC
        try:
            print(f"   Trying GStreamer pipeline with CUDA acceleration (without NVDEC)...")
            # Create a GStreamer pipeline that uses GPU for conversion but CPU for decoding
            gst_pipeline = ( 
                    f"rtspsrc location={url} latency=0 ! "
                    f"rtph264depay ! h264parse ! "
                    f"avdec_h264 ! videoconvert ! "
                    f"appsink max-buffers=1 drop=true sync=false"
                )
            
            # Log pipeline details for debugging
            print(f"   Pipeline: {gst_pipeline}")
            
            # Open capture with GStreamer pipeline
            cap_gstreamer = cv2.VideoCapture(gst_pipeline, cv2.CAP_GSTREAMER)
            
            if cap_gstreamer.isOpened():
                print(f"   Successfully opened with GStreamer CUDA pipeline.")
                ret, frame = cap_gstreamer.read()  # Test read
                if ret and frame is not None and frame.size > 0:
                    print(f"   Test frame read successful ({frame.shape[1]}x{frame.shape[0]}). Using CUDA-accelerated GStreamer.")
                    return cap_gstreamer
                else:
                    print(f"   Opened but failed to read test frame.")
                    cap_gstreamer.release()
                    cap_gstreamer = None
            else:
                print(f"   Failed to open with GStreamer pipeline.")
        except Exception as e:
            print(f"   Error with GStreamer pipeline: {e}")
    
    # --- METHOD 2: CPU-based GStreamer pipeline ---
    if GSTREAMER_AVAILABLE:
        try:
            print(f"   Trying CPU-based GStreamer pipeline...")
            # Create CPU-based GStreamer pipeline (simplified for Windows)
            gst_pipeline = (
                f"rtspsrc location={url} latency=0 ! "
                f"rtph264depay ! h264parse ! "
                f"avdec_h264 ! videoconvert ! "
                f"appsink max-buffers=1 drop=true sync=false"
            )
            
            cap_gstreamer_cpu = cv2.VideoCapture(gst_pipeline, cv2.CAP_GSTREAMER)
            
            if cap_gstreamer_cpu.isOpened():
                print(f"   Successfully opened with CPU-based GStreamer pipeline.")
                ret, frame = cap_gstreamer_cpu.read()  # Test read
                if ret and frame is not None and frame.size > 0:
                    print(f"   Test frame read successful ({frame.shape[1]}x{frame.shape[0]}). Using CPU-based GStreamer.")
                    return cap_gstreamer_cpu
                else:
                    print(f"   Opened but failed to read test frame.")
                    cap_gstreamer_cpu.release()
                    cap_gstreamer_cpu = None
            else:
                print(f"   Failed to open with CPU-based GStreamer pipeline.")
        except Exception as e:
            print(f"   Error with CPU-based GStreamer pipeline: {e}")

    # --- METHOD 3: Standard OpenCV VideoCapture (fallback) ---
    try:
        print(f"   Falling back to standard cv2.VideoCapture (CPU decoding)...")
        cap_cpu = cv2.VideoCapture(url)
        if cap_cpu.isOpened():
            cap_cpu.set(cv2.CAP_PROP_BUFFERSIZE, 3)
            print(f"   Successfully opened with standard VideoCapture.")
            ret, frame = cap_cpu.read()
            if ret and frame is not None and frame.size > 0:
                print(f"   Test frame read successful ({frame.shape[1]}x{frame.shape[0]}). Using standard CPU decoding.")
                return cap_cpu
            else:
                print(f"   Opened but failed to read test frame.")
                cap_cpu.release()
                cap_cpu = None
        else:
            print(f"   Failed to open with standard VideoCapture.")
    except Exception as e:
        print(f"   Error with standard VideoCapture: {e}")

    if cap is None:
        print(f"[{camera_name}] Could not open stream with any configured method.")
    return cap



# --- Frame Capture Background Thread ---
def capture_loop(camera_name):
    global camera_state
    """Continuously captures frames, runs AI detection, and enqueues frames."""
    state = camera_state[camera_name]
    print(f"[{camera_name}] Capture loop starting…")
    cap = None
    consecutive_failures = 0
    last_reopen_attempt_time = 0
    last_successful_frame_raw = None

    while state.get("capture_active", False):
        current_time = time.time()
        frame = None
        ret = False

        try:
            # --- Reconnect Logic ---
            if cap is None:
                if current_time - last_reopen_attempt_time >= REOPEN_DELAY_SECONDS:
                    print(f"[{camera_name}] Attempting to (re)open stream...")
                    last_reopen_attempt_time = current_time
                    cap = open_stream(camera_name)
                    if cap:
                        print(f"[{camera_name}] Stream connection successful.")
                        consecutive_failures = 0
                    else:
                        print(f"[{camera_name}] Stream connection failed; will retry.")
                        time.sleep(REOPEN_DELAY_SECONDS / 2)
                        continue
                else:
                    time.sleep(0.5)
                    continue

            # --- Read Frame ---
            if cap is not None:
                ret, raw = cap.read()
                if ret and raw is not None and raw.size > 0:
                    if consecutive_failures > 0:
                        print(f"[{camera_name}] Recovered after {consecutive_failures} failures.")
                    consecutive_failures = 0
                    last_successful_frame_raw = raw
                    frame = raw
                    with shared_lock:
                        state["last_frame_time_capture"] = current_time
                else:
                    consecutive_failures += 1
                    print(f"[{camera_name}] Frame read failed (Attempt {consecutive_failures}).")
                    if last_successful_frame_raw is not None and consecutive_failures < MAX_CONSECUTIVE_FAILURES//2:
                        print(f"[{camera_name}] Using cached frame.")
                        frame = last_successful_frame_raw
                    elif consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                        print(f"[{camera_name}] Max failures reached; resetting stream.")
                        if cap: cap.release()
                        cap = None
                        last_successful_frame_raw = None
                        last_reopen_attempt_time = 0
                        with shared_lock:
                            state["last_detection_data"] = {"landmarks": [], "bbox": None, "type": "person"}
                        continue
                    else:
                        time.sleep(0.1)
                        continue

            # --- AI Detection ---
            if frame is not None and AI_ENABLED and state.get("ai_processor"):
                try:
                   processed_frame, detection    = state["ai_processor"].process_frame(frame)
                   
                except Exception as ai_err:
                    print(f"[{camera_name}] AIProcessor error: {ai_err}")
                    processed_frame = frame
                    detection = {"landmarks": [], "bbox": None, "type": "person"}
            else:
                processed_frame = frame
                detection = state.get("last_detection_data", {"landmarks": [], "bbox": None, "type": "person"})

            # Store detection for emission
            with shared_lock:
                state["last_detection_data"] = detection

            # --- Enqueue for emission ---
            if processed_frame is not None:
                frame_copy = processed_frame.copy()
                with shared_lock:
                    state["frame_queue"].append(frame_copy)

            # Brief sleep to avoid busy‐wait
            time.sleep(0.005)

        except Exception as e:
            print(f"[{camera_name}] CRITICAL ERROR in capture loop: {e}")
            traceback.print_exc()
            if cap:
                try: cap.release()
                except: pass
            cap = None
            last_successful_frame_raw = None
            time.sleep(REOPEN_DELAY_SECONDS)

    # Cleanup
    if cap:
        try: cap.release()
        except: pass
    print(f"[{camera_name}] Capture loop stopped.")


def update_fps_counter(state):
    """Updates and calculates the FPS counter."""
    current_time = time.time()
    state["emitted_frame_counter"] += 1
    
    elapsed = current_time - state["last_fps_check_time"]
    if elapsed >= 1.0:
        state["current_emit_fps"] = round(state["emitted_frame_counter"] / elapsed)
        print(f"[INFO] Current FPS: {state['current_emit_fps']}")
        state["emitted_frame_counter"] = 0
        state["last_fps_check_time"] = current_time

def frame_emitter(camera_name):
    """Emits frames via SocketIO to connected clients."""
    state = camera_state[camera_name]
    print(f"[{camera_name}] Frame emitter starting...")
    last_emit_time = time.time()
    
    while state.get("capture_active", False):
        try:
            current_time = time.time()
            elapsed = current_time - last_emit_time
            
            if elapsed < EMIT_INTERVAL:
                time.sleep(max(0, EMIT_INTERVAL - elapsed) / 2)
                continue
                
            frame = None
            with shared_lock:
                if state["frame_queue"]:
                    # Always grab the most recent frame…
                    frame = state["frame_queue"].pop()  # rightmost = newest
                    # …and drop any others to avoid backlog
                    state["frame_queue"].clear()

            if state["current_emit_fps"] < TARGET_FPS * 0.8:
                state["current_jpeg_quality"] = max(30, state["current_jpeg_quality"] - 5)
            
            if frame is None:
                time.sleep(EMIT_INTERVAL / 4)
                continue
                
            if RESIZE_BEFORE_EMIT and state["current_emit_scale"] != 1.0:
                new_width = int(frame.shape[1] * state["current_emit_scale"])
                new_height = int(frame.shape[0] * state["current_emit_scale"])
                frame = cv2.resize(frame, (new_width, new_height))
                
            quality = state["current_jpeg_quality"]
            ret, buffer = cv2.imencode(
            '.jpg', frame,
            [cv2.IMWRITE_JPEG_QUALITY, state["current_jpeg_quality"]]
        )
            if not ret:
                continue
                
            socketio.emit("frame", buffer.tobytes(), room=camera_name)
            last_emit_time = current_time
            update_fps_counter(state)
            
            socketio.emit('detections', state["last_detection_data"] or {}, room=camera_name)
                
        except Exception as e:
            print(f"[{camera_name}] Error in frame emitter: {e}")
            print(traceback.format_exc())
            time.sleep(EMIT_INTERVAL)
    
    print(f"[{camera_name}] Frame emitter stopped.")

@socketio.on('connect')
def handle_connect():
    """Log new client connections and have them join the camera room."""
    sid = request.sid
    print(f"🟢 Client connected: {sid}")
    flask_socketio.join_room(CAMERA_NAME, sid=sid) 
    print(f"   Client {sid} joined room '{CAMERA_NAME}'")

@socketio.on('disconnect')
def handle_disconnect():
    """Log client disconnections."""
    sid = request.sid
    print(f"🔴 Client disconnected: {sid}")

@socketio.on('test_event')
def handle_test_event(data):
    """Handles test event from client button (for debugging)."""
    sid = request.sid
    print(f">>>>> Received test_event from {sid}: {data}")
    reply_data = {'reply': f'Acknowledged test from server! [async_mode={socketio.async_mode}]', 'your_sid': sid}
    print(f"<<<<< Sending test_reply back to {sid}")
    socketio.emit('test_reply', reply_data, room=sid)

@app.route('/video_feed')
def video_feed():
    """Provides an MJPEG stream - useful for simple viewers or debugging."""
    def generate():
        mjpeg_cam_name = f"{CAMERA_NAME}_mjpeg"
        mjpeg_cap = None
        print(f"[{mjpeg_cam_name}] MJPEG generate() starting...")
        last_frame = None
        
        while True: 
            try:
                if mjpeg_cap is None:
                    print(f"[{mjpeg_cam_name}] Attempting to open stream for MJPEG...")
                    mjpeg_cap = open_stream(mjpeg_cam_name) 
                    if not mjpeg_cap:
                        print(f"[{mjpeg_cam_name}] Failed to open stream for MJPEG endpoint. Retrying...")
                        time.sleep(REOPEN_DELAY_SECONDS)
                        continue 
                    else:
                        print(f"[{mjpeg_cam_name}] MJPEG stream opened.")

                ret, frame = mjpeg_cap.read()
                    
                if not ret or frame is None or frame.size == 0:
                    if last_frame is not None:
                        frame = last_frame
                    else:
                        print(f"[{mjpeg_cam_name}] MJPEG stream read failed, reopening...")
                        mjpeg_cap.release()
                        mjpeg_cap = None
                        time.sleep(1) 
                        continue
                else:
                    last_frame = frame.copy()

                ret_enc, buf = cv2.imencode('.jpg', frame, [
                    cv2.IMWRITE_JPEG_QUALITY, 70, 
                    cv2.IMWRITE_JPEG_OPTIMIZE, 1
                ])
                
                if not ret_enc:
                    print(f"[{mjpeg_cam_name}] MJPEG encoding failed.")
                    continue

                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + buf.tobytes() + b'\r\n'
                )
                
                time.sleep(1.0 / 25)  # 25 FPS
                
            except GeneratorExit:
                print(f"[{mjpeg_cam_name}] Client disconnected from MJPEG stream.")
                break
            except Exception as e:
                print(f"[{mjpeg_cam_name}] Error in MJPEG generation: {e}")
                time.sleep(0.5)
                continue

        if mjpeg_cap:
            mjpeg_cap.release()
            print(f"[{mjpeg_cam_name}] MJPEG stream closed.")

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == "__main__":
    print(f"Starting server [async_mode={socketio.async_mode}]...")
    if CAMERA_NAME not in camera_state:
         print(f"Error: CAMERA_NAME '{CAMERA_NAME}' not found in initial camera_state.")
         exit(1)

    camera_state[CAMERA_NAME]["capture_active"] = True
    print(f"Starting background tasks for camera: {CAMERA_NAME}")
    socketio.start_background_task(capture_loop, CAMERA_NAME)
    socketio.start_background_task(frame_emitter, CAMERA_NAME)
    print(f"Server listening on http://0.0.0.0:{SOCKET_PORT}")
    print(f"SocketIO stream endpoint: ws://<your-ip>:{SOCKET_PORT}/")
    print(f"MJPEG stream endpoint: http://<your-ip>:{SOCKET_PORT}/video_feed")

    try:
        socketio.run(app, host='0.0.0.0', port=SOCKET_PORT, use_reloader=False, debug=False)
    except KeyboardInterrupt:
        print("\nCtrl+C received, shutting down...")
    finally:
        print("Signalling background tasks to stop...")
        for cam_name in list(camera_state.keys()):
            print(f"  Stopping tasks for: {cam_name}")
            if isinstance(camera_state.get(cam_name), dict):
                camera_state[cam_name]["capture_active"] = False
        time.sleep(2)
        print("Shutdown complete.")