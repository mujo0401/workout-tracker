// src/Overlays/HeartRateZoneOverlay.jsx
import React, { useEffect } from 'react';
import '../css/HeartRateZoneOverlay.css'; // Assuming path is correct

// Keep Zone definitions as before
const ZONES = [
  { name: 'Warm‑up',      color: '#4caf50' }, // Zone 1 (e.g., < 60% Max HR)
  { name: 'Fat Burn',     color: '#ffeb3b' }, // Zone 2 (e.g., 60-70%)
  { name: 'Cardio',       color: '#ff9800' }, // Zone 3 (e.g., 70-80%)
  { name: 'High Intensity',color: '#f44336' }, // Zone 4 (e.g., 80-90%)
  { name: 'Peak',         color: '#9c27b0' }, // Zone 5 (e.g., > 90%)
];

// Example: Define HR thresholds for zones (adjust based on user's max HR if available)
// These are just examples, you might want to calculate these dynamically.
const ZONE_THRESHOLDS = [100, 120, 140, 160]; // Upper limit for zones 0, 1, 2, 3

export default function HeartRateZoneOverlay({ bpm, hrStatus, hrError }) {
  useEffect(() => {
    console.log('HeartRateZoneOverlay received bpm:', bpm, 'type:', typeof bpm, 'hrStatus:', hrStatus);
  }, [bpm, hrStatus]);

  // Determine active zone index (0–4) based on BPM
  let zoneIndex = -1;
  if (bpm != null && hrStatus === 'connected') {
     if (bpm < ZONE_THRESHOLDS[0])       zoneIndex = 0;
     else if (bpm < ZONE_THRESHOLDS[1])  zoneIndex = 1;
     else if (bpm < ZONE_THRESHOLDS[2])  zoneIndex = 2;
     else if (bpm < ZONE_THRESHOLDS[3])  zoneIndex = 3;
     else                                zoneIndex = 4; // bpm >= ZONE_THRESHOLDS[3]
  }

  // Build the gradient string
  const stops = ZONES.map((z, i) => {
    const start = (i * 100) / ZONES.length;
    const end   = ((i + 1) * 100) / ZONES.length;
    // Zone is active color if index matches AND we are connected with valid BPM
    // Otherwise, use a neutral/inactive color
    const col   = (i === zoneIndex && bpm != null && hrStatus === 'connected') ? z.color : '#444'; // Grey if inactive/no data
    return `${col} ${start}% ${end}%`;
  }).join(', ');
  const background = `linear-gradient(to right, ${stops})`;

  // Determine the text content based on status and BPM
  let statusText = '';
  let showBpm = false;

  if (hrStatus === 'error') {
    statusText = hrError || 'HR Error'; // Show specific error or generic one
  } else if (hrStatus === 'scanning') {
    statusText = 'Scanning...';
  } else if (hrStatus === 'connecting') {
    statusText = 'Connecting HR...';
  } else if (hrStatus === 'connected') {
    if (bpm != null) {
      showBpm = true; // We have a value to show
    } else {
      // Connected, but haven't received first BPM value yet
      statusText = 'Waiting for Data...';
    }
  } else { // hrStatus === 'disconnected' or other unknown states
    statusText = 'No HR Monitor';
  }

  // Determine the CSS class for the overlay based on HR status
  const overlayClass = `hr-zone-arc ${hrStatus}`; // e.g., 'hr-zone-arc connected', 'hr-zone-arc error'

  return (
    <div
      className={overlayClass}
      style={{ background }} // Apply the dynamic background
    >
      <div className="hr-zone-text">
        {showBpm ? (
          <>
            <span className="hr-value">{bpm}</span>
            <span className="hr-bpm">BPM</span>
            {/* Optionally display zone name */}
            {zoneIndex !== -1 && <span className="hr-zone-name">{ZONES[zoneIndex].name}</span>}
          </>
        ) : (
          // Display the determined status text if not showing BPM
          <span className="hr-status">{statusText}</span>
        )}
      </div>
    </div>
  );
}