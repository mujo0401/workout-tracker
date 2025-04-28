// src/Overlays/ExercisePlanOverlay.jsx
import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faTimes } from "@fortawesome/free-solid-svg-icons";
import "../css/ExercisePlanOverlay.css";

export default function ExercisePlanOverlay() {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState([]);

  const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const storageKey = `exercisePlan-${todayKey}`;

  const generatePlan = () => {
    const exercises = [
      "Push-ups",
      "Squats",
      "Lunges",
      "Plank",
      "Sit-ups",
      "Burpees",
      "Jumping Jacks",
      "Mountain Climbers",
    ];
    const avail = [...exercises];
    const result = [];
    for (let i = 0; i < 5 && avail.length; i++) {
      const idx = Math.floor(Math.random() * avail.length);
      const name = avail.splice(idx, 1)[0];
      const reps = Math.floor(Math.random() * 16) + 5; // 5–20 reps
      result.push({ name, reps });
    }
    return result;
  };

  const loadOrCreate = () => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setPlan(JSON.parse(saved));
    } else {
      const newPlan = generatePlan();
      setPlan(newPlan);
      localStorage.setItem(storageKey, JSON.stringify(newPlan));
    }
  };

  const regenerate = () => {
    const newPlan = generatePlan();
    setPlan(newPlan);
    localStorage.setItem(storageKey, JSON.stringify(newPlan));
  };

  useEffect(() => {
    loadOrCreate();
  }, []);

  return (
    <div className="plan-overlay-container">
      <button
        className="overlay-button plan-button"
        onClick={() => setOpen((o) => !o)}
        title="Exercise Plan"
      >
        <FontAwesomeIcon icon={faClipboardList} />
      </button>

      {open && (
        <div className="plan-panel">
          <div className="plan-header">
            <h4>Today's Plan</h4>
            <button
              className="plan-close-btn"
              onClick={() => setOpen(false)}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <ul className="plan-exercise-list">
            {plan.map((ex, i) => (
              <li key={i} className="plan-exercise-item">
                {ex.name}: {ex.reps} reps
              </li>
            ))}
          </ul>

          <button className="regenerate-btn" onClick={regenerate}>
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
