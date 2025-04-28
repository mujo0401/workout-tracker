// src/WorkoutPlayer.jsx
import React, { useRef, useEffect, useState } from "react";
import StreamManager from "./StreamManager";

// BLE UI
import HeartRateOverlay from "./Overlays/HeartRateOverlay";

// Other overlays
import VoiceControlOverlay from "./Overlays/VoiceControlOverlay";
import ExercisePlanOverlay from "./Overlays/ExercisePlanOverlay"; 
import HealthOverlay from "./Overlays/HealthOverlay";
import DetectionOverlay from "./Overlays/DetectionOverlay";
import ExerciseZoneOverlay from "./Overlays/ExerciseZoneOverlay";

// Music player
import MiniPlayer from "./MiniPlayer";
import MusicOverlay from "./Overlays/MusicOverlay";

import "./css/WorkoutPlayer.css";
import "./css/ExpandableOverlayMenu.css";

// Performance optimization flags
const USE_IMAGE_BITMAP = typeof createImageBitmap !== 'undefined';
const USE_IMAGE_DECODE = typeof Image !== 'undefined' && 'decode' in Image.prototype;
const METRICS_INTERVAL = 1000; // Update metrics once per second

export default function WorkoutPlayer() {
  const canvasRef = useRef(null);
  const [detection, setDetection] = useState({ landmarks: [], bbox: null });
  const [counts, setCounts] = useState({ pushups: 0, situps: 0 });
  const [streamStatus, setStreamStatus] = useState("connecting"); // Renamed for clarity
  const [metrics, setMetrics] = useState({ fps: 0, latency: 0, errors: 0 });
  const [lastUpdate, setLastUpdate] = useState("");

  // --- Heart Rate Specific State ---
  const [heartRate, setHeartRate] = useState(null);
  const [miniPlayerOpen, setMiniPlayerOpen] = useState(false); // The BPM value

  const [zoneActive, setZoneActive] = useState(false);
  
  // Add heart rate value change handler with debugging
  const handleHeartRateChange = (value) => {
    console.log('Setting heartRate to:', value, typeof value);
    setHeartRate(value);
  };
  
  const [hrStatus, setHrStatus] = useState('disconnected'); // 'disconnected', 'scanning', 'connecting', 'connected', 'error'
  const [hrError, setHrError] = useState(null); // Stores HR specific error messages


  const videoWidth = 1200;
  const videoHeight = 600;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false, desynchronized: true }); // Use desynchronized for better performance
    if (!canvas || !ctx) {
      setStreamStatus("error");
      return;
    }

    // Draw placeholder 
    const drawPlaceholder = (msg = "Awaiting your workout…") => {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ccc";
        ctx.font = "28px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
    };
    drawPlaceholder();

    // Performance metrics
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let streamErrorCount = 0;
    
    // Frame timing
    const frameTimings = {
      totalLatency: 0,
      framesProcessed: 0,
      lastFrameReceived: 0
    };
    
    // Optimized frame handler
    const onFrame = (buffer) => {
        const receiveTime = performance.now();
        frameCount++;
        
        // Skip invalid frames
        if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 100) {
            streamErrorCount++;
            return;
        }
        
        // Update metrics periodically
        const timeSinceLastMetricsUpdate = receiveTime - lastFrameTime;
        if (timeSinceLastMetricsUpdate >= METRICS_INTERVAL) {
            const avgLatency = frameTimings.framesProcessed > 0 ? 
                Math.round(frameTimings.totalLatency / frameTimings.framesProcessed) : 0;
                
            setMetrics({
                fps: Math.round((frameCount / timeSinceLastMetricsUpdate) * 1000),
                latency: avgLatency,
                errors: streamErrorCount
            });
            
            // Create simple time string in format HH:MM:SS
            const now = new Date();
            const timeString = [
                String(now.getHours()).padStart(2, '0'),
                String(now.getMinutes()).padStart(2, '0'),
                String(now.getSeconds()).padStart(2, '0')
            ].join(':');
            setLastUpdate(timeString);
            frameCount = 0;
            frameTimings.totalLatency = 0;
            frameTimings.framesProcessed = 0;
            lastFrameTime = receiveTime;
        }
        
        frameTimings.lastFrameReceived = receiveTime;
        
        // Create blob from buffer
        const blob = new Blob([buffer], { type: "image/jpeg" });
        
        // Choose the fastest rendering method available
        if (USE_IMAGE_BITMAP) {
            // Method 1: ImageBitmap (hardware accelerated)
            createImageBitmap(blob)
                .then(bitmap => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                    bitmap.close();
                    
                    const endTime = performance.now();
                    frameTimings.totalLatency += (endTime - receiveTime);
                    frameTimings.framesProcessed++;
                })
                .catch(() => {
                    streamErrorCount++;
                });
        } else {
            // Method 2: Traditional Image loading
            const url = URL.createObjectURL(blob);
            const img = new Image();
            
            img.onload = () => {
                if (USE_IMAGE_DECODE) {
                    // Use image decode if available for smoother rendering
                    img.decode().then(() => {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        
                        const endTime = performance.now();
                        frameTimings.totalLatency += (endTime - receiveTime);
                        frameTimings.framesProcessed++;
                    }).catch(() => {
                        streamErrorCount++;
                    }).finally(() => {
                        URL.revokeObjectURL(url);
                    });
                } else {
                    // Direct draw
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    URL.revokeObjectURL(url);
                    
                    const endTime = performance.now();
                    frameTimings.totalLatency += (endTime - receiveTime);
                    frameTimings.framesProcessed++;
                }
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(url);
                streamErrorCount++;
            };
            
            img.src = url;
        }
    };

    // Create stream manager
    const manager = new StreamManager(
        onFrame,
        (newCounts) => setCounts((prev) => ({ ...prev, ...newCounts })),
        () => setStreamStatus("connected"), 
        () => {
            setStreamStatus("error");
            drawPlaceholder("Stream Connection Error");
        },
        (data) => {
            if (data && typeof data === 'object') {
                setDetection({
                    bbox: data.bbox || null,
                    landmarks: Array.isArray(data.landmarks) ? data.landmarks : [],
                });
            }
        }
    );

    // Cleanup function
    return () => {
        manager.disconnect();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Heart Rate Monitor Event Handlers ---
  const handleHrScanning = () => {
    setHrStatus('scanning');
    setHrError(null);
    setHeartRate(null); // Reset HR value when starting a new scan
    console.log('HR status changed to scanning');
  };

  const handleHrConnecting = () => {
    setHrStatus('connecting');
    setHrError(null);
    console.log('HR status changed to connecting');
  };

  const handleHrConnect = () => {
    setHrStatus('connected');
    setHrError(null);
    console.log('HR status changed to connected');
    // HR value itself will be updated via setHeartRate prop
  };

  const handleHrDisconnect = () => {
    setHrStatus('disconnected');
    setHeartRate(null);
    setHrError(null);
    console.log('HR status changed to disconnected');
  };

  const handleHrError = (errorMessage) => {
    setHrStatus('error');
    setHrError(errorMessage || 'Unknown HR Error'); // Provide a default error messag
    setHeartRate(null);
    console.log('HR status changed to error:', errorMessage);
  };
  // --- End Heart Rate Handlers ---
  
  const handleZoneEnter = () => {
    console.log("▶️  Entered exercise zone");
    setZoneActive(true);
  };
  const handleZoneLeave = () => {
    console.log("⏸️  Left exercise zone");
    setZoneActive(false);
  };

  return (
    <div className="container">
      <div className="player-wrapper">
        {/* Pass HR-specific status and error */}
        {/*<HeartRateZoneOverlay bpm={heartRate} hrStatus={hrStatus} hrError={hrError} /> */}

        <div className="canvas-container glow">
          <canvas
            ref={canvasRef}
            width={videoWidth}
            height={videoHeight}
            className="canvas"
          />

          {/* FLOOR ZONE overlay (under dot, above video) */}
          <ExerciseZoneOverlay
            detection={detection}
            heartRate={heartRate} 
            targetWidth={videoWidth}
            targetHeight={videoHeight}
            onEnter={handleZoneEnter}
            onLeave={handleZoneLeave}
          />

          <DetectionOverlay
            detection={detection}
            targetWidth={videoWidth}
            targetHeight={videoHeight}
          />
        </div>

        {/* Display stream status separately if needed */}
        {streamStatus === "connecting" && (
          <div className="status">Connecting Video Stream…</div>
        )}
        {streamStatus === "error" && (
          <div className="status error">Video Stream Error! Check Backend/Console.</div>
        )}

        <div className="overlay-buttons-container">
          {/* Health Status button */}
          <HealthOverlay
            status={streamStatus}
            metrics={metrics}
            timestamp={lastUpdate}
            videoStats={{
              resolution: '1080p',
              bitrate: '4.5 Mbps',
              codec: 'H.264',
              frameRate: `${metrics.fps || 30}fps`
            }}
            className="overlay-button health-button"
          />
          <HeartRateOverlay
            setHeartRate={handleHeartRateChange} // Use our new handler with logging
            onScanning={handleHrScanning}
            onConnecting={handleHrConnecting}
            onConnect={handleHrConnect}
            onDisconnect={handleHrDisconnect}
            onError={handleHrError}
            className="overlay-button heart-button" // Pass className if needed by HeartRateOverlay styling
          />
          <VoiceControlOverlay
            counts={counts}
            detection={detection}
            heartRate={heartRate}
            isAwake={zoneActive}
            onCommandProcessed={(cmd, resp) => console.log('Coach:', resp)}
          />
    
          
          
           {/* MusicOverlay positioned via its own CSS */}
        <MusicOverlay onClick={() => setMiniPlayerOpen(true)} />

        {/* only render MiniPlayer when open */}
        {miniPlayerOpen && (
          <MiniPlayer
            bpm={heartRate}
            onClose={() => setMiniPlayerOpen(false)}
          />
        )}

        </div>   
      </div>

    
    </div>
  );
}