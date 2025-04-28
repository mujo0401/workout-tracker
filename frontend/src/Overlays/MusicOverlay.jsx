// src/Overlays/MusicOverlay.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMusic } from '@fortawesome/free-solid-svg-icons';
import '../css/MusicOverlay.css';

const MusicOverlay = ({ onClick }) => (
  <div className="music-overlay">
    <button className="music-btn" onClick={onClick}>
      <FontAwesomeIcon icon={faMusic} />
    </button>
  </div>
);

export default MusicOverlay;
