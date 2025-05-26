// src/Overlays/StatisticsOverlay.jsx
import React, { useEffect, useState } from 'react';
import '../css/StatisticsOverlay.css';

export default function StatisticsOverlay({ open, onClose, counts }) {
  const [daily,   setDaily]   = useState({ pushups: 0, situps: 0 });
  const [monthly, setMonthly] = useState({ pushups: 0, situps: 0 });
  const [plan,    setPlan]    = useState([]);

  useEffect(() => {
    if (!open) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    // 1) Load today's plan
    try {
      const rawPlan = localStorage.getItem(`exercisePlan-${todayStr}`);
      const parsed  = JSON.parse(rawPlan);
      setPlan(parsed.plan || parsed);
    } catch {
      setPlan([]);
    }
    // 2) Record today's counts in history
    const histKey = 'statisticsHistory';
    const rawHist = localStorage.getItem(histKey);
    const history = rawHist ? JSON.parse(rawHist) : {};
    history[todayStr] = counts;
    localStorage.setItem(histKey, JSON.stringify(history));
    setDaily(counts);
    // 3) Compute monthly totals
    const monthPrefix = todayStr.slice(0, 7);
    const agg = { pushups: 0, situps: 0 };
    Object.entries(history).forEach(([date, ct]) => {
      if (date.startsWith(monthPrefix)) {
        agg.pushups += ct.pushups || 0;
        agg.situps  += ct.situps  || 0;
      }
    });
    setMonthly(agg);
  }, [open, counts]);

  if (!open) return null;
  const todayLabel = new Date().toLocaleDateString();
  const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="statistics-overlay-container" onClick={onClose}>
      <div className="statistics-panel" onClick={e => e.stopPropagation()}>
        <div className="statistics-header">
          <h4>Statistics</h4>
          <button className="statistics-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="statistics-body">
          <section>
            <h5>Today's Stats ({todayLabel})</h5>
            <ul>
              <li>Push-ups: {daily.pushups}</li>
              <li>Sit-ups:   {daily.situps}</li>
            </ul>
          </section>
          <section>
            <h5>This Month ({monthLabel})</h5>
            <ul>
              <li>Push-ups: {monthly.pushups}</li>
              <li>Sit-ups:   {monthly.situps}</li>
            </ul>
          </section>
          {plan.length > 0 && (
            <section>
              <h5>Plan Progress</h5>
              <ul>
                {plan
                  .flatMap(seg => seg.exercises)
                  .map(ex => (
                    <li key={ex.name}>
                      {ex.name}: {daily[ex.name.toLowerCase().includes('push') ? 'pushups' : 'situps']} /
                      {ex.reps ?? ex.duration}
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
