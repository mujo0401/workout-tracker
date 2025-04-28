// src/Overlays/DetectionOverlay.jsx

import React, { useEffect, useRef } from "react";
import "../css/DetectionOverlay.css";

export default function DetectionOverlay({ detection, targetWidth, targetHeight }) {
  const overlayRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function draw() {
      const parent = canvas.parentElement;
      if (!parent) return;

      // Resize to match parent
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;

      // Clear previous frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      console.log("DetectionOverlay draw:", detection);

      // If no detection, still schedule next frame
      if (!detection?.bbox) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      // Extract and scale bbox coords
      let { x_min, y_min, x_max, y_max } = detection.bbox;
      let x1, y1, x2, y2;
      if (x_max <= 1 && y_max <= 1) {
        x1 = x_min * canvas.width;
        x2 = x_max * canvas.width;
        y1 = y_min * canvas.height;
        y2 = y_max * canvas.height;
      } else if (targetWidth > 0 && targetHeight > 0) {
        const scaleX = canvas.width / targetWidth;
        const scaleY = canvas.height / targetHeight;
        x1 = x_min * scaleX;
        x2 = x_max * scaleX;
        y1 = y_min * scaleY;
        y2 = y_max * scaleY;
      } else {
        x1 = x_min;
        x2 = x_max;
        y1 = y_min;
        y2 = y_max;
      }

      // Compute center (chest level for person)
      const detectionType = detection.type || "person";
      const centerX = (x1 + x2) / 2;
      let centerY = (y1 + y2) / 2;
      if (detectionType === "person") {
        centerY = y1 + (y2 - y1) * 0.3;
      }

      // Style parameters
      let dotColor, glowColor, dotSize;
      switch (detectionType) {
        case "cat":
          dotColor = "#ff9c00";
          glowColor = "rgba(255, 156, 0, 0.7)";
          dotSize = 12;
          break;
        case "bird":
          dotColor = "#00c8ff";
          glowColor = "rgba(0, 200, 255, 0.7)";
          dotSize = 10;
          break;
        default:
          dotColor = "#00fff6";
          glowColor = "rgba(0, 255, 246, 0.7)";
          dotSize = 15;
      }

      // Pulsing glow
      ctx.save();
      const timestamp = Date.now();
      const pulseScale = 1 + 0.2 * Math.sin(timestamp / 200);

      ctx.beginPath();
      ctx.arc(centerX, centerY, dotSize * 1.8 * pulseScale, 0, Math.PI * 2);
      ctx.fillStyle = glowColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.fill();

      // Pulsing inner dot
      ctx.beginPath();
      ctx.arc(centerX, centerY, dotSize * pulseScale, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.shadowColor = dotColor;
      ctx.shadowBlur = 10;
      ctx.fill();

      // Subtle highlight
      ctx.beginPath();
      ctx.arc(centerX - dotSize * 0.25, centerY - dotSize * 0.25, dotSize * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.shadowBlur = 0;
      ctx.fill();
      ctx.restore();

      // Schedule next frame
      frameRef.current = requestAnimationFrame(draw);
    }

    // Start animation loop
    frameRef.current = requestAnimationFrame(draw);

    // Cleanup on unmount or deps change
    return () => cancelAnimationFrame(frameRef.current);
  }, [detection, targetWidth, targetHeight]);

  return <canvas ref={overlayRef} className="detection-overlay" />;
}
