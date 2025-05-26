// File: src/components/AchievementsOverlay.jsx
import React from 'react';
import '../css/AchievementsOverlay.css';
export default function AchievementsOverlay({ achievements }) {
  return (
    <div className="achievements-overlay">
      <div className="achievements-modal">
        <h3>Achievements</h3>
        <ul>
          {achievements.map(a => (
            <li key={a.id} className="achievement-item">
              <img src={a.icon} alt={a.name} />
              <span>{a.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
