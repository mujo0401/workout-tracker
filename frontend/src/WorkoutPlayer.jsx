// src/WorkoutPlayer.jsx
import React, { useRef, useEffect, useState } from "react";
import StreamManager from "./StreamManager";

// Overlay menu
import ExpandableMenuOverlay from './Overlays/ExpandableMenuOverlay';

// Other overlays
import DetectionOverlay from "./Overlays/DetectionOverlay";
import ExercisePlanOverlay from "./Overlays/ExercisePlanOverlay";
import HealthOverlay from "./Overlays/HealthOverlay";
import VoiceControlOverlay from "./Overlays/VoiceControlOverlay";
import HeartRateOverlay from "./Overlays/HeartRateOverlay";
import ExerciseZoneOverlay from "./Overlays/ExerciseZoneOverlay";
import PoseOverlay from "./Overlays/PoseOverlay";
import CameraOverlay from "./Overlays/CameraOverlay";
import SceneryOverlay from "./Overlays/SceneryOverlay";
import SceneryRenderer from "./Overlays/SceneryRenderer";
import { analyzePose } from "./services/PoseService";

// Music player
import MusicOverlay from "./Overlays/MusicOverlay";

import "./css/WorkoutPlayer.css";

// Performance optimization flags
const USE_IMAGE_BITMAP = typeof createImageBitmap !== 'undefined';
const USE_IMAGE_DECODE = typeof Image !== 'undefined' && 'decode' in Image.prototype;
const METRICS_INTERVAL = 1000;

export default function WorkoutPlayer() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  // Overlay visibility
  const [showDetection, setShowDetection] = useState(false);
  const [showPose, setShowPose] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showHeartRate, setShowHeartRate] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showScenery, setShowScenery] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentScene, setCurrentScene]           = useState(null);
  const [sceneryIntensity, setSceneryIntensity]   = useState(50);

  // Core state
  const [detection, setDetection] = useState({ landmarks: [], bbox: null });
  const [poseData, setPoseData] = useState({ landmarks: [], bbox: null });
  const [counts, setCounts] = useState({ pushups: 0, situps: 0 });
  const [streamStatus, setStreamStatus] = useState("connecting");
  const [metrics, setMetrics] = useState({ fps: 0, latency: 0, errors: 0 });
  const [lastUpdate, setLastUpdate] = useState("");
  const [heartRate, setHeartRate] = useState(null);
  const [hrStatus, setHrStatus] = useState('disconnected');
  const [hrError, setHrError] = useState(null);
  const [zoneActive, setZoneActive] = useState(false);
  const [autoHrScanTrigger, setAutoHrScanTrigger] = useState(false);
  
  const videoWidth = 1200;
  const videoHeight = 600;

  // Stream setup...
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false, desynchronized: true });
    if (!canvas || !ctx) {
      setStreamStatus("error");
      return;
    }
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

    let lastFrameTime = performance.now();
    let frameCount = 0;
    let streamErrorCount = 0;
    const frameTimings = { totalLatency: 0, framesProcessed: 0 };

    const onFrame = buffer => {
      const receiveTime = performance.now();
      frameCount++;
      if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 100) {
        streamErrorCount++;
        return;
      }
      if (receiveTime - lastFrameTime >= METRICS_INTERVAL) {
        const avgLatency = frameTimings.framesProcessed
          ? Math.round(frameTimings.totalLatency / frameTimings.framesProcessed)
          : 0;
        setMetrics({
          fps: Math.round((frameCount / (receiveTime - lastFrameTime)) * 1000),
          latency: avgLatency,
          errors: streamErrorCount
        });
        const now = new Date();
        setLastUpdate(
          [now.getHours(), now.getMinutes(), now.getSeconds()]
            .map(n => String(n).padStart(2, '0')).join(':')
        );
        frameCount = 0;
        frameTimings.totalLatency = 0;
        frameTimings.framesProcessed = 0;
        lastFrameTime = receiveTime;
      }

      const blob = new Blob([buffer], { type: "image/jpeg" });
      if (USE_IMAGE_BITMAP) {
        createImageBitmap(blob)
          .then(bitmap => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            bitmap.close();
            const endTime = performance.now();
            frameTimings.totalLatency += endTime - receiveTime;
            frameTimings.framesProcessed++;
          })
          .catch(() => streamErrorCount++);
      } else {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          (USE_IMAGE_DECODE ? img.decode().catch(() => {}) : Promise.resolve())
            .finally(() => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              URL.revokeObjectURL(url);
              const endTime = performance.now();
              frameTimings.totalLatency += endTime - receiveTime;
              frameTimings.framesProcessed++;
            });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          streamErrorCount++;
        };
        img.src = url;
      }
    };

    const manager = new StreamManager(
      onFrame,
      newCounts => setCounts(prev => ({ ...prev, ...newCounts })),
      () => setStreamStatus("connected"),
      () => { setStreamStatus("error"); drawPlaceholder("Stream Connection Error"); },
      streamData => { // <--- Callback that receives landmarks/bbox
        if (streamData && typeof streamData === 'object') {
          // console.log("Received detection data:", streamData); // Good place to debug data format
          setDetection({ // Update state used by PoseOverlay
            bbox: streamData.bbox || null,
            landmarks: Array.isArray(streamData.landmarks) ? streamData.landmarks : []
          });
        }
      }
    );
    return () => manager.disconnect(); // Cleanup on unmount
  }, [])

  // Pose polling...
  useEffect(() => {
    let interval = null; // Initialize interval to null

    async function pollPose() {
      // *** Change: Use canvasRef, the actual display canvas ***
      const mainCanvas = canvasRef.current;
      if (!mainCanvas || mainCanvas.width === 0 || mainCanvas.height === 0) {
        console.log('[Pose] Main canvas not ready for polling.');
        return; // Don't poll if canvas isn't ready
      }

      // Create a temporary canvas to get the blob without modifying the main one
      const tempCanvas = document.createElement('canvas');
      const width = mainCanvas.width;
      const height = mainCanvas.height;
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext('2d');

      // *** Draw the current content of the main display canvas ***
      try {
         ctx.drawImage(mainCanvas, 0, 0, width, height);
      } catch (drawError) {
         console.error('[Pose] Error drawing main canvas to temp canvas:', drawError);
         return; // Stop if drawing fails
      }


      // Get the blob
      let blob = null;
      try {
          blob = await new Promise(res => tempCanvas.toBlob(res, 'image/jpeg', 0.8)); // Use jpeg with quality
      } catch (blobError) {
          console.error('[Pose] Error creating blob:', blobError);
      }


      if (!blob) {
         console.error('[Pose] Failed to create blob from canvas.');
         return; // Stop if blob creation fails
      }

      // Fetch pose data from server
      try {
         const data = await analyzePose(
              detection,           
              'pushup',            
              heartRate        
           );
        // *** Store both landmarks and bbox ***
        setPoseData({
          landmarks: data.landmarks || [], // Default to empty array if undefined
          bbox: data.bbox || null        // Default to null if undefined
        });
      } catch (err) {
        console.error('[Pose] Fetch error:', err);
        // Optional: Consider clearing pose data or setting an error state
        // setPoseData({ landmarks: [], bbox: null });
      }
    }

    if (showPose) {
      console.log('[Pose] Starting polling.');
      pollPose(); // Initial poll immediately
      interval = setInterval(pollPose, 250); // Poll frequency (adjust as needed)
    } else {
      console.log('[Pose] Stopping polling.');
      setPoseData({ landmarks: [], bbox: null }); // Clear data when not showing
      if (interval) {
           clearInterval(interval); // Clear interval if it exists
           interval = null;
      }
    }

    // Cleanup function
    return () => {
        if (interval) {
            console.log('[Pose] Cleaning up interval.');
            clearInterval(interval);
        }
    };
    // Rerun effect only when showPose changes
  }, [showPose]);

  // HR handlers
  const handleHrScanning = () => { setHrStatus('scanning'); setHrError(null); setHeartRate(null); };
  const handleHrConnecting = () => { setHrStatus('connecting'); setHrError(null); };
  const handleHrConnect = () => { setHrStatus('connected'); setHrError(null); };
  const handleHrDisconnect = () => { setHrStatus('disconnected'); setHeartRate(null); setHrError(null); };
  const handleHrError = msg => { setHrStatus('error'); setHrError(msg || 'Unknown'); setHeartRate(null); };

  const handleZoneEnter = () => setZoneActive(true);
  const handleZoneLeave = () => setZoneActive(false);

  return (
    <div className="container">
      <div className="player-wrapper">
        <div className="canvas-container glow">
          <canvas
            ref={canvasRef}
            width={videoWidth}
            height={videoHeight}
            className="canvas"
          />
          <ExerciseZoneOverlay
            detection={detection}
            heartRate={heartRate}
            targetWidth={videoWidth}
            targetHeight={videoHeight}
            onEnter={handleZoneEnter}
            onLeave={handleZoneLeave}
          />
          {showDetection && (
            <DetectionOverlay
              detection={detection}
              targetWidth={videoWidth}
              targetHeight={videoHeight}
            />
          )}
         {showPose && (
          <PoseOverlay
            detection={poseData}
            exerciseType="pushup"
            targetWidth={videoWidth}
            targetHeight={videoHeight}
          />
)}
          {showHeartRate && (
            <HeartRateOverlay
              open={showHeartRate}
              onClose={() => setShowHeartRate(false)}
              setHeartRate={setHeartRate}
              onScanning={handleHrScanning}
              onConnecting={handleHrConnecting}
              onConnect={handleHrConnect}
              onDisconnect={handleHrDisconnect}
              onError={handleHrError}
            />
          )}
          <VoiceControlOverlay
            open={showVoice}
            onClose={() => setShowVoice(false)}
            counts={counts}
            detection={detection}
            heartRate={heartRate}
            onCommandProcessed={(c, r) => console.log('Coach:', r)}
          />
          <HealthOverlay
            open={showHealth}
            onClose={() => setShowHealth(false)}
            status={streamStatus}
            metrics={metrics}
            timestamp={lastUpdate}
            videoStats={{
              resolution: '1080p',
              bitrate: '4.5 Mbps',
              codec: 'H.264',
              frameRate: `${metrics.fps}fps`
            }}
          />
        </div>
        {streamStatus === "connecting" && (
          <div className="status">Connecting Video Stream…</div>
        )}
        {streamStatus === "error" && (
          <div className="status error">Video Stream Error!</div>
        )}

         {currentScene && <SceneryRenderer scene={currentScene} intensity={sceneryIntensity} />}

          <ExpandableMenuOverlay
          onSelect={key => {
            switch (key) {
              case 'detection':  setShowDetection(v => !v); break;
              case 'pose':       setShowPose(v => !v); break;
              case 'plan':       setShowPlan(v => !v); break;
              case 'health':     setShowHealth(v => !v); break;
              case 'voice':      setShowVoice(v => !v); break;
              case 'heartrate':
                if (!showHeartRate) {
                  setShowHeartRate(true);
                  setAutoHrScanTrigger(true);
                } else {
                  setShowHeartRate(false);
                  setAutoHrScanTrigger(false);
                }
                break;
              case 'scenery':    setShowScenery(v => !v); break;
              case 'camera':     setShowCamera(v => !v); break;
              case 'music':      setMusicOpen(v => !v); break;
              default: break;
            }
          }}
          detectionActive={showDetection}
          poseActive={showPose}
          heartRateActive={hrStatus === 'connected'}
          healthActive={streamStatus === 'connected'}
          cameraActive={showCamera}
          sceneryActive={!!currentScene}
          musicActive={musicOpen && isMusicPlaying}
        />
        {showPlan      && <ExercisePlanOverlay />}
        {showVoice     && <VoiceControlOverlay
                            counts={counts}
                            detection={detection}
                            heartRate={heartRate}
                            isAwake={zoneActive}
                            onCommandProcessed={(c,r)=>console.log('Coach:',r)}
                          />}
            {musicOpen && (
              <MusicOverlay
                bpm={heartRate}
                onClose={() => setMusicOpen(false)}
                onPlay={() => setIsMusicPlaying(true)}
                onPause={() => setIsMusicPlaying(false)}
                onStop={() => setIsMusicPlaying(false)}
              />
            )}
        {showCamera    && <CameraOverlay open={showCamera} onClose={() => setShowCamera(false)} />}
      {showScenery   &&
         <SceneryOverlay
                  open
                  onClose={() => setShowScenery(false)}
                  onSceneChange={(scene, intensity) => {
                    setCurrentScene(scene);
                    setSceneryIntensity(intensity);
                    setShowScenery(false);
                  }}
                />
      }
      {showHeartRate && (
        <HeartRateOverlay
          open={showHeartRate}
          onClose={() => { setShowHeartRate(false); setAutoHrScanTrigger(false); }}
          setHeartRate={setHeartRate}
          onScanning={handleHrScanning}
          onConnecting={handleHrConnecting}
          onConnect={handleHrConnect}
          onDisconnect={handleHrDisconnect}
          onError={handleHrError}
          autoScan={autoHrScanTrigger}
        />
      )}
      </div>
    </div>
  );
}
