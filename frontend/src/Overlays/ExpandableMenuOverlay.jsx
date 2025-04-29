// src/components/ExpandableMenuOverlay.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faObjectGroup,
  faRunning,
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
  heartRateActive = false,
  healthActive = false
}) {
  const [open, setOpen] = useState(false);

  const statusMap = {
    detection: detectionActive,
    heartrate: heartRateActive,
    health: healthActive,
  };

  const items = [
    { key: 'detection', label: 'Detection', icon: faObjectGroup },
    { key: 'plan',      label: 'Exercise Plan', icon: faRunning },
    { key: 'heartrate', label: 'Heart Rate', icon: faHeartPulse },
    { key: 'health',    label: 'Health', icon: faCheckCircle },
    { key: 'music',     label: 'Music', icon: faMusic },
    { key: 'voice',     label: 'Voice Assist', icon: faMicrophone }
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
