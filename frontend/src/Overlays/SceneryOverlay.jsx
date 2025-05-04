// src/Overlays/SceneryOverlay.jsx
import React, { useState } from 'react';
import '../css/SceneryOverlay.css';

const scenes = [
  { key: 'alpine',     label: 'Alpine Summit'    },
  { key: 'rainforest', label: 'Rainforest Trail' },
  { key: 'desert',     label: 'Desert Mirage'    },
];

export default function SceneryOverlay({ open, onClose, onSceneChange }) {
  const [selectedScene, setSelectedScene] = useState(scenes[0].key);
  const [intensity, setIntensity]     = useState(50);

  const handleSceneSelect = key => setSelectedScene(key);

  const handleActivate = () => {
    onSceneChange(selectedScene, intensity); 
    onClose();                  
  };

  if (!open) return null;

  return (
    <div className="scenery-overlay">
      <div className="scenery-panel">
        <button className="scenery-close" onClick={onClose}>&times;</button>
        <h2>Select Scene</h2>

        <ul className="scenery-list">
          {scenes.map(s => (
            <li key={s.key}>
              <button
                className={`scenery-item${selectedScene===s.key ? ' active' : ''}`}
                onClick={() => handleSceneSelect(s.key)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="scenery-config">
          <label htmlFor="intensity">Effect Intensity: {intensity}%</label>
          <input
            id="intensity"
            type="range"
            min="0" max="100"
            value={intensity}
            onChange={e => setIntensity(+e.target.value)}
          />
        </div>

        {/* NEW: Activate button */}
        <button className="scenery-activate" onClick={handleActivate}>
          Activate Scene
        </button>
      </div>
    </div>
  );
}
