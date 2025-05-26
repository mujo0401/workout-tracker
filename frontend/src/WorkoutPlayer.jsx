// src/WorkoutPlayer.jsx
import React, { useRef, useEffect, useState, useCallback } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTachometerAlt, faSlidersH, faRunning,
  faHeartbeat, faFire
} from '@fortawesome/free-solid-svg-icons';
import StreamManager from "./StreamManager";
import ExpandableMenuOverlay from './Overlays/ExpandableMenuOverlay';
import DetectionOverlay from "./Overlays/DetectionOverlay";
import ExercisePlanOverlay from "./Overlays/ExercisePlanOverlay";
import HealthOverlay from "./Overlays/HealthOverlay";
import VoiceControlOverlay from "./Overlays/VoiceControlOverlay";
import HeartRateOverlay from "./Overlays/HeartRateOverlay";
import MusicOverlay from "./Overlays/MusicOverlay";
import HeartRateZoneOverlay from "./Overlays/HeartRateZoneOverlay";
import PoseOverlay from "./Overlays/PoseOverlay";
import CameraOverlay from "./Overlays/CameraOverlay";
import SceneryOverlay from "./Overlays/SceneryOverlay";
import SceneryRenderer from "./Overlays/SceneryRenderer";
import { analyzePose } from "./services/PoseService";
import ExerciseZoneOverlay from './Overlays/ExerciseZoneOverlay';
import SimulatorScene from './SimulatorScene'
import StatisticsOverlay from './Overlays/StatisticsOverlay';
import BikeOverlay from './Overlays/BikeOverlay';
import BikeMetricsOverlay from './Overlays/BikeMetricsOverlay';
import "./css/WorkoutPlayer.css";

import useBluetooth from './hooks/useBluetooth'; // Added for persistent BT connection

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
  const [showStatistics, setShowStatistics] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentScene, setCurrentScene] = useState(null);
  const [sceneryIntensity, setSceneryIntensity] = useState(50);
  const [showBike, setShowBike] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }, []);

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
  const [uiResistance, setUiResistance] = useState(0); 
  const [sessionCalories, setSessionCalories] = useState(0); 
  const [autoHrScanTrigger, setAutoHrScanTrigger] = useState(false);
  const [bikeData, setBikeData] = useState({ power:0, resistance:0, cadence:0, hr:0, calories:0 });

  const videoWidth = 1200;
  const videoHeight = 600;

  // --- Bluetooth Smart Bike Integration ---
  const {
    status: btStatus,
    deviceName: btDeviceName,
    scanAndConnect: btScanAndConnect,
    disconnect: btDisconnect,
    power: btPower,
    cadence: btCadence,
    heartRate: btHeartRateFromBike, 
    setDeviceResistance: btSetDeviceResistance,
  } = useBluetooth({
    onSuccessMessage: useCallback(msg => showToast(msg, 'success'), [showToast]),
    onErrorMessage: useCallback(msg => showToast(msg, 'error'), [showToast]),
    onDeviceConnected: useCallback(name => showToast(`Connected to ${name}. Ready to ride!`, 'success'), [showToast]),
    onDeviceDisconnected: useCallback(() => {
      showToast('Bike disconnected.', 'info');
    }, [showToast]),
    // initialResistanceOffset: settings.resistanceOffset, // If settings are managed here
  });
  // --- End Bluetooth Smart Bike Integration ---

  const handleUiResistanceChange = useCallback(async (value) => {
    const percentage = Math.max(0, Math.min(100, parseInt(value, 10)));
    setUiResistance(percentage);
    if (btStatus === 'connected') {
      await btSetDeviceResistance(percentage);
    }
  }, [btStatus, btSetDeviceResistance, setUiResistance]);

  function createStream() {
    const subs = [];
    let latestValue = 0;
    return {
      subscribe(cb) {
        subs.push(cb);
        cb(latestValue); 
        return () => {
          const i = subs.indexOf(cb);
          if (i >= 0) subs.splice(i, 1);
        };
      },
      next(v) {
        latestValue = v; 
        subs.forEach(cb => cb(v));
      },
      get latest() {
        return latestValue;
      }
    };
  }

  const [powerStream] = useState(() => createStream());
  const [cadenceStream] = useState(() => createStream());

  // Feed data from useBluetooth into streams
  useEffect(() => {
    // Always update stream, even if not connected (will pass 0 or last known value)
    powerStream.next(btPower);
  }, [btPower, powerStream]);

  useEffect(() => {
    // Always update stream
    cadenceStream.next(btCadence);
  }, [btCadence, cadenceStream]);


  const DEFAULT_PHYSICS = {
    gravityMultiplier: 1,
    maxSpeed: 10,
    ftp: 200,
    avatarMass: 5,
    timeScale: 0.02,
    achievementDistance: 1000,
    achievementStep: 1000,
    planeProps: {},
    maxCadence: 120
  };

  const DEFAULT_ENV = {
    groundColor: '#7cfc00', 
    sunPosition: [5, 10, 2]
  };
  
  const [physicsSettings, setPhysicsSettings] = useState(DEFAULT_PHYSICS);
  const [environmentSettings, setEnvironmentSettings] = useState(DEFAULT_ENV);

    // Effect to calculate session calories based on btPower
  useEffect(() => {
    let calorieInterval;
    if (btStatus === 'connected' && btPower > 0) {
      calorieInterval = setInterval(() => {
        const CALC_SEC = 2; // Matches interval
        const J_PER_KCAL = 4184;
        const EFFICIENCY = 0.25;
        const kcalPerInterval = (btPower * CALC_SEC) / J_PER_KCAL / EFFICIENCY;
        setSessionCalories(prev => prev + kcalPerInterval);
      }, 2000); // Calculate every 2 seconds
    }
    return () => clearInterval(calorieInterval);
  }, [btStatus, btPower]);

  // Stream setup for video
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
            if (ctx && canvasRef.current) { 
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
              bitmap.close();
              const endTime = performance.now();
              frameTimings.totalLatency += endTime - receiveTime;
              frameTimings.framesProcessed++;
            }
          })
          .catch(() => streamErrorCount++);
      } else {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          (USE_IMAGE_DECODE ? img.decode().catch(() => {}) : Promise.resolve())
            .finally(() => {
              if (ctx && canvasRef.current) { 
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                const endTime = performance.now();
                frameTimings.totalLatency += endTime - receiveTime;
                frameTimings.framesProcessed++;
              }
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
      () => { setStreamStatus("error"); if (canvasRef.current) drawPlaceholder("Stream Connection Error"); },
      streamData => {
        if (streamData && typeof streamData === 'object') {
          setDetection({
            bbox: streamData.bbox || null,
            landmarks: Array.isArray(streamData.landmarks) ? streamData.landmarks : []
          });
          if (showPose) {
            setPoseData({
              bbox: streamData.bbox || null,
              landmarks: Array.isArray(streamData.landmarks) ? streamData.landmarks : []
            });
          }
        }
      }
    );
    return () => {
      manager.disconnect(); 
        if (canvasRef.current && canvasRef.current.getContext("2d")) {
        // Optional: Clear canvas or draw a disconnected message
        // drawPlaceholder("Stream Disconnected");
      }
    };
  }, [showPose]); 

  // HR handlers (for dedicated HR monitor)
  const handleHrScanning = () => { setHrStatus('scanning'); setHrError(null); setHeartRate(null); };
  const handleHrConnecting = () => { setHrStatus('connecting'); setHrError(null); };
  const handleHrConnect = () => { setHrStatus('connected'); setHrError(null); };
  const handleHrDisconnect = () => { setHrStatus('disconnected'); setHeartRate(null); setHrError(null); };
  const handleHrError = msg => { setHrStatus('error'); setHrError(msg || 'Unknown'); setHeartRate(null); };

  const handleZoneEnter = () => setZoneActive(true);
  const handleZoneLeave = () => setZoneActive(false);

  const handleAchievement = (name) => {
    showToast(`Achievement unlocked: ${name}`, 'success');
  };


  return (
    <div className="container">
    <div className="player-wrapper">
      <div className="canvas-container glow">
        {/* Updated condition for rendering SimulatorScene */}
        {currentScene === 'simulation' ? (
          <SimulatorScene
            powerStream={powerStream}
            cadenceStream={cadenceStream}
            physicsSettings={physicsSettings}
            environmentSettings={environmentSettings} 
            onAchievement={handleAchievement}
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={videoWidth}
            height={videoHeight}
            className="canvas"
          />
        )}
          {showBike && (
            <BikeOverlay
              open={showBike}
              onClose={() => setShowBike(false)}
              bluetoothStatus={btStatus}
              bluetoothDeviceName={btDeviceName}
              bluetoothPower={btPower}
              bluetoothCadence={btCadence}
              bluetoothHeartRate={btHeartRateFromBike}
              setBluetoothDeviceResistance={btSetDeviceResistance}
              scanBluetoothDevice={btScanAndConnect}
              uiResistance={uiResistance} 
              onUiResistanceChange={handleUiResistanceChange} 
              disconnectBluetoothDevice={btDisconnect}
              onStartSimulation={() => {
                // Updated: No longer checks btStatus to start simulation
                setShowBike(false); 
                setCurrentScene('simulation'); 
              }}
            />
          )}

          {toast.visible && (
            <div className={`toast toast-${toast.type}`}>
              {toast.message}
            </div>
          )}

            {btStatus === 'connected' && (
          <BikeMetricsOverlay
            power={btPower}
            setPercentage={uiResistance}
            rpm={btCadence}
            bpm={heartRate || btHeartRateFromBike || 0}
            calories={sessionCalories}
            isVisible={true} 
            />
          )}

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
          {musicOpen && (
            <MusicOverlay
              bpm={heartRate || btHeartRateFromBike}
              onClose={() => setMusicOpen(false)}
              onPlay={() => setIsMusicPlaying(true)}
              onPause={() => setIsMusicPlaying(false)}
              onStop={() => setIsMusicPlaying(false)}
            />
          )}
            {showStatistics && (
            <StatisticsOverlay
              open={showStatistics}
              onClose={() => setShowStatistics(false)}
              counts={counts}
            />
          )}
          {showScenery &&
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
          {currentScene && currentScene !== 'simulation' && 
            <SceneryRenderer
              scene={currentScene}
              intensity={sceneryIntensity}
            />
          }
          {showCamera &&
            <CameraOverlay
              open={showCamera}
              onClose={() => setShowCamera(false)}
            />
          }
          <VoiceControlOverlay
            open={showVoice}
            onClose={() => setShowVoice(false)}
            counts={counts}
            detection={detection}
            heartRate={heartRate || btHeartRateFromBike} 
            onCommandProcessed={(c, r) => console.log('Coach:', r)}
          />
          <HealthOverlay
            open={showHealth}
            onClose={() => setShowHealth(false)}
            status={streamStatus} 
            metrics={metrics}   
            timestamp={lastUpdate}
            videoStats={{
              resolution: `${videoWidth}x${videoHeight}`,
              bitrate: 'N/A', 
              codec: 'H.264',  
              frameRate: `${metrics.fps}fps`
            }}
          />
        </div>

        {showPlan && (
          <ExercisePlanOverlay
            open={showPlan}
            onClose={() => setShowPlan(false)}
          />
        )}
        {streamStatus === "connecting" && currentScene !== 'simulation' && (
          <div className="status">Connecting Video Stream…</div>
        )}
        {streamStatus === "error" && currentScene !== 'simulation' && (
          <div className="status error">Video Stream Error!</div>
        )}

          <ExpandableMenuOverlay
            onSelect={key => {
              switch (key) {
                case 'detection': setShowDetection(v => !v); break;
                case 'pose': setShowPose(v => !v); break;
                case 'plan': setShowPlan(v => !v); break;
                case 'health': setShowHealth(v => !v); break;
                case 'voice': setShowVoice(v => !v); break;
                case 'heartrate':
                  if (!showHeartRate) {
                    setShowHeartRate(true);
                    setAutoHrScanTrigger(true);
                  } else {
                    setShowHeartRate(false);
                    setAutoHrScanTrigger(false);
                  }
                  break;
                case 'scenery': setShowScenery(v => !v); break;
                case 'camera': setShowCamera(v => !v); break;
                case 'music': setMusicOpen(v => !v); break;
                case 'statistics': setShowStatistics(v => !v); break;
                case 'bike': setShowBike(v => !v); break;
                default: break;
              }
            }}
            detectionActive={showDetection}
            // poseActive={showPose} 
            healthActive={streamStatus === 'connected'} 
            cameraActive={showCamera}
            sceneryActive={!!currentScene && currentScene !== 'simulation'}
            musicActive={musicOpen && isMusicPlaying}
            statisticsActive={showStatistics}
            bikeActive={btStatus === 'connected'}
            // heartRateActive={hrStatus === 'connected'}
          />
      </div>
    </div>
  );
}