// src/Overlays/PoseOverlay.jsx
import React, { useEffect, useRef } from 'react';
import { SKELETON_CONNECTIONS, IDEAL_POSES } from '../services/PoseService';
import '../css/PoseOverlay.css';

// ⚠️ This overlay depends on the correct keypoint mapping in your service file.
//    If you’re using MediaPipe BlazePose (33 points), update SKELETON_CONNECTIONS in PoseService.js accordingly.

function getXY(point) {
  if (!point) return null;
  if (Array.isArray(point) && point.length === 2) {
    return point;
  }
  if (point && typeof point.x === 'number' && typeof point.y === 'number') {
    return [point.x, point.y];
  }
  console.warn("PoseOverlay: Invalid landmark format:", point);
  return null;
}

function normalizeLandmarks(rawLandmarks, width, height) {
  return rawLandmarks.map(pt => {
    const coords = getXY(pt);
    if (!coords) return null;
    let [x, y] = coords;
    // If supplied in pixel space, normalize to [0,1]
    if (x > 1) x = x / width;
    if (y > 1) y = y / height;
    return [x, y];
  });
}

export default function PoseOverlay({ detection, exerciseType, targetWidth, targetHeight }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const raw = detection?.landmarks || [];
    const landmarks = normalizeLandmarks(raw, targetWidth, targetHeight);
    const idealRaw = exerciseType ? IDEAL_POSES[exerciseType] || [] : [];
    const ideal = normalizeLandmarks(idealRaw, targetWidth, targetHeight);

    // Draw detected skeleton
    ctx.strokeStyle = '#00cc99';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    SKELETON_CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1[0] * targetWidth, p1[1] * targetHeight);
        ctx.lineTo(p2[0] * targetWidth, p2[1] * targetHeight);
        ctx.stroke();
      }
    });

    // Draw joints
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    landmarks.forEach(pt => {
      if (pt) {
        ctx.beginPath();
        ctx.arc(pt[0] * targetWidth, pt[1] * targetHeight, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw ideal skeleton (dashed)
    if (ideal.length) {
      ctx.strokeStyle = 'rgba(0,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      SKELETON_CONNECTIONS.forEach(([i, j]) => {
        const p1 = ideal[i];
        const p2 = ideal[j];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1[0] * targetWidth, p1[1] * targetHeight);
          ctx.lineTo(p2[0] * targetWidth, p2[1] * targetHeight);
          ctx.stroke();
        }
      });
      ctx.setLineDash([]);
    }
  }, [detection, exerciseType, targetWidth, targetHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={targetWidth}
      height={targetHeight}
      className="pose-overlay"
    />
  );
}
