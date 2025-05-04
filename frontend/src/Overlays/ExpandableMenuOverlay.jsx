// src/components/ExpandableMenuOverlay.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTree,
  faCamera,      
  faObjectGroup,
  faRunning,
  faUser,
  faCheckCircle,
  faHeartPulse,
  faMusic,
  faMicrophone,
  faBars
} from '@fortawesome/free-solid-svg-icons';
import '../css/ExpandableMenuOverlay.css';

export default function ExpandableMenuOverlay({
  onSelect,
  detectionActive = false,
  poseActive = false,
  heartRateActive = false,
  healthActive = false,
  cameraActive    = false,
  sceneryActive   = false,
}) {
  const [open, setOpen] = useState(false);

  const statusMap = {
    detection: detectionActive,
    pose: poseActive,
    heartrate: heartRateActive,
    health: healthActive,
    camera:    cameraActive,
    scenery:   sceneryActive
  };

  const items = [
    { key: 'detection', label: 'Object Detection', icon: faObjectGroup },
    { key: 'pose',      icon: faUser,         label: 'Pose Detection',   active: poseActive },
    { key: 'plan',      label: 'Exercise Plan', icon: faRunning },
    { key: 'heartrate', label: 'HR Monitor', icon: faHeartPulse },
    { key: 'health',    label: 'Camera Health', icon: faCheckCircle },
    { key: 'camera',    icon: faCamera,       label: 'Camera Controls'          }, 
    { key: 'scenery',   icon: faTree,         label: 'Scenery'         },
    { key: 'music',     label: 'Music Player', icon: faMusic },
    { key: 'voice',     label: 'Exercise Coach', icon: faMicrophone }
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
                ]
                  .filter(Boolean)
                  .join(' ')}
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
