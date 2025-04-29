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

// Music player
import MiniPlayer from "./MiniPlayer";

import "./css/WorkoutPlayer.css";

// Performance optimization flags
const USE_IMAGE_BITMAP = typeof createImageBitmap !== 'undefined';
const USE_IMAGE_DECODE = typeof Image !== 'undefined' && 'decode' in Image.prototype;
const METRICS_INTERVAL = 1000;

export default function WorkoutPlayer() {
  const canvasRef = useRef(null);

  // Overlay visibility
  const [showDetection, setShowDetection] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showHeartRate, setShowHeartRate] = useState(false);
  const [miniPlayerOpen, setMiniPlayerOpen] = useState(false);

  // Core state
  const [detection, setDetection] = useState({ landmarks: [], bbox: null });
  const [counts, setCounts] = useState({ pushups: 0, situps: 0 });
  const [streamStatus, setStreamStatus] = useState("connecting");
  const [metrics, setMetrics] = useState({ fps: 0, latency: 0, errors: 0 });
  const [lastUpdate, setLastUpdate] = useState("");
  const [heartRate, setHeartRate] = useState(null);
  const [hrStatus, setHrStatus] = useState('disconnected');
  const [hrError, setHrError] = useState(null);
  const [zoneActive, setZoneActive] = useState(false);

  const videoWidth = 1200;
  const videoHeight = 600;

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
      ctx.fillText(msg, canvas.width/2, canvas.height/2);
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
          ? Math.round(frameTimings.totalLatency/frameTimings.framesProcessed)
          : 0;
        setMetrics({
          fps: Math.round((frameCount/(receiveTime-lastFrameTime))*1000),
          latency: avgLatency,
          errors: streamErrorCount
        });
        const now = new Date();
        setLastUpdate(
          [now.getHours(), now.getMinutes(), now.getSeconds()]
            .map(n=>String(n).padStart(2,'0')).join(':')
        );
        frameCount=0;
        frameTimings.totalLatency=0;
        frameTimings.framesProcessed=0;
        lastFrameTime=receiveTime;
      }
      const blob = new Blob([buffer],{type:"image/jpeg"});
      if (USE_IMAGE_BITMAP) {
        createImageBitmap(blob)
          .then(bitmap=>{
            ctx.clearRect(0,0,canvas.width,canvas.height);
            ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
            bitmap.close();
            const endTime=performance.now();
            frameTimings.totalLatency+=endTime-receiveTime;
            frameTimings.framesProcessed++;
          })
          .catch(()=>streamErrorCount++);
      } else {
        const url=URL.createObjectURL(blob);
        const img=new Image();
        img.onload=()=>{
          (USE_IMAGE_DECODE?img.decode().catch(()=>{}):Promise.resolve())
            .finally(()=>{
              ctx.clearRect(0,0,canvas.width,canvas.height);
              ctx.drawImage(img,0,0,canvas.width,canvas.height);
              URL.revokeObjectURL(url);
              const endTime=performance.now();
              frameTimings.totalLatency+=endTime-receiveTime;
              frameTimings.framesProcessed++;
            });
        };
        img.onerror=()=>{URL.revokeObjectURL(url);streamErrorCount++;};
        img.src=url;
      }
    };

    const manager=new StreamManager(
      onFrame,
      newCounts=>setCounts(prev=>({...prev,...newCounts})),
      ()=>setStreamStatus("connected"),
      ()=>{setStreamStatus("error");drawPlaceholder("Stream Connection Error");},
      data=>{
        if (data&&typeof data==='object'){
          setDetection({
            bbox:data.bbox||null,
            landmarks:Array.isArray(data.landmarks)?data.landmarks:[]
          });
        }
      }
    );
    return()=>manager.disconnect();
  }, []);

  // HR handlers
  const handleHrScanning=() => { setHrStatus('scanning'); setHrError(null); setHeartRate(null); };
  const handleHrConnecting=() => { setHrStatus('connecting'); setHrError(null); };
  const handleHrConnect=() => { setHrStatus('connected'); setHrError(null); };
  const handleHrDisconnect=() => { setHrStatus('disconnected'); setHeartRate(null); setHrError(null); };
  const handleHrError=msg=>{ setHrStatus('error'); setHrError(msg||'Unknown'); setHeartRate(null); };

  const handleZoneEnter=()=>setZoneActive(true);
  const handleZoneLeave=()=>setZoneActive(false);

  return (
    <div className="container">
      <div className="player-wrapper">
        <div className="canvas-container glow">
          <canvas ref={canvasRef} width={videoWidth} height={videoHeight} className="canvas" />

          {/* Always-on exercise zone */}
          <ExerciseZoneOverlay
            detection={detection}
            heartRate={heartRate}
            targetWidth={videoWidth}
            targetHeight={videoHeight}
            onEnter={handleZoneEnter}
            onLeave={handleZoneLeave}
          />

          {/* Detection overlay */}
          {showDetection && (
            <DetectionOverlay
              detection={detection}
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
        onClose={()=>setShowVoice(false)} 
        counts={counts} detection={detection} 
        heartRate={heartRate} onCommandProcessed={(c,r)=>console.log('Coach:',r)} />


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

        {streamStatus === "connecting" && <div className="status">Connecting Video Stream…</div>}
        {streamStatus === "error" && <div className="status error">Video Stream Error!</div>}

        <ExpandableMenuOverlay
          onSelect={key => {
            switch(key) {
              case 'detection': setShowDetection(v=>!v); break;
              case 'plan':      setShowPlan(v=>!v);       break;
              case 'health':    setShowHealth(v=>!v);     break;
              case 'voice':     setShowVoice(v=>!v);      break;
              case 'heartrate': setShowHeartRate(v => !v);  break;
              case 'music':     setMiniPlayerOpen(v=>!v); break;
              default: break;
            }
          }}

          detectionActive={showDetection}
          heartRateActive={hrStatus === 'connected'}
          healthActive={streamStatus === 'connected'}
        />

        {/* Panels */}
        {showPlan      && <ExercisePlanOverlay />}  
        {showHealth    && <HealthOverlay status={streamStatus} metrics={metrics} timestamp={lastUpdate} videoStats={{ resolution:'1080p', bitrate:'4.5 Mbps', codec:'H.264', frameRate:`${metrics.fps||30}fps` }} />}
        {showVoice     && <VoiceControlOverlay counts={counts} detection={detection} heartRate={heartRate} isAwake={zoneActive} onCommandProcessed={(c,r)=>console.log('Coach:',r)} />}
        {showHeartRate && <HeartRateOverlay setHeartRate={setHeartRate} onScanning={handleHrScanning} onConnecting={handleHrConnecting} onConnect={handleHrConnect} onDisconnect={handleHrDisconnect} onError={handleHrError} />}
        {miniPlayerOpen && <MiniPlayer bpm={heartRate} onClose={()=>setMiniPlayerOpen(false)} />}
      </div>
    </div>
  );
}
