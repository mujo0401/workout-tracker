// src/Overlays/ExerciseZoneOverlay.jsx
import React, { useEffect, useRef, useState } from 'react';
import '../css/ExerciseZoneOverlay.css';

// Make sure OpenCV.js (<script src="opencv.js"></script>) is loaded in index.html

export default function ExerciseZoneOverlay({
  videoRef,                   // optional: React ref to your <video>
  zone = { x: 0.28, y: 0.60, width: 0.40, height: 0.40 },
  circumference = 2.1,        // flywheel circumference (m)
  met = 9,                    // MET for indoor cycling
  weight = 70,                // user weight (kg)
  markerHSV = {               // HSV range to pick out your marker tape
    low:  [  0, 100, 100 ],
    high: [ 20, 255, 255 ]
  },
  onStatsUpdate               // optional callback(stats)
}) {
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState({
    rpm: 0, distance: 0, speed: 0, calories: 0, time: 0
  });

  const centerRef    = useRef(null);
  const prevAngleRef = useRef(null);
  const rotationsRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  // Helper: get the video element
  const getVideoEl = () => {
    if (videoRef?.current) return videoRef.current;
    const el = document.querySelector('video');
    if (!el) console.warn('ExerciseZoneOverlay: no <video> found in DOM');
    return el;
  };

  // 1) Find flywheel center once via HoughCircles
  useEffect(() => {
    const v = getVideoEl();
    if (!v || ready) return;

    const vw = v.videoWidth, vh = v.videoHeight;
    const cap    = new cv.VideoCapture(v);
    const src    = new cv.Mat(vh, vw, cv.CV_8UC4);
    const gray   = new cv.Mat();
    cap.read(src);
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.medianBlur(gray, gray, 5);

    const circles = new cv.Mat();
    cv.HoughCircles(
      gray, circles, cv.HOUGH_GRADIENT,
      1, gray.rows/8, 100, 30, 0, 0
    );
    if (circles.cols > 0) {
      centerRef.current = {
        x: circles.data32F[0],
        y: circles.data32F[1]
      };
      setReady(true);
    }

    src.delete(); gray.delete(); circles.delete();
  }, [ready]);

  // 2) Main loop: threshold marker → count rotations → compute stats
  useEffect(() => {
    if (!ready) return;
    let raf;

    const loop = () => {
      const v = getVideoEl();
      if (!v) return;

      const vw = v.videoWidth, vh = v.videoHeight;
      const cap    = new cv.VideoCapture(v);
      const frame  = new cv.Mat(vh, vw, cv.CV_8UC4);
      cap.read(frame);

      // convert & threshold in HSV
      const hsv  = new cv.Mat();
      cv.cvtColor(frame, hsv, cv.COLOR_RGBA2HSV);
      const mask = new cv.Mat();
      const low  = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), markerHSV.low);
      const high = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), markerHSV.high);
      cv.inRange(hsv, low, high, mask);

      // find largest contour
      const contours  = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(mask, contours, hierarchy,
                      cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      let best = { area: 0, cx: null, cy: null };
      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        if (area > best.area) {
          const M = cv.moments(cnt);
          best = { area, cx: M.m10 / M.m00, cy: M.m01 / M.m00 };
        }
      }

      // if we have a marker & center, compute angle & rotations
      if (best.cx != null && centerRef.current) {
        let ang = Math.atan2(
          best.cy - centerRef.current.y,
          best.cx - centerRef.current.x
        ) * (180/Math.PI);
        if (ang < 0) ang += 360;

        const prev = prevAngleRef.current;
        if (prev != null && ang < 30 && prev > 330) {
          rotationsRef.current++;
        }
        prevAngleRef.current = ang;

        // compute stats
        const elapsed = (Date.now() - startTimeRef.current) / 1000; // s
        const R       = rotationsRef.current;
        const rpm     = (R / elapsed) * 60;
        const distance= (R * circumference) / 1000;                  // km
        const speed   = (rpm * circumference) / 1000 * 60;           // km/h
        const calories= ((met * weight * 3.5) / 200) * (elapsed/60);

        const s = { rpm, distance, speed, calories, time: elapsed };
        setStats(s);
        onStatsUpdate?.(s);
      }

      // cleanup
      frame.delete(); hsv.delete(); mask.delete();
      low.delete(); high.delete();
      contours.delete(); hierarchy.delete();

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, circumference, met, weight, markerHSV.low, markerHSV.high, onStatsUpdate]);

  const fmtTime = t => {
    const m = String(Math.floor(t/60)).padStart(2,'0');
    const s = String(Math.floor(t%60)).padStart(2,'0');
    return `${m}:${s}`;
  };

  return (
    <div className="stats-overlay">
      <div>Time:     {fmtTime(stats.time)}</div>
      <div>RPM:      {stats.rpm.toFixed(1)}</div>
      <div>Speed:    {stats.speed.toFixed(1)} km/h</div>
      <div>Distance: {stats.distance.toFixed(2)} km</div>
      <div>Calories: {stats.calories.toFixed(0)}</div>
    </div>
  );
}
