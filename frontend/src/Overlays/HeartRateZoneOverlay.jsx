// src/Overlays/heartrateZoneOverlay.jsx
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import '../css/HeartRateZoneOverlay.css';

export default function HeartRateZoneOverlay({
  detection,    // (unused for now – could position relative to person)
  heartRate,
  onEnter,
  onLeave
}) {
  const prevZoneRef = useRef(null);

  // define your zones
  const zones = [
    { name: 'Rest',     min: 0,   max: 60,  color: '#88dbe6' },
    { name: 'Warm-up',  min: 60,  max: 100, color: '#6ee7b7' },
    { name: 'Fat Burn', min: 100, max: 140, color: '#fbbf24' },
    { name: 'Cardio',   min: 140, max: 170, color: '#f97316' },
    { name: 'Peak',     min: 170, max: Infinity, color: '#ef4444' },
  ];

  const getCurrentZone = bpm =>
    zones.find(z => bpm >= z.min && bpm < z.max) || zones[0];

  const currentZone = (heartRate != null && heartRate > 0)
    ? getCurrentZone(heartRate)
    : null;

  // fire onEnter/onLeave when moving out of or into Rest zone
  useEffect(() => {
    if (!currentZone) return;
    const prev = prevZoneRef.current;
    if (prev) {
      if (prev.name === 'Rest' && currentZone.name !== 'Rest') {
        onEnter?.();
      } else if (prev.name !== 'Rest' && currentZone.name === 'Rest') {
        onLeave?.();
      }
    }
    prevZoneRef.current = currentZone;
  }, [currentZone, onEnter, onLeave]);

  if (!currentZone) return null;

  // compute pulse speed so one cycle ≈ one heartbeat
  const animationDuration = `${(60 / heartRate).toFixed(2)}s`;

  return (
    <div className="heartrate-zone-overlay">
      <svg width="80" height="80">
        <circle
          className="heartrate-zone-ring"
          cx="40" cy="40" r="36"
          stroke={currentZone.color}
          strokeWidth="4"
          fill="none"
          style={{ animationDuration }}
        />
      </svg>
      <div className="heartrate-zone-text">
        <div>{heartRate}</div>
        <div className="heartrate-zone-zone-label">{currentZone.name}</div>
      </div>
    </div>
  );
}

HeartRateZoneOverlay.propTypes = {
  detection:   PropTypes.object,
  heartRate:   PropTypes.number,
  targetWidth: PropTypes.number,
  targetHeight: PropTypes.number,
  onEnter:     PropTypes.func,
  onLeave:     PropTypes.func,
};
