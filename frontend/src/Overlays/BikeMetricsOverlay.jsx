import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTachometerAlt, faSlidersH, faRunning, faHeartbeat, faFire } from '@fortawesome/free-solid-svg-icons';
import '../css/BikeMetricsOverlay.css';

export default function BikeMetricsOverlay({
  power,
  setPercentage,
  rpm,
  bpm,
  calories,
  isVisible
}) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="bike-metrics-overlay">
      <div className="metric-item">
        <FontAwesomeIcon icon={faTachometerAlt} />
        <span>{power} W</span>
      </div>
      <div className="metric-item">
        <FontAwesomeIcon icon={faSlidersH} />
        <span>{setPercentage}%</span>
      </div>
      <div className="metric-item">
        <FontAwesomeIcon icon={faRunning} />
        <span>{rpm} RPM</span>
      </div>
      <div className="metric-item">
        <FontAwesomeIcon icon={faHeartbeat} />
        <span>{bpm} BPM</span>
      </div>
      <div className="metric-item">
        <FontAwesomeIcon icon={faFire} />
        <span>{Math.round(calories)} Cal</span>
      </div>
    </div>
  );
}