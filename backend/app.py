# -*- coding: utf-8 -*-
import os
import time
import cv2
import numpy as np
import threading
import traceback
from collections import deque
from flask import Flask, Response, request, jsonify
import flask_socketio
# import eventlet # Keep commented out unless specifically needed and tested
from flask_socketio import SocketIO
from openai import OpenAI

# --- Configuration Loading ---
try:
    from config import (
        RTSP_URL, SOCKET_PORT, CAMERA_NAME, MODEL_PATH, CLASSES_PATH,
        INPUT_WIDTH, INPUT_HEIGHT, CONFIDENCE_THRESHOLD, SCORE_THRESHOLD, NMS_THRESHOLD
    )
except ImportError:
    print("Error: config.py not found or missing required variables.")
    exit(1)


# --- AI Detector Import (DISABLED FOR NOW) ---
AI_ENABLED = True # <<<=== AI DISABLED TO FIND BASELINE FPS
DNN_BACKEND = None # Initialize to None
DNN_TARGET = None # Initialize to None

if AI_ENABLED:
    try:
         from detection import ExerciseDetector # Replace with your actual import
         print("INFO: AI Processing Enabled.")
    except ImportError:
         print("ERROR: AI is enabled, but the detector module couldn't be imported.")
         AI_ENABLED = False # Fallback to disabled if import fails
         ExerciseDetector = None
         print("INFO: AI Processing disabled due to import error.")

    # Define DNN constants ONLY if AI is enabled and cv2.dnn exists
    try:
        DNN_BACKEND = cv2.dnn.DNN_BACKEND_OPENCV
        DNN_TARGET = cv2.dnn.DNN_TARGET_CPU
        print(f"INFO: DNN Backend set to {DNN_BACKEND}, Target set to {DNN_TARGET}")
    except AttributeError:
        print("\n" + "="*60)
        print("ERROR: 'cv2.dnn' module not found, but AI_ENABLED is True.")
        print("       This usually means the installed OpenCV version is missing the DNN module.")
        print("       Try installing the full package:")
        print("         pip uninstall opencv-python opencv-python-headless opencv-contrib-python")
        print("         pip install opencv-contrib-python")
        print("       Falling back to AI_ENABLED = False")
        print("="*60 + "\n")
        AI_ENABLED = False
        ExerciseDetector = None
        DNN_BACKEND = None
        DNN_TARGET = None

else:
    ExerciseDetector = None
    print("INFO: AI Processing is explicitly disabled.")


# --- Constants and Tuning Parameters ---
KEEP = {"person"} # Only needed if AI ObjectDetector was used

FRAME_QUEUE_SIZE = 1

REOPEN_DELAY_SECONDS = 5
MAX_CONSECUTIVE_FAILURES = 5
MAX_FRAME_DELAY_WARN = 2.0

# --- Performance Tuning (CPU Focused Baseline - Relying on Lower Source Res/FPS) ---
TARGET_FPS = 15 # Target emission FPS - SET CAMERA TO MATCH OR BE SLIGHTLY HIGHER
EMIT_INTERVAL = 1.0 / TARGET_FPS

# Emission Settings (Simplified for Baseline)
RESIZE_BEFORE_EMIT = False
EMIT_RESIZE_SCALE = 1.0 # Ensure scale is 1.0 if resize is False

# Start with low quality, can increase LATER if performance allows after lowering camera settings
DEFAULT_JPEG_QUALITY = 65
print(f"INFO: Running with AI Disabled={not AI_ENABLED}, No Resize, Default JPEG Quality={DEFAULT_JPEG_QUALITY}")
print(f"INFO: Using standard CPU decoding. PLEASE LOWER CAMERA RESOLUTION/FPS for better performance.")


# --- Globals ---
shared_lock = threading.Lock()
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp" # Try forcing TCP for RTSP

# Flask and SocketIO Initialization
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading",
                    logger=False, engineio_logger=False) # Use threading for async


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

# --- Camera State ---
camera_state = {
    CAMERA_NAME: {
        "frame_queue": deque(maxlen=FRAME_QUEUE_SIZE),
        "last_frame_time_capture": time.time(),
        "last_frame_time_emit": time.time(),
        "capture_active": True,
        "stream_failures": 0,
        "last_failure_time": 0,
        "ai_processor": None, # Will be initialized later if AI_ENABLED
        "last_fps_check_time": time.time(),
        "emitted_frame_counter": 0,
        "current_emit_fps": 0,
        "current_jpeg_quality": DEFAULT_JPEG_QUALITY,
        "current_emit_scale": EMIT_RESIZE_SCALE,
        "last_detection_data": None,
    }
}


# --- AI Processor Class (Placeholder Definition) ---
class AIProcessor:
    # This class would contain the AI model loading and processing logic
    # if AI_ENABLED were True and ExerciseDetector were imported correctly.
    def __init__(self, model_path, classes_path, input_size, conf_thresh, score_thresh, nms_thresh, backend, target):
         # Example initialization (replace with your actual AI model setup)
         print(f"AIProcessor Init (Placeholder - AI_ENABLED={AI_ENABLED})")
         self.model = None # Load your model here if AI_ENABLED
         self.classes = [] # Load classes if AI_ENABLED
         # ... other setup ...
         if AI_ENABLED:
             print(" -> Actual AI model loading would happen here.")
         else:
             print(" -> AI is disabled, no model loaded.")

    def process_frame(self, frame):
        # Example processing (replace with your actual AI inference)
        if not AI_ENABLED or self.model is None:
            return frame, {} # Return original frame and empty detections if AI is off

        # --- Actual AI processing would go here ---
        # 1. Preprocess frame (blobFromImage)
        # 2. Set input to model
        # 3. Forward pass
        # 4. Postprocess results (NMS, filtering)
        # 5. Draw boxes/info on the frame
        # 6. Format detection data
        # -----------------------------------------
        print("AIProcessor.process_frame (Placeholder - would run inference here)")
        processed_frame = frame # Placeholder
        detections = {} # Placeholder
        return processed_frame, detections


# --- Initialize AI Processor (if enabled) ---
if AI_ENABLED and ExerciseDetector is not None:
    try:
        # Example: Initialize your AI processor instance
        # ai_instance = ExerciseDetector(...) # Or AIProcessor(...)
        # camera_state[CAMERA_NAME]["ai_processor"] = ai_instance
        print(f"[{CAMERA_NAME}] AI Processor would be initialized here.")
        # For now, using the placeholder AIProcessor class:
        camera_state[CAMERA_NAME]["ai_processor"] = AIProcessor(
            MODEL_PATH, CLASSES_PATH, (INPUT_WIDTH, INPUT_HEIGHT),
            CONFIDENCE_THRESHOLD, SCORE_THRESHOLD, NMS_THRESHOLD,
            DNN_BACKEND, DNN_TARGET
        )

    except Exception as e:
        print(f"[{CAMERA_NAME}] ERROR initializing AI Processor: {e}")
        print(traceback.format_exc())
        camera_state[CAMERA_NAME]["ai_processor"] = None # Disable AI if init fails
        AI_ENABLED = False # Ensure AI flag reflects the failure
        print(f"[{CAMERA_NAME}] AI Processing disabled due to initialization error.")

# --- Stream Opening Function ---
def open_stream(camera_name):
    """Attempts to open the RTSP stream using standard OpenCV."""
    url = RTSP_URL
    print(f"[{camera_name}] Attempting to open stream: {url}")
    cap = None

    # --- METHOD 1: Standard OpenCV VideoCapture (CPU Decoding) ---
    try:
        print(f"  Trying standard cv2.VideoCapture (CPU decoding)...")
        # Environment variable for TCP is set globally now
        cap_cpu = cv2.VideoCapture(url, cv2.CAP_FFMPEG) # Explicitly suggest FFMPEG backend
        if cap_cpu is not None and cap_cpu.isOpened():
            # Set buffer size (may or may not have an effect depending on backend/OS)
            cap_cpu.set(cv2.CAP_PROP_BUFFERSIZE, 3)
            print(f"  Successfully opened with standard VideoCapture.")
            ret, frame = cap_cpu.read() # Test read
            if ret and frame is not None and frame.size > 0:
                print(f"  Test frame read successful ({frame.shape[1]}x{frame.shape[0]}). Using standard CPU decoding.")
                return cap_cpu # <<<=== Return the CPU capture object if successful
            else:
                print(f"  Opened but failed to read test frame.")
                cap_cpu.release()
                cap_cpu = None # Ensure it's None
        else:
            print(f"  Failed to open with standard VideoCapture.")
    except Exception as e:
        print(f"  Error with standard VideoCapture: {e}")
        # traceback.print_exc() # Uncomment for more detailed errors if needed

    # --- Fallback Message ---
    if cap is None:
        print(f"[{camera_name}] Could not open stream with standard CPU method.")
    return cap # Return None if failed


# --- Frame Capture Background Thread ---
def capture_loop(camera_name):
    """Continuously captures frames from the stream and puts them in the queue."""
    state = camera_state[camera_name]
    print(f"[{camera_name}] Capture loop starting (CPU Decoding)...")
    ai_processor = state.get("ai_processor") # Get processor instance (might be None)

    cap = None
    consecutive_failures = 0
    last_reopen_attempt_time = 0
    last_successful_frame_raw = None # Store the last good raw frame

    while state.get("capture_active", False):
        current_time = time.time()
        frame = None
        processed_frame = None
        detections = {}

        try:
            # Stream (Re)Connection Logic
            if cap is None:
                if current_time - last_reopen_attempt_time >= REOPEN_DELAY_SECONDS:
                    print(f"[{camera_name}] Attempting to (re)open stream...")
                    last_reopen_attempt_time = current_time
                    cap = open_stream(camera_name) # Tries Method 1 now
                    if cap:
                        print(f"[{camera_name}] Stream connection successful.")
                        consecutive_failures = 0
                        state["stream_failures"] = 0 # Reset stream failure count on success
                    else:
                        print(f"[{camera_name}] Stream connection failed, will retry...")
                        state["stream_failures"] += 1
                        state["last_failure_time"] = current_time
                        time.sleep(REOPEN_DELAY_SECONDS / 2) # Wait before next attempt
                        continue # Skip frame processing attempt
                else:
                    # Waiting for reopen delay
                    time.sleep(0.5)
                    continue # Skip frame processing attempt

            # Frame Reading Logic
            if cap is not None:
                ret, frame = cap.read()

                if ret and frame is not None and frame.size > 0:
                    if consecutive_failures > 0:
                         print(f"[{camera_name}] Stream read recovered after {consecutive_failures} failures.")
                    consecutive_failures = 0
                    last_successful_frame_raw = frame # Keep the raw frame

                    # --- AI Processing (if enabled and processor exists) ---
                    if AI_ENABLED and ai_processor:
                        try:
                            proc_start_time = time.time()
                            # Pass a copy to AI to avoid modification issues if processing is slow
                            processed_frame, detections = ai_processor.process_frame(frame.copy())
                            proc_end_time = time.time()
                            # print(f"[{camera_name}] AI Processing Time: {proc_end_time - proc_start_time:.3f}s") # Optional perf log
                        except Exception as ai_err:
                             print(f"[{camera_name}] ERROR during AI processing: {ai_err}")
                             # traceback.print_exc() # Uncomment for full AI error details
                             processed_frame = frame # Fallback to original frame on AI error
                             detections = {"error": str(ai_err)}
                    else:
                        # If AI is disabled, use the original frame
                        processed_frame = frame
                        detections = {} # Ensure detections is an empty dict

                    # --- Update Timestamps and State ---
                    capture_delay = current_time - state.get("last_frame_time_capture", current_time)
                    if capture_delay > MAX_FRAME_DELAY_WARN:
                         print(f"[{camera_name}] WARNING: High capture delay between reads: {capture_delay:.2f}s")

                    with shared_lock:
                        state["last_frame_time_capture"] = current_time
                        state["last_detection_data"] = detections # Store latest detections

                else: # Frame read failed
                    consecutive_failures += 1
                    print(f"[{camera_name}] Frame read failed (Attempt {consecutive_failures}/{MAX_CONSECUTIVE_FAILURES}).")

                    # Option 1: Use last known good frame for a short time
                    if last_successful_frame_raw is not None and consecutive_failures < MAX_CONSECUTIVE_FAILURES // 2 :
                        print(f"[{camera_name}] Using cached frame.")
                        processed_frame = last_successful_frame_raw # Use the cached raw frame
                        # Optionally clear detections or keep last known? Clear is safer.
                        with shared_lock:
                             state["last_detection_data"] = {}
                    # Option 2: Force reconnect after max failures
                    elif consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                        print(f"[{camera_name}] Max consecutive read failures reached. Resetting stream.")
                        if cap:
                            try: cap.release()
                            except: pass
                        cap = None
                        last_successful_frame_raw = None
                        last_reopen_attempt_time = 0 # Allow immediate reopen attempt
                        with shared_lock:
                             state["last_detection_data"] = {"error": "Stream disconnected"}
                        continue # Skip putting frame in queue
                    else:
                        # Read failed, but not max failures, and no cached frame to use
                        time.sleep(0.1) # Small delay before next read attempt
                        continue # Skip putting frame in queue

            # Add the processed_frame (or cached frame) to Queue
            if processed_frame is not None:
                # Make a final copy before putting in the thread-safe queue
                frame_copy_for_queue = processed_frame.copy()
                with shared_lock:
                    # If queue is full, the oldest frame is dropped automatically by deque
                    state["frame_queue"].append(frame_copy_for_queue)

            # Loop Pacing - Adjust sleep based on success/failure
            if consecutive_failures == 0:
                 # Sleep very briefly if reads are working, relying on camera FPS and emit interval
                 time.sleep(0.005) # 5ms sleep - prevents busy-waiting if camera is fast
            else:
                 # Sleep longer if there are read issues
                 time.sleep(0.05) # 50ms sleep

        except Exception as e:
            print(f"[{camera_name}] CRITICAL ERROR in capture loop: {e}")
            print(traceback.format_exc())
            if cap:
                try: cap.release()
                except: pass
            cap = None
            last_successful_frame_raw = None
            # Reset state to trigger reconnect attempt after a delay
            last_reopen_attempt_time = 0
            consecutive_failures = MAX_CONSECUTIVE_FAILURES # Ensure it triggers reconnect logic
            time.sleep(REOPEN_DELAY_SECONDS) # Longer sleep after critical error

    # Cleanup on Exit
    if cap:
        try: cap.release()
        except: pass
        print(f"[{camera_name}] Released capture resource.")
    print(f"[{camera_name}] Capture loop stopped.")


# --- Frame Emission Background Thread ---
def frame_emitter(camera_name):
    """Takes frames from queue, encodes, and emits via SocketIO."""
    state = camera_state[camera_name]
    print(f"[{camera_name}] Frame emitter starting (AI Enabled: {AI_ENABLED}, Resize: {RESIZE_BEFORE_EMIT})...")

    while state.get("capture_active", False):
        frame_to_emit = None
        detections_to_emit = {}
        current_time = time.time()

        # --- Rate Limiting ---
        time_since_last_emit = current_time - state.get("last_frame_time_emit", 0)
        if time_since_last_emit < EMIT_INTERVAL:
            sleep_time = EMIT_INTERVAL - time_since_last_emit
            # Sleep only if needed, use precise sleep for accuracy
            if sleep_time > 0.001: # Avoid sleeping for negligible amounts
                 time.sleep(sleep_time)
            continue # Check condition again

        try:
            # --- Get Latest Frame and Detections ---
            with shared_lock:
                # Get the most recent frame by consuming the queue
                while len(state["frame_queue"]) > 0:
                    frame_to_emit = state["frame_queue"].popleft() # Get oldest if multiple, effectively latest if queue size=1

                # Get the corresponding detections (captured by capture_loop)
                detections_to_emit = state.get("last_detection_data", {})

            if frame_to_emit is None:
                # No frame available, wait briefly and try again
                time.sleep(EMIT_INTERVAL / 3) # Wait a fraction of the emit interval
                continue

            # --- Resize Frame (if enabled) ---
            # NOTE: Currently disabled by RESIZE_BEFORE_EMIT = False
            if RESIZE_BEFORE_EMIT and state.get("current_emit_scale", 1.0) != 1.0:
                 scale = state["current_emit_scale"]
                 if scale > 0.1: # Basic sanity check for scale factor
                     width = int(frame_to_emit.shape[1] * scale)
                     height = int(frame_to_emit.shape[0] * scale)
                     frame_to_emit = cv2.resize(frame_to_emit, (width, height), interpolation=cv2.INTER_AREA) # Use INTER_AREA for shrinking

            # --- Encode frame to JPEG ---
            jpeg_quality = state.get("current_jpeg_quality", DEFAULT_JPEG_QUALITY)
            encode_params = [cv2.IMWRITE_JPEG_QUALITY, int(jpeg_quality)] # Ensure quality is integer
            ret, buf = cv2.imencode('.jpg', frame_to_emit, encode_params)

            if not ret:
                print(f"[{camera_name}] Frame encoding failed.")
                continue

            # --- Emit Data via SocketIO ---
            # Emit frame first
            socketio.emit("frame", buf.tobytes(), room=camera_name)

            # Emit detections (even if empty)
            socketio.emit('detections', detections_to_emit, room=camera_name)

            # --- Update State and Counters ---
            with shared_lock:
                state["last_frame_time_emit"] = time.time() # Use emission time
                state["emitted_frame_counter"] += 1

                # Calculate FPS periodically
                now = time.time()
                if now - state["last_fps_check_time"] >= 2.0: # Check every 2 seconds
                    duration = now - state["last_fps_check_time"]
                    current_fps = round(state["emitted_frame_counter"] / duration)
                    # Only update if FPS calculation is valid
                    if duration > 0:
                        state["current_emit_fps"] = current_fps
                    state["last_fps_check_time"] = now
                    state["emitted_frame_counter"] = 0
                    # print(f"[{camera_name}] Emit FPS: ~{state['current_emit_fps']}") # Optional print

        except Exception as e:
            print(f"[{camera_name}] CRITICAL ERROR in frame_emitter loop: {e}")
            print(traceback.format_exc())
            time.sleep(1) # Wait after a critical error

    print(f"[{camera_name}] Frame emitter stopped.")


# --- SocketIO Event Handlers ---
@socketio.on('connect')
def handle_connect():
    sid = request.sid
    print(f"🟢 Client connected: {sid}")
    # Automatically join the client to the camera room
    flask_socketio.join_room(CAMERA_NAME, sid=sid)
    print(f"  Client {sid} joined room '{CAMERA_NAME}'")
    # Optionally send current state or welcome message
    with shared_lock:
        state = camera_state[CAMERA_NAME]
        current_quality = state.get("current_jpeg_quality", DEFAULT_JPEG_QUALITY)
    socketio.emit('connection_ack', {'camera': CAMERA_NAME, 'quality': current_quality}, room=sid)


@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    print(f"🔴 Client disconnected: {sid}")
    # Room cleanup is usually handled automatically by flask-socketio, but explicit leave is fine too
    # flask_socketio.leave_room(CAMERA_NAME, sid=sid)
    # print(f"  Client {sid} left room '{CAMERA_NAME}'")


@socketio.on('quality_adjustment')
def handle_quality_adjustment(data):
    """Handles client requests to change stream quality."""
    sid = request.sid
    level = data.get('level', 'medium') # Expect 'low', 'medium', 'high'
    print(f"↔️ Received quality_adjustment request from {sid}: level={level}")

    new_quality = DEFAULT_JPEG_QUALITY # Default fallback
    if level == 'low':
        new_quality = 30
    elif level == 'medium':
        new_quality = 55
    elif level == 'high':
        new_quality = 75 # Keep reasonable, very high quality increases size a lot

    with shared_lock:
        state = camera_state[CAMERA_NAME]
        state['current_jpeg_quality'] = new_quality

    print(f"  [{CAMERA_NAME}] Updated stream settings: Quality={new_quality}")
    # Acknowledge the change back to the client
    socketio.emit('quality_updated', {'level': level, 'quality_value': new_quality}, room=sid)



# --- MJPEG Fallback Endpoint ---
@app.route('/video_feed')
def video_feed():
    """Provides a fallback MJPEG stream direct from a new capture."""
    def generate_mjpeg():
        mjpeg_cam_name = f"{CAMERA_NAME}_mjpeg"
        print(f"[{mjpeg_cam_name}] MJPEG client connected. Starting stream...")
        mjpeg_cap = None
        mjpeg_target_fps = 10 # Lower FPS for MJPEG to reduce load
        mjpeg_interval = 1.0 / mjpeg_target_fps
        mjpeg_quality = 50 # Fixed medium quality for MJPEG
        last_frame_yield_time = 0

        while True:
            current_time = time.time()
            try:
                if mjpeg_cap is None:
                    print(f"[{mjpeg_cam_name}] Opening stream for MJPEG...")
                    # Use same global RTSP_URL and standard VideoCapture
                    mjpeg_cap = cv2.VideoCapture(RTSP_URL, cv2.CAP_FFMPEG)
                    if not mjpeg_cap or not mjpeg_cap.isOpened():
                        print(f"[{mjpeg_cam_name}] Failed to open stream. Retrying...")
                        if mjpeg_cap:
                            try: mjpeg_cap.release()
                            except: pass
                        mjpeg_cap = None
                        time.sleep(REOPEN_DELAY_SECONDS) # Wait before retrying
                        continue
                    else:
                         mjpeg_cap.set(cv2.CAP_PROP_BUFFERSIZE, 2) # Small buffer for MJPEG too

                ret, frame = mjpeg_cap.read()
                if not ret or frame is None or frame.size == 0:
                    print(f"[{mjpeg_cam_name}] Read failed. Releasing cap.")
                    if mjpeg_cap:
                        try: mjpeg_cap.release()
                        except: pass
                    mjpeg_cap = None
                    time.sleep(1.0) # Wait a bit before trying to reopen
                    continue

                # Rate limit the MJPEG stream
                if current_time - last_frame_yield_time < mjpeg_interval:
                    # Calculate remaining time needed to meet interval
                    sleep_duration = mjpeg_interval - (current_time - last_frame_yield_time)
                    if sleep_duration > 0.001:
                         time.sleep(sleep_duration)
                    continue # Re-check time after sleep

                # Encode the captured frame
                ret_enc, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, mjpeg_quality])
                if not ret_enc:
                    print(f"[{mjpeg_cam_name}] MJPEG encoding failed.")
                    # Don't yield a broken frame, just continue
                    continue

                # Yield the frame in MJPEG format
                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + buf.tobytes() + b'\r\n'
                )
                last_frame_yield_time = time.time() # Update time after successful yield

            except GeneratorExit:
                # Client disconnected
                print(f"[{mjpeg_cam_name}] MJPEG client disconnected.")
                break # Exit the loop gracefully
            except Exception as e:
                print(f"[{mjpeg_cam_name}] Error in MJPEG generation: {e}")
                # traceback.print_exc() # Uncomment for details
                if mjpeg_cap:
                    try: mjpeg_cap.release()
                    except: pass
                mjpeg_cap = None
                time.sleep(2.0) # Wait after error before trying again

        # Ensure capture is released when generator stops
        if mjpeg_cap:
            try: mjpeg_cap.release()
            except: pass
            print(f"[{mjpeg_cam_name}] MJPEG stream resources released.")

    # Return the response object with the generator
    return Response(generate_mjpeg(), mimetype='multipart/x-mixed-replace; boundary=frame')


# --- Main Application Execution ---
if __name__ == "__main__":
    print("\n--- Starting Flask-SocketIO Server ---")
    print(f"Config: AI_ENABLED={AI_ENABLED}, RESIZE_BEFORE_EMIT={RESIZE_BEFORE_EMIT}, DEFAULT_JPEG_QUALITY={DEFAULT_JPEG_QUALITY}")
    print(f"Config: TARGET_FPS={TARGET_FPS} (Emit Interval: {EMIT_INTERVAL:.3f}s)")
    if not AI_ENABLED:
        print("INFO: Using standard CPU decoding for video stream.")
        print("RECOMMENDATION: Lower the camera's output Resolution and Frame Rate via its web interface for best performance.")
    print(f"SocketIO Async Mode: {socketio.async_mode}")

    if CAMERA_NAME not in camera_state:
        print(f"Error: CAMERA_NAME '{CAMERA_NAME}' from config.py not found in initial camera_state setup.")
        exit(1)

    print(f"\n--- Initializing Background Tasks for Camera: {CAMERA_NAME} ---")
    try:
        # Start capture thread first
        capture_thread = threading.Thread(target=capture_loop, args=(CAMERA_NAME,), daemon=True)
        capture_thread.start()
        print(" -> Capture thread started.")

        # Start emitter thread
        emitter_thread = threading.Thread(target=frame_emitter, args=(CAMERA_NAME,), daemon=True)
        emitter_thread.start()
        print(" -> Emitter thread started.")

    except Exception as e:
        print(f"FATAL: Failed to start background threads: {e}")
        traceback.print_exc()
        exit(1)

    print("\n--- Server Ready ---")
    host_ip = '0.0.0.0' # Listen on all interfaces
    try:
        # Attempt to find a reachable local IP for display purposes
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1) # Don't wait long
        s.connect(("8.8.8.8", 80)) # Connect to a known external IP (doesn't send data)
        display_ip = s.getsockname()[0]
        s.close()
    except Exception:
        display_ip = '127.0.0.1' # Fallback IP
        print("Warning: Could not determine local network IP automatically, using 127.0.0.1 for display URLs.")

    print(f"Web Interface available at: http://{display_ip}:{SOCKET_PORT}/")
    print(f"SocketIO Endpoint:          ws://{display_ip}:{SOCKET_PORT}/socket.io/")
    print(f"MJPEG Fallback Stream:      http://{display_ip}:{SOCKET_PORT}/video_feed")
    print(f"(Also listening on:         http://0.0.0.0:{SOCKET_PORT})")
    print("\nPress Ctrl+C to stop the server.")

    try:
        # Run the SocketIO server
        socketio.run(app, host=host_ip, port=SOCKET_PORT, use_reloader=False, debug=False, log_output=False)

    except KeyboardInterrupt:
        print("\nCtrl+C received, shutting down...")
    except Exception as e:
        # Catch potential errors during server run (e.g., port already in use)
        print(f"\nSERVER RUN FAILED: {e}")
        traceback.print_exc()
    finally:
        print("--- Initiating Shutdown Sequence ---")
        # Signal threads to stop
        print("Stopping background tasks...")
        for cam_name in list(camera_state.keys()):
             print(f"  Signalling stop for: {cam_name}")
             if isinstance(camera_state.get(cam_name), dict):
                 with shared_lock:
                     # Set the flag to signal loops to exit
                     camera_state[cam_name]["capture_active"] = False

        # Wait briefly for threads to exit gracefully
        print("Waiting for threads to finish (up to 2 seconds)...")
        # Give threads a chance to finish their current loop iteration and check the flag
        time.sleep(2.0) # Adjust sleep time as needed

        # Check if threads are still alive (optional, mainly for diagnostics)
        # if capture_thread.is_alive():
        #      print(f"Warning: Capture thread for {CAMERA_NAME} did not exit cleanly.")
        # if emitter_thread.is_alive():
        #      print(f"Warning: Emitter thread for {CAMERA_NAME} did not exit cleanly.")

        print("Shutdown complete.")
        # Explicitly exit the process
        os._exit(0) # Force exit if threads are stuck (use cautiously)