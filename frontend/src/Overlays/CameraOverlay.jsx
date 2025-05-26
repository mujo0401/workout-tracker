import React, { useState } from 'react';
import '../css/CameraOverlay.css';

export default function CameraOverlay({ open, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [nightVision, setNightVision] = useState(false);

  if (!open) return null;

  const moveStep = 10;
  const handleMove = dir => {
    if (dir === 'up')    setPanY(y => y - moveStep);
    if (dir === 'down')  setPanY(y => y + moveStep);
    if (dir === 'left')  setPanX(x => x - moveStep);
    if (dir === 'right') setPanX(x => x + moveStep);
  };

  return (
    <div className="camera-overlay">
      <div className="camera-overlay-header">
        <h2>Camera Controls</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="camera-controls">
        <div className="control-group">
          <label>Zoom:</label>
          <input
            type="range"
            min="1" max="5" step="0.1"
            value={zoom}
            onChange={e => setZoom(e.target.value)}
          />
          <span>{zoom}×</span>
        </div>
        <div className="control-group movement-controls">
          <label>Pan:</label>
          <div className="movement-buttons">
            <button onClick={() => handleMove('up')}>↑</button>
            <button onClick={() => handleMove('left')}>←</button>
            <button onClick={() => handleMove('right')}>→</button>
            <button onClick={() => handleMove('down')}>↓</button>
          </div>
        </div>
        <div className="control-group">
          <label>Night Vision:</label>
          <button
            className={nightVision ? 'toggle-btn active' : 'toggle-btn'}
            onClick={() => setNightVision(nv => !nv)}
          >
            {nightVision ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    </div>
);
}
