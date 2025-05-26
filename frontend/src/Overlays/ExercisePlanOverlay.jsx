// src/Overlays/ExercisePlanOverlay.jsx
import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faDumbbell,
  faRunning,
  faCircle,
  faBell,
  faCheckCircle,
  faRedoAlt
} from "@fortawesome/free-solid-svg-icons";
import "../css/ExercisePlanOverlay.css";

// Predefined segments
const warmupExercises = [
  { name: "Jumping Jacks", icon: faRunning },
  { name: "High Knees", icon: faRunning },
  { name: "Arm Circles", icon: faCircle }
];
const cooldownExercises = [
  { name: "Child's Pose", icon: faCircle },
  { name: "Hamstring Stretch", icon: faCircle },
  { name: "Shoulder Stretch", icon: faCircle }
];
const exerciseDatabase = [
  { name: "Push-ups", icon: faDumbbell, area: "Upper Body" },
  { name: "Squats", icon: faDumbbell, area: "Lower Body" },
  { name: "Lunges", icon: faDumbbell, area: "Lower Body" },
  { name: "Plank", icon: faCircle, area: "Core" },
  { name: "Sit-ups", icon: faCircle, area: "Core" },
  { name: "Burpees", icon: faRunning, area: "Full Body" },
  { name: "Mountain Climbers", icon: faRunning, area: "Full Body" },
  { name: "Jump Rope", icon: faBell, area: "Cardio" }
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function ExercisePlanOverlay({ open = false, onClose = () => {} }) {
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [focusAreas, setFocusAreas] = useState(["Full Body"]);
  const [duration, setDuration] = useState(30);

  const todayKey = new Date().toISOString().slice(0, 10);
  const storageKey = `exercisePlan-${todayKey}`;

  // Load saved or create initial plan
  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.plan && parsed.settings) {
          setPlan(parsed.plan);
          setDifficulty(parsed.settings.difficulty || difficulty);
          setFocusAreas(parsed.settings.focusAreas || focusAreas);
          setDuration(parsed.settings.duration || duration);
        } else if (Array.isArray(parsed)) {
          setPlan(parsed);
        } else {
          handleGenerate();
        }
      } catch (e) {
        console.warn("Failed to parse saved plan, regenerating.", e);
        handleGenerate();
      }
    } else {
      handleGenerate();
    }
  }, [storageKey]);

  // Fallback local plan generator
  const generatePlanLocal = () => {
    const segments = [];
    segments.push({
      segmentName: "Warm-up",
      exercises: warmupExercises.map(ex => ({
        ...ex,
        sets: 1,
        reps: null,
        duration: 30,
        completed: false
      }))
    });

    const mainCount = difficulty === "Beginner" ? 4 : difficulty === "Intermediate" ? 5 : 6;
    const pool = exerciseDatabase.filter(e =>
      focusAreas.includes("Full Body") || focusAreas.includes(e.area)
    );
    const mainExercises = [];
    for (let i = 0; i < mainCount && pool.length; i++) {
      const idx = randomInt(0, pool.length - 1);
      const ex = pool.splice(idx, 1)[0];
      const sets = difficulty === "Beginner" ? 2 : difficulty === "Intermediate" ? 3 : 4;
      const reps = difficulty === "Beginner" ? randomInt(8, 12)
        : difficulty === "Intermediate" ? randomInt(12, 15)
        : randomInt(15, 20);
      mainExercises.push({
        ...ex,
        sets,
        reps,
        duration: null,
        completed: false
      });
    }
    segments.push({ segmentName: "Main Set", exercises: mainExercises });

    segments.push({
      segmentName: "Cool-down",
      exercises: cooldownExercises.map(ex => ({
        ...ex,
        sets: 1,
        reps: null,
        duration: 30,
        completed: false
      }))
    });
    return segments;
  };

  // AI endpoint request (with fallback)
  const generatePlan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workout/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty, focusAreas, duration })
      });
      if (!res.ok) throw new Error("Network response was not ok");
      const json = await res.json();
      return json.plan;
    } catch (err) {
      console.warn("AI plan generation failed, using fallback.", err);
      return generatePlanLocal();
    } finally {
      setLoading(false);
    }
  };

  const savePlan = (newPlan) => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        plan: newPlan,
        settings: { difficulty, focusAreas, duration }
      })
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    const newPlan = await generatePlan();
    setPlan(newPlan);
    savePlan(newPlan);
    setLoading(false);
  };

  const toggleComplete = (segName, idx) => {
    const updated = plan.map(seg => {
      if (seg.segmentName !== segName) return seg;
      const exs = seg.exercises.map((ex, i) =>
        i === idx ? { ...ex, completed: !ex.completed } : ex
      );
      return { ...seg, exercises: exs };
    });
    setPlan(updated);
    savePlan(updated);
  };

  if (!open) return null;

  const displayPlan = Array.isArray(plan) ? plan : [];

  return (
    <div className="plan-overlay-container" onClick={onClose}>
      <div className="plan-panel" onClick={e => e.stopPropagation()}>
        <div className="plan-header">
          <h4>Exercise Plan</h4>
          <button className="plan-close-btn" onClick={onClose} title="Close">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="plan-settings">
          <label>
            Difficulty:
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </label>
          <label>
            Focus Areas:
            <div className="checkbox-group">
              {['Full Body','Upper Body','Lower Body','Core','Cardio'].map(area => (
                <label key={area}>
                  <input
                    type="checkbox"
                    checked={focusAreas.includes(area)}
                    onChange={() => setFocusAreas(prev =>
                      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
                    )}
                  /> {area}
                </label>
              ))}
            </div>
          </label>
          <label>
            Duration: {duration} min
            <input
              type="range"
              min="15"
              max="60"
              step="5"
              value={duration}
              onChange={e => setDuration(+e.target.value)}
            />
          </label>
          <button className="generate-btn" onClick={handleGenerate}>
            <FontAwesomeIcon icon={faRedoAlt} /> Regenerate
          </button>
        </div>

        {loading ? (
          <div className="loader" />
        ) : (
          <div className="plan-body">
            {displayPlan.map(seg => {
              const exercises = Array.isArray(seg.exercises) ? seg.exercises : [];
              return (
                <div className="plan-segment" key={seg.segmentName}>
                  <h5 className="segment-title">{seg.segmentName}</h5>
                  <ul className="plan-exercise-list">
                    {exercises.map((ex, i) => (
                      <li
                        key={i}
                        className={`plan-exercise-item ${ex.completed ? 'completed' : ''}`}
                        onClick={() => toggleComplete(seg.segmentName, i)}
                      >
                        <FontAwesomeIcon icon={ex.icon || faDumbbell} className="exercise-icon" />
                        <div className="exercise-info">
                          <span className="exercise-name">{ex.name}</span>
                          <span className="exercise-detail">
                            {ex.sets}×{ex.reps != null ? `${ex.reps} reps` : `${ex.duration} sec`}
                          </span>
                        </div>
                        <FontAwesomeIcon
                          icon={ex.completed ? faCheckCircle : faCircle}
                          className="complete-icon"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
