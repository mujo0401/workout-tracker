// src/Overlays/DetectionOverlay.jsx
import React, { useEffect, useRef } from "react";
import "../css/DetectionOverlay.css";

export default function DetectionOverlay({ detection, targetWidth, targetHeight }) {
  const canvasRef = useRef(null);
  const detRef = useRef(detection);
  const prevCorners = useRef({ x1: null, y1: null, x2: null, y2: null });
  const rafId = useRef(null);
  const framesToDraw = useRef(0);

  const SMOOTH = 0.2;
  const FRAME_COUNT = 3;
  const baseColor = "#00ffe1";
  const bracketLen = 20;

  // update detection ref and schedule redraw frames
  useEffect(() => {
    detRef.current = detection;
    framesToDraw.current = FRAME_COUNT;
  }, [detection]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // resize canvas once and on parent size changes
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.parentElement);

    // linear interpolation
    function lerp(a, b) {
      return a === null ? b : a + (b - a) * SMOOTH;
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const det = detRef.current;
      if (!det?.bbox) return;

      let { x_min, y_min, x_max, y_max } = det.bbox;
      let x1, y1, x2, y2;
      // normalized coordinates
      if (x_max <= 1 && y_max <= 1) {
        x1 = x_min * canvas.width;
        y1 = y_min * canvas.height;
        x2 = x_max * canvas.width;
        y2 = y_max * canvas.height;
      } else if (targetWidth && targetHeight) {
        const sx = canvas.width / targetWidth;
        const sy = canvas.height / targetHeight;
        x1 = x_min * sx;
        y1 = y_min * sy;
        x2 = x_max * sx;
        y2 = y_max * sy;
      } else {
        x1 = x_min;
        y1 = y_min;
        x2 = x_max;
        y2 = y_max;
      }

      // smoothing
      const prev = prevCorners.current;
      const sx1 = lerp(prev.x1, x1);
      const sy1 = lerp(prev.y1, y1);
      const sx2 = lerp(prev.x2, x2);
      const sy2 = lerp(prev.y2, y2);
      prevCorners.current = { x1: sx1, y1: sy1, x2: sx2, y2: sy2 };

      // draw simplified brackets
      ctx.save();
      ctx.lineWidth = 4;
      ctx.strokeStyle = baseColor;
      ctx.beginPath();
      // top-left
      ctx.moveTo(sx1, sy1 + bracketLen);
      ctx.lineTo(sx1, sy1);
      ctx.lineTo(sx1 + bracketLen, sy1);
      // top-right
      ctx.moveTo(sx2 - bracketLen, sy1);
      ctx.lineTo(sx2, sy1);
      ctx.lineTo(sx2, sy1 + bracketLen);
      // bottom-right
      ctx.moveTo(sx2, sy2 - bracketLen);
      ctx.lineTo(sx2, sy2);
      ctx.lineTo(sx2 - bracketLen, sy2);
      // bottom-left
      ctx.moveTo(sx1 + bracketLen, sy2);
      ctx.lineTo(sx1, sy2);
      ctx.lineTo(sx1, sy2 - bracketLen);
      ctx.stroke();
      ctx.restore();
    }

    function animate() {
      if (framesToDraw.current > 0) {
        draw();
        framesToDraw.current--;
      }
      rafId.current = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId.current);
      resizeObserver.disconnect();
    };
  }, [targetWidth, targetHeight]);

  return <canvas ref={canvasRef} className="detection-overlay" />;
}
