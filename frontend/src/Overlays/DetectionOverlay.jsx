// src/Overlays/DetectionOverlay.jsx
import React, { useEffect, useRef } from "react";
import "../css/DetectionOverlay.css";

export default function DetectionOverlay({
  detection,
  targetWidth,
  targetHeight,
}) {
  const canvasRef    = useRef(null);
  const frameRef     = useRef(null);
  const detRef       = useRef(detection);
  const prevCorners  = useRef({ x1: null, y1: null, x2: null, y2: null });

  // keep latest detection in ref
  useEffect(() => {
    detRef.current = detection;
  }, [detection]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // simple lerp smoothing
    const SMOOTH = 0.2;
    function lerp(a, b) {
      if (a === null) return b;
      return a + (b - a) * SMOOTH;
    }

    function drawFrame() {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width  = parent.clientWidth;
      canvas.height = parent.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const det = detRef.current;
      if (!det?.bbox) {
        frameRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      // unpack & scale bbox
      let { x_min, y_min, x_max, y_max } = det.bbox;
      let x1, y1, x2, y2;
      if (x_max <= 1 && y_max <= 1) {
        x1 = x_min * canvas.width;   y1 = y_min * canvas.height;
        x2 = x_max * canvas.width;   y2 = y_max * canvas.height;
      } else if (targetWidth && targetHeight) {
        const sx = canvas.width  / targetWidth;
        const sy = canvas.height / targetHeight;
        x1 = x_min * sx;   y1 = y_min * sy;
        x2 = x_max * sx;   y2 = y_max * sy;
      } else {
        x1 = x_min; y1 = y_min;
        x2 = x_max; y2 = y_max;
      }

      // smooth corners
      const prev = prevCorners.current;
      const sx1 = lerp(prev.x1, x1);
      const sy1 = lerp(prev.y1, y1);
      const sx2 = lerp(prev.x2, x2);
      const sy2 = lerp(prev.y2, y2);
      prevCorners.current = { x1: sx1, y1: sy1, x2: sx2, y2: sy2 };

      // colors & constants
      const baseColor   = "#00ffe1";
      const glowColor   = "rgba(0,255,225,0.6)";
      const bracketLen  = 20;
      const now         = Date.now();
      const scanDur     = 2000; // ms for a full sweep

      // 1) glowing corner brackets
      ctx.save();
      ctx.lineWidth     = 4;
      ctx.strokeStyle   = baseColor;
      ctx.shadowColor   = glowColor;
      ctx.shadowBlur    = 12;
      ctx.beginPath();
      // TL
      ctx.moveTo(sx1, sy1 + bracketLen);
      ctx.lineTo(sx1, sy1);
      ctx.lineTo(sx1 + bracketLen, sy1);
      // TR
      ctx.moveTo(sx2 - bracketLen, sy1);
      ctx.lineTo(sx2, sy1);
      ctx.lineTo(sx2, sy1 + bracketLen);
      // BR
      ctx.moveTo(sx2, sy2 - bracketLen);
      ctx.lineTo(sx2, sy2);
      ctx.lineTo(sx2 - bracketLen, sy2);
      // BL
      ctx.moveTo(sx1 + bracketLen, sy2);
      ctx.lineTo(sx1, sy2);
      ctx.lineTo(sx1, sy2 - bracketLen);
      ctx.stroke();
      ctx.restore();

      // 2) scanning laser line
      const progress = ((now % scanDur) / scanDur);
      const scanY    = sy1 + progress * (sy2 - sy1);
      ctx.save();
      ctx.lineWidth     = 2;
      ctx.strokeStyle   = glowColor;
      ctx.shadowColor   = glowColor;
      ctx.shadowBlur    = 8;
      ctx.beginPath();
      ctx.moveTo(sx1 + 4, scanY);
      ctx.lineTo(sx2 - 4, scanY);
      ctx.stroke();
      ctx.restore();

      // 3) sparkle glints (random small flashes at corners)
      if (Math.random() < 0.03) {
        const cornerX = [sx1, sx2][Math.floor(Math.random()*2)];
        const cornerY = [sy1, sy2][Math.floor(Math.random()*2)];
        const size    = Math.random() * 4 + 2;
        ctx.save();
        ctx.fillStyle   = "white";
        ctx.globalAlpha = Math.random() * 0.6 + 0.4;
        ctx.beginPath();
        ctx.arc(cornerX, cornerY, size, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

      frameRef.current = requestAnimationFrame(drawFrame);
    }

    frameRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(frameRef.current);
  }, [targetWidth, targetHeight]);

  return <canvas ref={canvasRef} className="detection-overlay" />;
}
