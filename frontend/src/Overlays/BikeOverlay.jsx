import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  faBicycle, faPlug, faCheckCircle, faTimesCircle,
  faSyncAlt, faSlidersH, faChartLine,
  faSave, faDumbbell, faGlobe
} from '@fortawesome/free-solid-svg-icons';
import { faBluetooth } from '@fortawesome/free-brands-svg-icons';
import { Physics, usePlane, useConvexPolyhedron } from '@react-three/cannon';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../css/BikeOverlay.css';
import { calculateRideSummary } from '../utils/rideAnalysis';
import { exportWorkoutSummaryToCSV, downloadFile } from '../utils/workoutExporter';

import useBluetooth from '../hooks/useBluetooth';
import { PRESET_WORKOUTS } from '../config/bluetoothConstants';
import HeartRateOverlay from './HeartRateOverlay';
import SimulatorScene from '../SimulatorScene';
import AchievementsOverlay from './AchievementsOverlay';

const DEFAULT_SETTINGS = {
  hrZones: [0, 115, 135, 155, 175, 195],
  ftp: 200, weight: 75, metricUnits: true,
  autoConnect: false, resistanceOffset: 0,
};

// Simple event stream for power and cadence
function createStream() {
  const subs = [];
  return {
    subscribe(cb) { subs.push(cb); return () => { const i = subs.indexOf(cb); if (i >= 0) subs.splice(i, 1); }; },
    next(v) { subs.forEach(cb => cb(v)); }
  };
}

export default function BikeOverlay({ open, onClose, onStartSimulation }) {
  const [uiMessage, setUiMessage] = useState({ text: '', type: '' });
  const [uiResistance, setUiResistance] = useState(0);
  const [calories, setCalories] = useState(0);
  const [activeTab, setActiveTab] = useState('control');

  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [workoutActive, setWorkoutActive] = useState(false);
  const [workoutPaused, setWorkoutPaused] = useState(false);
  const [workoutTime, setWorkoutTime] = useState(0);
  const [currentSegment, setCurrentSegment] = useState(null);
  const workoutTimerRef = useRef(null);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [customWorkout, setCustomWorkout] = useState({
    name: 'My Custom Workout',
    segments: [
      { type: 'warmup', duration: 180, resistance: 20, cadence: '70-80' },
      { type: 'interval', duration: 120, resistance: 40, cadence: '90-100' },
      { type: 'cooldown', duration: 180, resistance: 15, cadence: '60-70' }
    ]
  });
  const [workoutMetrics, setWorkoutMetrics] = useState({
    avgPower: 0, maxPower: 0, avgCadence: 0, maxCadence: 0,
    avgHr: 0, maxHr: 0, totalCalories: 0, duration: 0,
    powerDataPoints: 0, cadenceDataPoints: 0, hrDataPoints: 0,
  });

  const [powerHistory, setPowerHistory] = useState([]);
  const [hrHistory, setHrHistory] = useState([]);
  const [cadenceHistory, setCadenceHistory] = useState([]);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [hrOverlayOpen, setHrOverlayOpen] = useState(false);
  const [externalHeartRate, setExternalHeartRate] = useState(null);

  const {
    status: btStatus, deviceName,
    scanAndConnect, disconnect: btDisconnect,
    power: btPower, cadence: btCadence, heartRate: btHeartRate,
    setDeviceResistance,
    updateResistanceOffset: updateHookResistanceOffset,
  } = useBluetooth({
    onSuccessMessage: useCallback(msg => setUiMessage({ text: msg, type: 'success' }), []),
    onErrorMessage: useCallback(msg => setUiMessage({ text: msg, type: 'error' }), []),
    onDeviceConnected: useCallback(name => setUiMessage({ text: `Connected to ${name}. Ready to ride!`, type: 'success' }), []),
    onDeviceDisconnected: useCallback(() => {
      setUiMessage({ text: 'Device disconnected.', type: 'info' });
      if (workoutActive || workoutPaused) {
        setWorkoutPaused(true);
        setWorkoutActive(false);
        setUiMessage({ text: 'Device disconnected. Workout paused.', type: 'warn' });
      }
    }, [workoutActive, workoutPaused]),
    initialResistanceOffset: settings.resistanceOffset,
  });

  // Streams for SimulatorScene
  const [powerStream] = useState(() => createStream());
  const [cadenceStream] = useState(() => createStream());
  useEffect(() => { powerStream.next(btPower); }, [btPower]);
  useEffect(() => { cadenceStream.next(btCadence); }, [btCadence]);;

  useEffect(() => {
    try {
      const ss = localStorage.getItem('bikeConnectSettings');
      if(ss) setSettings(prev => ({ ...prev, ...JSON.parse(ss) }));
      const sh = localStorage.getItem('bikeWorkoutHistory');
      if(sh) setWorkoutHistory(JSON.parse(sh));
    } catch(e) {
      console.error('Failed to load saved data', e);
    }
  }, []);

  useEffect(() => {
    updateHookResistanceOffset(settings.resistanceOffset);
  }, [settings.resistanceOffset, updateHookResistanceOffset]);

  const handleUiResistanceChange = useCallback(async val => {
    const pct = Math.max(0, Math.min(100, parseInt(val, 10)));
    setUiResistance(pct);
    if (btStatus === 'connected') {
      // scale to 0–255 float for devices that expect 8-bit levels
      const raw = Math.round(pct * 2.55);
      await setDeviceResistance(raw);
    }
  }, [btStatus, setDeviceResistance]);
  ;

  useEffect(() => {
    let metricsInterval;
    const CALC_SEC = 2, J_PER_KCAL = 4184, EFF = 0.25;
    if(btStatus === 'connected') {
      metricsInterval = setInterval(() => {
        const now = Date.now();
        setPowerHistory(p => [...p.slice(-150), { time: now, value: btPower }]);
        setCadenceHistory(c => [...c.slice(-150), { time: now, value: btCadence }]);
        if(btPower > 0) {
          const kcal = (btPower * CALC_SEC) / J_PER_KCAL / EFF;
          setCalories(prev => prev + kcal);
        }
        if(workoutActive && !workoutPaused) {
          setWorkoutMetrics(prev => {
            const dur = prev.duration + CALC_SEC;
            const updateAvg = (avg, val, cnt) => cnt > 0 ? (avg*(cnt-1)+val)/cnt : val;
            const pc = prev.powerDataPoints + (btPower>0?1:0);
            const cc = prev.cadenceDataPoints + (btCadence>0?1:0);
            const hc = prev.hrDataPoints + (btHeartRate>0?1:0);
            return {
              avgPower: updateAvg(prev.avgPower, btPower, pc),
              maxPower: Math.max(prev.maxPower, btPower),
              avgCadence: updateAvg(prev.avgCadence, btCadence, cc),
              maxCadence: Math.max(prev.maxCadence, btCadence),
              avgHr: updateAvg(prev.avgHr, btHeartRate, hc),
              maxHr: Math.max(prev.maxHr, btHeartRate),
              duration: dur,
              totalCalories: prev.totalCalories + (btPower*CALC_SEC)/J_PER_KCAL/EFF,
              powerDataPoints: pc,
              cadenceDataPoints: cc,
              hrDataPoints: hc,
            };
          });
        }
      }, 2000);
    }
    return () => clearInterval(metricsInterval);
  }, [btStatus, btPower, btCadence, btHeartRate, workoutActive, workoutPaused]);

  useEffect(() => {
    if(workoutActive && !workoutPaused && selectedWorkout) {
      workoutTimerRef.current = setInterval(() => {
        setWorkoutTime(t => {
          const nt = t+1;
          const total = selectedWorkout.segments.reduce((s,seg)=>s+seg.duration,0);
          if(nt>=total) { completeWorkout(); return nt; }
          let elapsed=0, segChanged=false;
          for(const seg of selectedWorkout.segments){
            if(nt>=elapsed && nt<elapsed+seg.duration){
              if(!currentSegment||currentSegment.type!==seg.type||currentSegment.duration!==seg.duration||currentSegment.resistance!==seg.resistance){
                setCurrentSegment(seg);
                segChanged=true;
              }
              break;
            }
            elapsed+=seg.duration;
          }
          if(segChanged && currentSegment && btStatus==='connected') handleUiResistanceChange(currentSegment.resistance);
          return nt;
        });
      },1000);
    } else clearInterval(workoutTimerRef.current);
    return ()=>clearInterval(workoutTimerRef.current);
  }, [workoutActive, workoutPaused, selectedWorkout, btStatus, currentSegment, handleUiResistanceChange]);

  const saveSettingsHandler = useCallback(()=>{
    localStorage.setItem('bikeConnectSettings', JSON.stringify(settings));
    setUiMessage({ text:'Settings saved!', type:'success' });
  },[settings]);

  const startWorkoutHandler = useCallback(w=>{
    if(btStatus!=='connected'){setUiMessage({text:"Please connect to the bike first!",type:'error'});return;}
    setSelectedWorkout(w);setWorkoutActive(true);setWorkoutPaused(false);setWorkoutTime(0);setCurrentSegment(null);
    handleUiResistanceChange(w.segments[0].resistance);
    setWorkoutMetrics({avgPower:0,maxPower:0,avgCadence:0,maxCadence:0,avgHr:0,maxHr:0,totalCalories:0,duration:0,powerDataPoints:0,cadenceDataPoints:0,hrDataPoints:0});
    setCalories(0);setPowerHistory([]);setHrHistory([]);setCadenceHistory([]);
    setActiveTab('control');
    setUiMessage({text:`Workout "${w.name}" started!`,type:'info'});
  },[btStatus,handleUiResistanceChange]);

  const togglePauseWorkoutHandler = useCallback(()=>{
    if(!selectedWorkout)return;
    if(workoutActive&&!workoutPaused){setWorkoutPaused(true);setWorkoutActive(false);setUiMessage({text:'Workout paused.',type:'info'});} 
    else if(selectedWorkout&&workoutPaused){setWorkoutPaused(false);setWorkoutActive(true);setUiMessage({text:'Workout resumed.',type:'info'});}  
  },[selectedWorkout,workoutActive,workoutPaused]);

  const completeWorkout = useCallback(()=>{
    clearInterval(workoutTimerRef.current);
    if(selectedWorkout){
      const detailed = calculateRideSummary(powerHistory,hrHistory,cadenceHistory,workoutMetrics.duration,settings.ftp,calories);
      const comp = { id:Date.now(),date:new Date().toISOString(),workoutName:selectedWorkout.name,metrics:detailed };
      const newH=[comp,...workoutHistory.slice(0,19)];setWorkoutHistory(newH);localStorage.setItem('bikeWorkoutHistory',JSON.stringify(newH));
      setUiMessage({text:`Workout "${selectedWorkout.name}" completed! Detailed stats saved.`,type:'success'});
    }
    setWorkoutActive(false);setWorkoutPaused(false);
  },[selectedWorkout,workoutMetrics,calories,workoutHistory,settings.ftp,powerHistory,hrHistory,cadenceHistory]);

  const handleAddCustomSegment = ()=>setCustomWorkout(p=>({...p,segments:[...p.segments,{type:'interval',duration:60,resistance:30,cadence:'80-90'}]}));
  const handleRemoveCustomSegment = i=>setCustomWorkout(p=>({...p,segments:p.segments.filter((_,idx)=>idx!==i)}));
  const handleCustomSegmentChange = (i,field,val)=>{
    setCustomWorkout(p=>{const segs=[...p.segments];segs[i] ={...segs[i],[field]:(field==='duration'||field==='resistance'?parseInt(val,10)||0:val)};return {...p,segments:segs}});
  };
  const handleSaveCustomWorkoutToStorage = ()=>{const s=JSON.parse(localStorage.getItem('customWorkouts')||'[]');const w={...customWorkout,id:`custom-${Date.now()}`};localStorage.setItem('customWorkouts',JSON.stringify([...s,w]));setUiMessage({text:'Custom workout saved to browser storage!',type:'success'});};

  useEffect(()=>{if(btHeartRate>0)setExternalHeartRate(btHeartRate);},[btHeartRate]);

  const formatTime=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const formatSegmentTime=(seg,ct)=>{if(!seg||!selectedWorkout)return '--:--';let et=0;for(const s of selectedWorkout.segments){if(s===seg){const tis=ct-et;return formatTime(Math.max(0,seg.duration-tis));}et+=s.duration;}return formatTime(seg.duration);};
  const calculateWorkoutProgress=()=>{if(!selectedWorkout||workoutMetrics.duration===0)return 0;const tot=selectedWorkout.segments.reduce((sum,sg)=>sum+sg.duration,0);return tot>0?(workoutTime/tot)*100:0;};
  const getHeartRateZone = (hr) => {
    if (hr <= 0 || settings.hrZones.length < 6) return 0;
    for (let i = settings.hrZones.length - 1; i >= 1; i--) {
      if (hr >= settings.hrZones[i]) return i;
    }
    return 0;
  };

// e.g. right after your other constants
const hrZoneColors = ['#e0f7fa', '#e8f5e9', '#fffde7', '#fff3e0', '#ffebee'];
    const maxHr = settings.hrZones[settings.hrZones.length - 1];
  
 const getPowerZone = (power) => {
   const pct = settings.ftp > 0 ? power / settings.ftp : 0;
   if (pct <= 0.55) return 1;
   if (pct <= 0.75) return 2;
   if (pct <= 0.90) return 3;
   if (pct <= 1.05) return 4;
   return 5;
 };
  const getSegmentTypeColor=t=>({warmup:'#8dd1e1',sprint:'#ff3b30',recovery:'#34c759',climb:'#af52de',flat:'#5ac8fa',effort:'#ff9500',ftp:'#ff2d55',interval:'#5856d6',cooldown:'#65c466'}[t.toLowerCase()]||'#c7c7cc');

  const [physicsSettings, setPhysicsSettings] = useState({
    gravityMultiplier: 1,
    maxSpeed: 10,
    ftp: settings.ftp,
    avatarMass: 5,
    timeScale: 0.02,
    achievementDistance: 1000,
    achievementStep: 1000
  });
  const [environmentSettings, setEnvironmentSettings] = useState({
    groundColor: '#7cfc00',
    sunPosition: [5, 10, 2]
  });
  const [achievements, setAchievements] = useState([]);

  const handleAchievement = useCallback(name => {
    setAchievements(prev => [...prev, { id: Date.now(), name, icon: '/icons/' + name + '.png' }]);
  }, []);

  
  if (!open) return null;

  return (
    <>
      {/* Heart Rate Sub-Overlay */}
      <HeartRateOverlay
        open={hrOverlayOpen}
        onClose={() => setHrOverlayOpen(false)}
        setHeartRate={setExternalHeartRate}
        autoScan
        onScanning={() => setUiMessage({ text: 'Scanning HR monitor…', type: 'info' })}
        onConnecting={() => setUiMessage({ text: 'Connecting to HR monitor…', type: 'info' })}
        onConnect={() => setUiMessage({ text: 'HR monitor connected', type: 'success' })}
        onDisconnect={() => setUiMessage({ text: 'HR monitor disconnected', type: 'info' })}
        onError={msg => setUiMessage({ text: msg, type: 'error' })}
      />
  
      {/* Main Bike Overlay */}
      <div className="bike-overlay">
        <div className="bike-modal expanded">
          {/* Header */}
          <header>
            <FontAwesomeIcon icon={faBicycle} size="2x" />
            <h2>EquaRide {deviceName && `(${deviceName})`}</h2>
            <button className="close-btn" onClick={onClose}>
              <FontAwesomeIcon icon={faTimesCircle} />
            </button>
          </header>
  
          {/* Status Bar */}
          {uiMessage.text && (
            <div className={`message-bar ${uiMessage.type}`}>
              {uiMessage.text}
              <button className="close-message" onClick={() => setUiMessage({ text: '', type: '' })}>
                ×
              </button>
            </div>
          )}
  
          {/* Connection Status */}
          <div className="bike-status">
            {btStatus === 'disconnected' && <span className="status disconnected">Disconnected</span>}
            {btStatus === 'scanning'    && <span className="status scanning"><FontAwesomeIcon icon={faSyncAlt} spin /> Scanning…</span>}
            {btStatus === 'connecting'  && <span className="status connecting"><FontAwesomeIcon icon={faPlug} spin /> Connecting…</span>}
            {btStatus === 'discovering' && <span className="status discovering">Discovering services…</span>}
            {btStatus === 'connected'   && <span className="status connected"><FontAwesomeIcon icon={faCheckCircle} /> Connected</span>}
            {btStatus === 'error'       && <span className="status error"><FontAwesomeIcon icon={faTimesCircle} /> Connection Problem</span>}
  
            {(btStatus === 'disconnected' || btStatus === 'error') && (
              <button
                className="connect-btn"
                onClick={scanAndConnect}
                disabled={btStatus === 'scanning' || btStatus === 'connecting'}
              >
                <FontAwesomeIcon icon={faBluetooth} /> Connect Bike
              </button>
            )}
            {btStatus === 'connected' && (
              <button className="connect-btn disconnect" onClick={btDisconnect}>
                Disconnect
              </button>
            )}
          </div>
  
        
  
          {/* Tabs */}
          <div className="tabs">
            {[
              { id: 'control',   label: 'Control',   icon: faSlidersH },
              { id: 'workouts',  label: 'Workouts',  icon: faDumbbell },
              { id: 'stats',     label: 'Stats',     icon: faChartLine },
              { id: 'settings',  label: 'Settings',  icon: faSlidersH },
              { id: 'simulator', label: 'Simulator', icon: faGlobe }
            ].map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <FontAwesomeIcon icon={tab.icon} /> {tab.label}
              </button>
            ))}
          </div>
  
          {/* Single Tab-Content */}
          <div className="tab-content">
            {/* CONTROL TAB */}
            {activeTab === 'control' && (
              <div className="control-tab">
                           {!selectedWorkout || workoutPaused ? ( // Show manual resistance if no workout or workout paused
                    <div className="resistance-control">
                      <h3>Manual Resistance ({uiResistance}%)</h3>
                      <div className="resistance-slider">
                        <input type="range" min="0" max="100" value={uiResistance}
                               onChange={(e) => handleUiResistanceChange(e.target.value)} />
                        <div className="resistance-labels"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
                      </div>
                      <div className="resistance-buttons">
                        {[-10, -5, -1, +1, +5, +10].map(adj => (
                          <button key={adj} onClick={() => handleUiResistanceChange(uiResistance + adj)}>
                            {adj > 0 ? `+${adj}` : adj}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="resistance-control"><h3>Workout Controlling Resistance ({uiResistance}%)</h3></div>
                  )}

                  {selectedWorkout && (
                    <div className="active-workout">
                      <h3>
                        {workoutPaused ? "Workout Paused: " : (workoutActive ? "Active Workout: " : "Workout Ended: ")}
                        {selectedWorkout.name}
                      </h3>
                      <div className="workout-progress">
                        <div className="progress-bar" style={{ width: `${calculateWorkoutProgress()}%` }}></div>
                        <div className="total-time">
                          {formatTime(workoutTime)} / {formatTime(selectedWorkout.segments.reduce((s, seg) => s + seg.duration, 0))}
                        </div>
                      </div>
                      {currentSegment && (
                        <div className="segment-info">
                          <div className="segment-type" style={{ backgroundColor: getSegmentTypeColor(currentSegment.type) }}>
                            {currentSegment.type.toUpperCase()}
                          </div>
                          <div className="segment-details">
                            <div>Target Res: {currentSegment.resistance}%</div>
                            <div>Target RPM: {currentSegment.cadence}</div>
                            <div>Seg. Time Left: {formatSegmentTime(currentSegment, workoutTime)}</div>
                          </div>
                        </div>
                      )}
                      <div className="workout-controls">
                        <button onClick={togglePauseWorkoutHandler}>
                          {workoutActive && !workoutPaused ? 'Pause Workout' : 'Resume Workout'}
                        </button>
                        <button onClick={completeWorkout} className="end-workout">
                          End & Save Workout
                        </button>
                      </div>
                    </div>
                  )}
                  {(!selectedWorkout && PRESET_WORKOUTS.length > 0) && (
                     <div className="quick-workout">
                        <h3>Quick Start Preset Workouts</h3>
                        <div className="workout-buttons">
                        {PRESET_WORKOUTS.map(w => (
                            <button key={w.id} onClick={() => startWorkoutHandler(w)} disabled={!!selectedWorkout && (workoutActive || workoutPaused)}>
                            {w.name}
                            </button>
                        ))}
                        </div>
                    </div>
                  )}
                </div>
            )}
  
            {/* WORKOUTS TAB */}
            {activeTab === 'workouts' && (
              <div className="workouts-tab">
                   <div className="workout-list">
                        <h3>Preset Workouts</h3>
                        {PRESET_WORKOUTS.map(w => (
                        <div className="workout-card" key={w.id}>
                            <h4>{w.name} ({formatTime(w.segments.reduce((s, sg) => s + sg.duration, 0))})</h4>
                            <p>{w.description}</p>
                            <div className="segment-preview">
                            {w.segments.map((sg, i) => (
                                <div key={i} className="segment-bar"
                                    style={{ backgroundColor: getSegmentTypeColor(sg.type), flexGrow: sg.duration }}
                                    title={`${sg.type}: ${formatTime(sg.duration)}, ${sg.resistance}%, ${sg.cadence} RPM`}
                                ></div>
                            ))}
                            </div>
                            <button onClick={() => startWorkoutHandler(w)} disabled={!!selectedWorkout && (workoutActive || workoutPaused)}>
                            Start This Workout
                            </button>
                        </div>
                        ))}
                    </div>
                    <div className="custom-workout">
                        <h3>Custom Workout Builder</h3>
                        <input type="text" value={customWorkout.name}
                            onChange={(e) => setCustomWorkout(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Custom Workout Name" />
                        <div className="segment-editor">
                        <h4>Segments</h4>
                        {customWorkout.segments.map((sg, i) => (
                            <div className="segment-row" key={i}>
                            <select value={sg.type} onChange={(e) => handleCustomSegmentChange(i, 'type', e.target.value)}>
                                {Object.keys(getSegmentTypeColor('')).map(type => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
                            </select>
                            <input type="number" placeholder="Duration (s)" value={sg.duration} onChange={(e) => handleCustomSegmentChange(i, 'duration', e.target.value)} min="10" />
                            <input type="number" placeholder="Resistance %" value={sg.resistance} onChange={(e) => handleCustomSegmentChange(i, 'resistance', e.target.value)} min="0" max="100" />
                            <input type="text" placeholder="Cadence (RPM)" value={sg.cadence} onChange={(e) => handleCustomSegmentChange(i, 'cadence', e.target.value)} />
                            <button onClick={() => handleRemoveCustomSegment(i)} disabled={customWorkout.segments.length <= 1}>Remove</button>
                            </div>
                        ))}
                        <button onClick={handleAddCustomSegment}>Add Segment</button>
                        </div>
                        <div className="save-workout">
                        <button onClick={() => startWorkoutHandler(customWorkout)} disabled={!!selectedWorkout && (workoutActive || workoutPaused) || customWorkout.segments.length === 0}>
                            Start Custom Workout
                        </button>
                        <button onClick={handleSaveCustomWorkoutToStorage}>Save Custom Workout to Browser</button>
                        </div>
                    </div>
                 </div>
            )}
  
            {/* SIMULATOR TAB */}
            {activeTab === 'simulator' && (
              <div className="simulator-tab">
                <div className="physics-controls">
                  {/* … physics sliders … */}
                </div>
                <SimulatorScene
                  routeId={PRESET_WORKOUTS[0]?.id || 'default'}
                  powerStream={powerStream}
                  cadenceStream={cadenceStream}
                  windSettings={settings.windSettings}
                  physicsSettings={physicsSettings}
                  environmentSettings={environmentSettings}
                  onAchievement={handleAchievement}
                  />
                  <div className="sim-start">
                       <button
                         className="start-sim-btn"
                         onClick={() => {
                           onClose();                 // close overlay
                           onStartSimulation();       // notify parent
                         }}
                       >
                         Launch Simulation
                       </button>
                     </div>
                
                {achievements.length > 0 && <AchievementsOverlay achievements={achievements} />}
              </div>
            )}
  
            {/* STATS TAB */}
            {activeTab === 'stats' && (
              <div className="stats-tab">
               {/* ... other content of stats-tab like Live Charts ... */}

               <div className="workout-history">
                    <h3>Workout History (Last 20)</h3>
                    {workoutHistory.length > 0 ? (
                      <div className="history-list">
                        {workoutHistory.map(wh => ( // <-- 'wh' is defined HERE for each item

                          <div className="history-item" key={wh.id}>
                            <div className="history-header">
                              <h4>{wh.workoutName || 'Unnamed Workout'}</h4>
                              <div>{wh.date ? new Date(wh.date).toLocaleString() : 'No Date'}</div>
                            </div>

                            {/* Ensure wh.metrics exists before trying to display detailed metrics */}
                            {wh.metrics ? (
                              <div className="history-metrics">
                                <div><span>Dur:</span> {formatTime(wh.metrics.duration)}</div>

                                {/* Display power metrics if available and valid */}
                                {wh.metrics.avgPower > 0 && (
                                  <>
                                    <div><span>Avg P:</span> {wh.metrics.avgPower}W</div>
                                    <div><span>Max P:</span> {wh.metrics.maxPower}W</div>
                                    <div><span>NP:</span> {wh.metrics.normalizedPower !== undefined ? `${wh.metrics.normalizedPower}W` : 'N/A'}</div>
                                    <div><span>IF:</span> {wh.metrics.intensityFactor !== undefined ? wh.metrics.intensityFactor.toFixed(2) : 'N/A'}</div>
                                    <div><span>TSS:</span> {wh.metrics.tss !== undefined ? wh.metrics.tss : 'N/A'}</div>
                                  </>
                                )}

                                {/* Display heart rate metrics if available and valid */}
                                {wh.metrics.avgHr > 0 && (
                                  <>
                                    <div><span>Avg HR:</span> {wh.metrics.avgHr}bpm</div>
                                    <div><span>Max HR:</span> {wh.metrics.maxHr}bpm</div>
                                  </>
                                )}

                                {/* Display cadence metrics if available and valid */}
                                {wh.metrics.avgCadence > 0 && (
                                  <>
                                    <div><span>Avg RPM:</span> {wh.metrics.avgCadence}</div>
                                    <div><span>Max RPM:</span> {wh.metrics.maxCadence}</div>
                                  </>
                                )}
                                
                                <div><span>Cal:</span> {wh.metrics.totalCalories !== undefined ? wh.metrics.totalCalories : 'N/A'}</div>

                            
                                <button 
                                  onClick={() => {
                                    if (wh.metrics) {
                                      const csvData = exportWorkoutSummaryToCSV(wh); // Make sure exportWorkoutSummaryToCSV is imported
                                      downloadFile(csvData, `workout_${(wh.workoutName || 'untitled').replace(/\s+/g, '_')}_${wh.date ? new Date(wh.date).toISOString().split('T')[0] : 'nodate'}.csv`); // Make sure downloadFile is imported
                                    }
                                  }}
                                  style={{ marginTop: '10px', fontSize: '12px', padding: '5px 8px' }}
                                >
                                  Export CSV
                                </button>
                                
                              </div>
                            ) : (
                              <div className="history-metrics">
                                <p>Metric data is unavailable for this entry.</p>
                              </div>
                            )}
                          </div>
                        ))} 
                        
                        <button 
                          onClick={() => { 
                            if(window.confirm('Are you sure you want to clear all workout history? This cannot be undone.')) { 
                              setWorkoutHistory([]); 
                              localStorage.removeItem('bikeWorkoutHistory');
                              setUiMessage({ text: 'Workout history cleared.', type: 'info' });
                            }
                          }} 
                          className="clear-history"
                          disabled={workoutHistory.length === 0} // Disable if no history
                        >
                          Clear All History
                        </button>
                      </div>
                    ) : (
                      <div className="no-history">No workout history yet. Complete a workout to see it here.</div>
                    )}
                  </div>
                </div>
            )}
  
            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="settings-tab">
                    <h3>Settings</h3>
                    <div className="settings-section">
                        <h4>Personal</h4>
                        <div className="setting-item"><label>FTP (watts)</label><input type="number" value={settings.ftp} onChange={(e) => setSettings(s => ({...s, ftp: parseInt(e.target.value)}))} min="50" max="600" /></div>
                        <div className="setting-item"><label>Weight ({settings.metricUnits ? 'kg' : 'lbs'})</label><input type="number" value={settings.weight} onChange={(e) => setSettings(s => ({...s, weight: parseFloat(e.target.value)}))} min="30" step="0.1" /></div>
                        <div className="setting-item checkbox"><label><input type="checkbox" checked={settings.metricUnits} onChange={(e) => setSettings(s => ({...s, metricUnits: e.target.checked}))}/> Use Metric Units</label></div>
                    </div>
                    <div className="settings-section">
                        <h4>Heart Rate Zones (Threshold to enter zone)</h4>
                        {settings.hrZones.slice(1).map((zoneThreshold, index) => (
                            <div className="setting-item" key={index}><label>Zone {index + 1} starts at (BPM)</label><input type="number" value={zoneThreshold} onChange={(e) => {const newZ = [...settings.hrZones]; newZ[index+1] = parseInt(e.target.value); setSettings(s => ({ ...s, hrZones: newZ }));}} min={(settings.hrZones[index] || 0) + 1} max="220"/></div>
                        ))}
                    </div>
                    <div className="settings-section">
                        <h4>Connection & Device</h4>
                        <div className="setting-item checkbox"><label><input type="checkbox" checked={settings.autoConnect} onChange={(e) => setSettings(s => ({...s, autoConnect: e.target.checked}))}/> Auto-connect on start (Browser may limit)</label></div>
                        <div className="setting-item"><label>Resistance Offset (+/- %)</label><input type="number" value={settings.resistanceOffset} onChange={(e) => setSettings(s => ({...s, resistanceOffset: parseInt(e.target.value)}))} min="-20" max="20" /><span className="setting-help">Fine-tune bike's reported vs felt resistance.</span></div>
                    </div>
                    <div className="settings-actions"><button onClick={saveSettingsHandler} className="save-settings"><FontAwesomeIcon icon={faSave} /> Save Settings</button></div>
                 </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
  