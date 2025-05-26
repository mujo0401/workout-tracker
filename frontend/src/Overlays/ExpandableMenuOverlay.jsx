// src/components/ExpandableMenuOverlay.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTree,
  faCamera,      
  faThumbsUp,
  faObjectGroup,
  faRunning,
  faUser,
  faHeartPulse,
  faMusic,
  faMicrophone,
  faChartBar, 
  faBars,
  faBicycle,
} from '@fortawesome/free-solid-svg-icons';
import '../css/ExpandableMenuOverlay.css';

export default function ExpandableMenuOverlay({
  onSelect,
  detectionActive = false,
  //poseActive = false,
  //heartRateActive = false,
  healthActive = false,
  cameraActive = false,
  sceneryActive = false,
  statisticsActive = false,
  musicActive = false,
  bikeActive = false, 
}) {
  const [open, setOpen] = useState(false);

  const statusMap = {
    detection:  detectionActive,
    //pose:       poseActive,
   // heartrate:  heartRateActive,
    health:     healthActive,
    camera:     cameraActive,
    scenery:    sceneryActive,
    statistics: statisticsActive,
    music:      musicActive,
    bike: bikeActive   
  };

  const items = [
    { key: 'detection', label: 'Object Detection', icon: faObjectGroup },
    { key: 'health',    label: 'Camera Health',  icon: faThumbsUp },
    { key: 'bike', label: 'Bike Connect', icon: faBicycle },
    { key: 'voice',     label: 'Exercise Coach', icon: faMicrophone }, 
    { key: 'music',     label: 'Music Player',   icon: faMusic },
    { key: 'statistics',label: 'Statistics',     icon: faChartBar },
  ];

  return (
    <div className="expandable-menu">
      <button
        className="menu-toggle"
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        <FontAwesomeIcon icon={faBars} size="lg" />
      </button>

      {open && (
        <div className="menu-options">
          {items.map(item => {
            const isActive = !!statusMap[item.key];
            return (
              <button
                key={item.key}
                className={[
                  'overlay-menu-item',
                  item.key,
                  isActive && 'active'
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  setOpen(false);
                  onSelect?.(item.key);
                }}
              >
                <span className="menu-item-icon">
                  <FontAwesomeIcon icon={item.icon} size="lg" />
                </span>
                <span className="menu-item-text">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
