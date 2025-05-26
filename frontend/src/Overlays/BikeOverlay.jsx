import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  faBicycle, faPlug, faCheckCircle, faTimesCircle,
  faSyncAlt, faSlidersH, faChartLine,
  faSave, faDumbbell, faGlobe, faHeartbeat,
  faTachometerAlt, faFire, faRunning
} from '@fortawesome/free-solid-svg-icons';
import { faBluetooth } from '@fortawesome/free-brands-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../css/BikeOverlay.css';
import { calculateRideSummary } from '../utils/rideAnalysis';
import { exportWorkoutSummaryToCSV, downloadFile } from '../utils/workoutExporter';

import { PRESET_WORKOUTS } from '../config/bluetoothConstants';
import HeartRateOverlay from './HeartRateOverlay';
import AchievementsOverlay from './AchievementsOverlay';
import BluetoothConnectionOverlay from './BluetoothConnectionOverlay';

const DEFAULT_SETTINGS = {
  hrZones: [0, 115, 135, 155, 175, 195],
  ftp: 200, weight: 75, metricUnits: true,
  autoConnect: false, resistanceOffset: 0,
};

export default function BikeOverlay({
  open,
  onClose,
  onStartSimulation,
  bluetoothStatus,
  bluetoothDeviceName,
  bluetoothPower,
  bluetoothCadence,
  bluetoothHeartRate,
  setBluetoothDeviceResistance,
  scanBluetoothDevice,
  disconnectBluetoothDevice,
  uiResistance,
  onUiResistanceChange
}) {
  const [uiMessage, setUiMessage] = useState({ text: '', type: '' });
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
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [achievements, setAchievements] = useState([]);

  // Load settings and history from localStorage
  useEffect(() => {
    try {
      const ss = localStorage.getItem('bikeConnectSettings');
      if (ss) setSettings(prev => ({ ...prev, ...JSON.parse(ss) }));
      const sh = localStorage.getItem('bikeWorkoutHistory');
      if (sh) setWorkoutHistory(JSON.parse(sh));
    } catch (e) {
      console.error('Failed to load saved data', e);
    }
  }, []);

  // --- useCallback definitions START (moved up) ---
  const handleAchievement = useCallback(name => {
    setAchievements(prev => [...prev, { id: Date.now(), name, icon: '/icons/' + name + '.png' }]);
    setUiMessage({ text: `Achievement: ${name}!`, type: 'success' });
  }, [setUiMessage]);

  const saveSettingsHandler = useCallback(() => {
    localStorage.setItem('bikeConnectSettings', JSON.stringify(settings));
    setUiMessage({ text: 'Settings saved!', type: 'success' });
  }, [settings, setUiMessage]);

  const handleLocalResistanceChange = useCallback(async val => {
    const pct = Math.max(0, Math.min(100, parseInt(val, 10)));
    const targetResistanceWithOffset = Math.max(0, Math.min(100, pct + (settings.resistanceOffset || 0)));
    if (bluetoothStatus === 'connected') {
      await onUiResistanceChange(targetResistanceWithOffset);
    } else {
      onUiResistanceChange(pct);
    }
  }, [bluetoothStatus, onUiResistanceChange, settings.resistanceOffset]);

  const completeWorkout = useCallback(() => {
    clearInterval(workoutTimerRef.current);
    if (selectedWorkout) {
      const finalMetrics = calculateRideSummary(
        powerHistory,
        hrHistory,
        cadenceHistory,
        workoutMetrics.duration,
        settings.ftp,
        workoutMetrics.totalCalories
      );
      const completedWorkoutEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        workoutName: selectedWorkout.name,
        metrics: finalMetrics
      };
      const newHistory = [completedWorkoutEntry, ...workoutHistory.slice(0, 19)];
      setWorkoutHistory(newHistory);
      localStorage.setItem('bikeWorkoutHistory', JSON.stringify(newHistory));
      setUiMessage({ text: `Workout "${selectedWorkout.name}" completed! Detailed stats saved.`, type: 'success' });
    }
    setWorkoutActive(false);
    setWorkoutPaused(false);
  }, [selectedWorkout, workoutMetrics, powerHistory, hrHistory, cadenceHistory, settings.ftp, workoutHistory, setUiMessage, setWorkoutActive, setWorkoutPaused]);

  const startWorkoutHandler = useCallback(workoutToStart => {
    if (bluetoothStatus !== 'connected') {
      setUiMessage({ text: "Please connect to the bike first!", type: 'error' });
      return;
    }
    setSelectedWorkout(workoutToStart);
    setWorkoutActive(true);
    setWorkoutPaused(false);
    setWorkoutTime(0);
    setCurrentSegment(workoutToStart.segments[0] || null);
    if (workoutToStart.segments[0]) {
        handleLocalResistanceChange(workoutToStart.segments[0].resistance);
    }
    setWorkoutMetrics({ avgPower: 0, maxPower: 0, avgCadence: 0, maxCadence: 0, avgHr: 0, maxHr: 0, totalCalories: 0, duration: 0, powerDataPoints:0, cadenceDataPoints:0, hrDataPoints:0 });
    setPowerHistory([]);
    setHrHistory([]);
    setCadenceHistory([]);
    setActiveTab('control');
    setUiMessage({ text: `Workout "${workoutToStart.name}" started!`, type: 'info' });
  }, [bluetoothStatus, handleLocalResistanceChange, setUiMessage, setSelectedWorkout, setWorkoutActive, setWorkoutPaused, setWorkoutTime, setCurrentSegment, setWorkoutMetrics, setPowerHistory, setHrHistory, setCadenceHistory, setActiveTab]);

  const togglePauseWorkoutHandler = useCallback(() => {
    if (!selectedWorkout) return;
    if (workoutActive && !workoutPaused) {
      setWorkoutPaused(true);
      setWorkoutActive(false); 
      setUiMessage({ text: 'Workout paused.', type: 'info' });
    } else if (selectedWorkout && workoutPaused) {
      setWorkoutPaused(false);
      setWorkoutActive(true);
      setUiMessage({ text: 'Workout resumed.', type: 'info' });
    }
  }, [selectedWorkout, workoutActive, workoutPaused, setUiMessage, setWorkoutActive, setWorkoutPaused]);

  const handleAddCustomSegment = () => setCustomWorkout(p => ({ ...p, segments: [...p.segments, { type: 'interval', duration: 60, resistance: 30, cadence: '80-90' }] }));
  const handleRemoveCustomSegment = i => setCustomWorkout(p => ({ ...p, segments: p.segments.filter((_, idx) => idx !== i) }));
  const handleCustomSegmentChange = (i, field, val) => {
    setCustomWorkout(p => { const segs = [...p.segments]; segs[i] = { ...segs[i], [field]: (field === 'duration' || field === 'resistance' ? parseInt(val, 10) || 0 : val) }; return { ...p, segments: segs } });
  };
  const handleSaveCustomWorkoutToStorage = () => { const s = JSON.parse(localStorage.getItem('customWorkouts') || '[]'); const w = { ...customWorkout, id: `custom-${Date.now()}` }; localStorage.setItem('customWorkouts', JSON.stringify([...s, w])); setUiMessage({ text: 'Custom workout saved to browser storage!', type: 'success' }); };

  // --- useCallback definitions END ---


  // Update workout metrics using props from WorkoutPlayer
  useEffect(() => {
    let metricsInterval;
    const CALC_SEC = 2, J_PER_KCAL = 4184, EFF = 0.25;

    if (workoutActive && !workoutPaused && bluetoothStatus === 'connected') {
      metricsInterval = setInterval(() => {
        const now = Date.now();
        setPowerHistory(p => [...p.slice(-150), { time: now, value: bluetoothPower }]);
        setCadenceHistory(c => [...c.slice(-150), { time: now, value: bluetoothCadence }]);
        const currentHrForWorkout = externalHeartRate || bluetoothHeartRate || 0;
        if (currentHrForWorkout > 0) {
            setHrHistory(h => [...h.slice(-150), {time: now, value: currentHrForWorkout}])
        }

        const workoutKcalPerInterval = (bluetoothPower * CALC_SEC) / J_PER_KCAL / EFF;

          setWorkoutMetrics(prev => {
            const dur = prev.duration + CALC_SEC;
            const updateAvg = (avg, val, cnt) => cnt > 0 ? (avg * (cnt - 1) + val) / cnt : val;
            const pc = prev.powerDataPoints + (bluetoothPower > 0 ? 1 : 0);
            const cc = prev.cadenceDataPoints + (bluetoothCadence > 0 ? 1 : 0);
            const hc = prev.hrDataPoints + (currentHrForWorkout > 0 ? 1 : 0);

            return {
              avgPower: updateAvg(prev.avgPower, bluetoothPower, pc),
              maxPower: Math.max(prev.maxPower, bluetoothPower),
              avgCadence: updateAvg(prev.avgCadence, bluetoothCadence, cc),
              maxCadence: Math.max(prev.maxCadence, bluetoothCadence),
              avgHr: updateAvg(prev.avgHr, currentHrForWorkout, hc),
              maxHr: Math.max(prev.maxHr, currentHrForWorkout),
              duration: dur,
              totalCalories: prev.totalCalories + workoutKcalPerInterval,
              powerDataPoints: pc,
              cadenceDataPoints: cc,
              hrDataPoints: hc,
            };
          });
      }, 2000);
    }
    return () => clearInterval(metricsInterval);
  }, [bluetoothStatus, bluetoothPower, bluetoothCadence, bluetoothHeartRate, externalHeartRate, workoutActive, workoutPaused, settings.ftp]);

  // Workout timer and segment management
  useEffect(() => {
    if (workoutActive && !workoutPaused && selectedWorkout) {
      workoutTimerRef.current = setInterval(() => {
        setWorkoutTime(t => {
          const nt = t + 1;
          const totalDuration = selectedWorkout.segments.reduce((s, seg) => s + seg.duration, 0);
          if (nt >= totalDuration) {
            completeWorkout(); 
            return nt; 
          }

          let elapsedSegmentTime = 0;
          let segmentChanged = false;
          for (const seg of selectedWorkout.segments) {
            if (nt >= elapsedSegmentTime && nt < elapsedSegmentTime + seg.duration) {
              if (!currentSegment || currentSegment.type !== seg.type || currentSegment.duration !== seg.duration || currentSegment.resistance !== seg.resistance) {
                setCurrentSegment(seg); 
                segmentChanged = true;
              }
              break;
            }
            elapsedSegmentTime += seg.duration;
          }

          if (segmentChanged && currentSegment && bluetoothStatus === 'connected') {
            handleLocalResistanceChange(currentSegment.resistance); 
          }
          return nt; 
        });
      }, 1000);
    } else {
      clearInterval(workoutTimerRef.current); 
    }
    return () => clearInterval(workoutTimerRef.current); 
  }, [workoutActive, workoutPaused, selectedWorkout, bluetoothStatus, currentSegment, handleLocalResistanceChange, completeWorkout]);


  // Update externalHeartRate if dedicated HRM is used
  useEffect(() => { if (bluetoothHeartRate > 0 && !externalHeartRate) setExternalHeartRate(bluetoothHeartRate); }, [bluetoothHeartRate, externalHeartRate]);


  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const formatSegmentTime = (seg, currentTime) => {
    if (!seg || !selectedWorkout) return '--:--';
    let elapsedTimeInSegments = 0;
    for (const s of selectedWorkout.segments) {
      if (s === seg) {
        const timeIntoCurrentSegment = currentTime - elapsedTimeInSegments;
        return formatTime(Math.max(0, seg.duration - timeIntoCurrentSegment));
      }
      elapsedTimeInSegments += s.duration;
    }
    return formatTime(seg.duration);
  };
  const calculateWorkoutProgress = () => {
    if (!selectedWorkout || workoutTime === 0) return 0;
    const totalDuration = selectedWorkout.segments.reduce((sum, sg) => sum + sg.duration, 0);
    return totalDuration > 0 ? (workoutTime / totalDuration) * 100 : 0;
  };

  const getSegmentTypeColor = t => ({ warmup: '#8dd1e1', sprint: '#ff3b30', recovery: '#34c759', climb: '#af52de', flat: '#5ac8fa', effort: '#ff9500', ftp: '#ff2d55', interval: '#5856d6', cooldown: '#65c466' }[t?.toLowerCase()] || '#c7c7cc');

  if (!open) return null;

  return (
    <>
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

      {showConnectionModal && (
        <BluetoothConnectionOverlay
          open={showConnectionModal}
          onClose={() => setShowConnectionModal(false)}
          onScanBike={scanBluetoothDevice}
          onDisconnectBike={disconnectBluetoothDevice}
          bikeStatus={bluetoothStatus}
          bikeDeviceName={bluetoothDeviceName}
          onHrmConnected={deviceName => setUiMessage({ text: `HRM ${deviceName} connected.`, type: 'success' })}
          onError={msg => setUiMessage({ text: msg, type: 'error' })}
        />
      )}

      <div className="bike-overlay">
        <div className={`bike-modal ${activeTab === 'simulator' ? '' : 'expanded'}`}>
          <header>
            <FontAwesomeIcon icon={faBicycle} size="2x" />
            <h2>EquaRide {bluetoothDeviceName && `(${bluetoothDeviceName})`}</h2>
            <button className="close-btn" onClick={onClose}>
              <FontAwesomeIcon icon={faTimesCircle} />
            </button>
          </header>

          {uiMessage.text && (
            <div className={`message-bar ${uiMessage.type}`}>
              {uiMessage.text}
              <button className="close-message" onClick={() => setUiMessage({ text: '', type: '' })}>
                ×
              </button>
            </div>
          )}

          <div className="bike-status">
            {bluetoothStatus === 'disconnected' && <span className="status disconnected">Bike Disconnected</span>}
            {bluetoothStatus === 'scanning' && <span className="status scanning"><FontAwesomeIcon icon={faSyncAlt} spin /> Scanning Bike…</span>}
            {bluetoothStatus === 'connecting' && <span className="status connecting"><FontAwesomeIcon icon={faPlug} spin /> Connecting Bike…</span>}
            {bluetoothStatus === 'discovering' && <span className="status discovering">Discovering Bike Services…</span>}
            {bluetoothStatus === 'connected' && <span className="status connected"><FontAwesomeIcon icon={faCheckCircle} /> Bike Connected</span>}
            {bluetoothStatus === 'error' && <span className="status error"><FontAwesomeIcon icon={faTimesCircle} /> Bike Connection Problem</span>}

            <button
              className="connect-btn"
              onClick={() => setShowConnectionModal(true)}
              disabled={bluetoothStatus === 'scanning' || bluetoothStatus === 'connecting' || showConnectionModal}
            >
              <FontAwesomeIcon icon={faBluetooth} /> {bluetoothStatus === 'connected' ? 'Manage Connections' : 'Connect Devices'}
            </button>
          </div>

          <div className="tabs">
            {[
              { id: 'control', label: 'Control', icon: faSlidersH },
              { id: 'workouts', label: 'Workouts', icon: faDumbbell },
              { id: 'stats', label: 'Stats', icon: faChartLine },
              { id: 'settings', label: 'Settings', icon: faSlidersH },
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

          <div className="tab-content">
            {activeTab === 'control' && (
              <div className="control-tab">
                {!selectedWorkout || workoutPaused ? (
                  <div className="resistance-control">
                    <h3>Manual Resistance ({uiResistance}%)</h3>
                    <div className="resistance-slider-container">
                      <input type="range" min="0" max="100" value={uiResistance}
                        onChange={(e) => handleLocalResistanceChange(parseInt(e.target.value))}
                        className="resistance-slider" />
                      <div className="resistance-labels"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
                    </div>
                    <div className="resistance-buttons">
                      {[-10, -5, -1, +1, +5, +10].map(adj => (
                        <button key={adj} onClick={() => handleLocalResistanceChange(uiResistance + adj)}>
                          {adj > 0 ? `+${adj}` : adj}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="resistance-control"><h3>Workout Controlling Resistance ({currentSegment?.resistance || uiResistance}%)</h3></div>
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
                        <div className="segment-params">
                            <div>
                                <label>Type</label>
                                <select value={sg.type} onChange={(e) => handleCustomSegmentChange(i, 'type', e.target.value)}>
                                    {Object.keys(getSegmentTypeColor('')).map(type => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label>Duration (s)</label>
                                <input type="number" value={sg.duration} onChange={(e) => handleCustomSegmentChange(i, 'duration', e.target.value)} min="10" />
                            </div>
                             <div>
                                <label>Resistance %</label>
                                <input type="number" value={sg.resistance} onChange={(e) => handleCustomSegmentChange(i, 'resistance', e.target.value)} min="0" max="100" />
                            </div>
                            <div>
                                <label>Cadence (RPM)</label>
                                <input type="text" value={sg.cadence} onChange={(e) => handleCustomSegmentChange(i, 'cadence', e.target.value)} />
                            </div>
                        </div>
                        <div className="segment-actions">
                            <button onClick={() => handleRemoveCustomSegment(i)} disabled={customWorkout.segments.length <= 1}>Remove</button>
                        </div>
                      </div>
                    ))}
                     <div className="add-segment">
                        <button onClick={handleAddCustomSegment}>Add Segment</button>
                    </div>
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

           {activeTab === 'simulator' && (
                <div className="simulator-tab">
                    {/* Updated paragraph text */}
                    <p>Click the button below to launch the simulation. The simulation will replace the main video feed.</p>
                    <div className="sim-start">
                        <button
                            className="start-sim-btn"
                            onClick={() => {
                                onStartSimulation(); // Directly call onStartSimulation
                            }}
                            // The 'disabled' prop is removed to always enable the button
                        >
                            <FontAwesomeIcon icon={faGlobe} /> Launch Full Simulation
                        </button>
                    </div>
                    {achievements.length > 0 && <AchievementsOverlay achievements={achievements} />}
                </div>
            )}

            {activeTab === 'stats' && (
              <div className="stats-tab">
                 <div className="charts">
                    <div className="chart-container">
                        <h4>Power (W) - Last 2.5 mins</h4>
                        <div className="chart-placeholder simplified-chart">
                            {powerHistory.length > 0 ? powerHistory.map((p,i) => (
                                <div key={i} className="chart-bar power-line" style={{height: `${Math.min(100, (p.value / (settings.ftp * 1.5 || 300)) * 100)}%`}} title={`${p.value}W`}></div>
                            )) : <div className="no-data">No power data</div>}
                        </div>
                    </div>
                     <div className="chart-container">
                        <h4>Cadence (RPM) - Last 2.5 mins</h4>
                        <div className="chart-placeholder simplified-chart">
                             {cadenceHistory.length > 0 ? cadenceHistory.map((c,i) => (
                                <div key={i} className="chart-bar cadence-line" style={{height: `${Math.min(100, (c.value / 150) * 100)}%`}} title={`${c.value} RPM`}></div>
                            )) : <div className="no-data">No cadence data</div>}
                        </div>
                    </div>
                     <div className="chart-container">
                        <h4>Heart Rate (BPM) - Last 2.5 mins</h4>
                        <div className="chart-placeholder simplified-chart">
                             {hrHistory.length > 0 ? hrHistory.map((h,i) => (
                                <div key={i} className="chart-bar hr-line" style={{height: `${Math.min(100, (h.value / 200) * 100)}%`}} title={`${h.value} BPM`}></div>
                            )) : <div className="no-data">No heart rate data</div>}
                        </div>
                    </div>
                </div>
                <div className="workout-history">
                  <h3>Workout History (Last 20)</h3>
                  {workoutHistory.length > 0 ? (
                    <div className="history-list">
                      {workoutHistory.map(wh => (
                        <div className="history-item" key={wh.id}>
                          <div className="history-header">
                            <h4>{wh.workoutName || 'Unnamed Workout'}</h4>
                            <div className="history-date">{wh.date ? new Date(wh.date).toLocaleString() : 'No Date'}</div>
                          </div>
                          {wh.metrics ? (
                            <div className="history-metrics">
                              <div><span>Dur:</span> {formatTime(wh.metrics.duration)}</div>
                              {wh.metrics.avgPower > 0 && (<>
                                <div><span>Avg P:</span> {wh.metrics.avgPower}W</div>
                                <div><span>Max P:</span> {wh.metrics.maxPower}W</div>
                                <div><span>NP:</span> {wh.metrics.normalizedPower !== undefined ? `${wh.metrics.normalizedPower}W` : 'N/A'}</div>
                                <div><span>IF:</span> {wh.metrics.intensityFactor !== undefined ? wh.metrics.intensityFactor.toFixed(2) : 'N/A'}</div>
                                <div><span>TSS:</span> {wh.metrics.tss !== undefined ? wh.metrics.tss : 'N/A'}</div>
                              </>)}
                              {wh.metrics.avgHr > 0 && (<>
                                <div><span>Avg HR:</span> {wh.metrics.avgHr}bpm</div>
                                <div><span>Max HR:</span> {wh.metrics.maxHr}bpm</div>
                              </>)}
                              {wh.metrics.avgCadence > 0 && (<>
                                <div><span>Avg RPM:</span> {wh.metrics.avgCadence}</div>
                                <div><span>Max RPM:</span> {wh.metrics.maxCadence}</div>
                              </>)}
                              <div><span>Cal:</span> {wh.metrics.totalCalories !== undefined ? Math.round(wh.metrics.totalCalories) : 'N/A'}</div>
                              <button
                                onClick={() => {
                                  if (wh.metrics) {
                                    const csvData = exportWorkoutSummaryToCSV(wh);
                                    downloadFile(csvData, `workout_${(wh.workoutName || 'untitled').replace(/\s+/g, '_')}_${wh.date ? new Date(wh.date).toISOString().split('T')[0] : 'nodate'}.csv`);
                                  }
                                }} style={{ marginTop: '10px', fontSize: '12px', padding: '5px 8px', gridColumn: '1 / -1' }}
                              > Export CSV </button>
                            </div>
                          ) : ( <div className="history-metrics"><p>Metric data unavailable.</p></div>)}
                        </div>
                      ))}
                       <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to clear all workout history? This cannot be undone.')) {
                              setWorkoutHistory([]);
                              localStorage.removeItem('bikeWorkoutHistory');
                              setUiMessage({ text: 'Workout history cleared.', type: 'info' });
                            }
                          }}
                          className="clear-history"
                          disabled={workoutHistory.length === 0}
                        > Clear All History </button>
                    </div>
                  ) : ( <div className="no-history">No workout history yet.</div> )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="settings-tab">
                <h3>Settings</h3>
                <div className="settings-section">
                  <h4>Personal</h4>
                  <div className="setting-item"><label>FTP (watts)</label><input type="number" value={settings.ftp} onChange={(e) => setSettings(s => ({ ...s, ftp: parseInt(e.target.value) || 0 }))} min="50" max="600" /></div>
                  <div className="setting-item"><label>Weight ({settings.metricUnits ? 'kg' : 'lbs'})</label><input type="number" value={settings.weight} onChange={(e) => setSettings(s => ({ ...s, weight: parseFloat(e.target.value) || 0 }))} min="30" step="0.1" /></div>
                  <div className="setting-item checkbox"><label><input type="checkbox" checked={settings.metricUnits} onChange={(e) => setSettings(s => ({ ...s, metricUnits: e.target.checked }))} /> Use Metric Units</label></div>
                </div>
                <div className="settings-section">
                  <h4>Heart Rate Zones (Threshold to enter zone)</h4>
                  {settings.hrZones.slice(1).map((zoneThreshold, index) => (
                    <div className="setting-item" key={index}><label>Zone {index + 1} starts at (BPM)</label><input type="number" value={zoneThreshold} onChange={(e) => { const newZ = [...settings.hrZones]; newZ[index + 1] = parseInt(e.target.value) || 0; setSettings(s => ({ ...s, hrZones: newZ })); }} min={(settings.hrZones[index] || 0) + 1} max="220" /></div>
                  ))}
                   <button onClick={() => setHrOverlayOpen(true)} style={{marginTop: '10px'}}>Connect Dedicated HR Monitor</button>
                </div>
                <div className="settings-section">
                  <h4>Connection & Device</h4>
                  <div className="setting-item">
                    <label>Resistance Offset (+/- %)</label>
                    <input type="number" value={settings.resistanceOffset} onChange={(e) => setSettings(s => ({ ...s, resistanceOffset: parseInt(e.target.value) || 0 }))} min="-20" max="20" />
                    <span className="setting-help">Fine-tune bike's resistance feel. Applied to manual and workout controls.</span>
                  </div>
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