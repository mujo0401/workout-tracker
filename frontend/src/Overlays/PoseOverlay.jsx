// src/Overlays/PoseOverlay.jsx
import React, { useEffect, useRef, useState } from 'react';
import { SKELETON_CONNECTIONS, IDEAL_POSES, MIN_CONFIDENCE_THRESHOLD } from '../services/PoseService';
import '../css/PoseOverlay.css';

/**
 * Extracts X,Y coordinates from different possible landmark formats
 * @param {any} point - The point data from pose detection (now expected to be normalized [0,1])
 * @param {number} confidenceThreshold - Minimum confidence value to consider valid
 * @returns {number[]|null} - [x, y] coordinates or null if invalid
 */
function getXY(point, confidenceThreshold = 0.2) {
  if (!point) return null;
  
  // Handle object format {x, y, confidence} which is what backend sends now
  if (point && typeof point === 'object') {
    if (typeof point.x === 'number' && typeof point.y === 'number') {
      // Check confidence/visibility if available and below threshold
      if ((typeof point.confidence === 'number' && point.confidence < confidenceThreshold) ||
          (typeof point.visibility === 'number' && point.visibility < confidenceThreshold)) {
        return null;
      }
      // [Change 1] Coordinates are already normalized from backend (0 to 1)
      return [point.x, point.y];
    }
  }
  
  // Fallback for array format, though backend is now sending objects
  if (Array.isArray(point)) {
    if (point.length >= 2) {
      if (point.length >= 3 && typeof point[2] === 'number' && point[2] < confidenceThreshold) {
        return null;
      }
      return [point[0], point[1]];
    }
    return null;
  }
  
  return null;
}

/**
 * Normalizes landmarks to [0,1] range and filters out low confidence points
 * @param {Array} rawLandmarks - Array of landmark points
 * @param {number} width - Target width (used only for scaling if points are NOT normalized, but they should be now)
 * @param {number} height - Target height (used only for scaling if points are NOT normalized, but they should be now)
 * @param {number} confidenceThreshold - Minimum confidence to include point
 * @returns {Array} - Array of normalized [x,y] coordinates
 */
function normalizeLandmarks(rawLandmarks, width, height, confidenceThreshold) {
  if (!Array.isArray(rawLandmarks) || rawLandmarks.length === 0) {
    return [];
  }

  return rawLandmarks.map(pt => {
    const coords = getXY(pt, confidenceThreshold);
    if (!coords) return null;
    
    let [x, y] = coords;
    
    // [Change 2] Remove scaling logic if coordinates are already normalized
    // If we receive data not normalized, then uncomment the below.
    // Assuming backend now sends x, y in [0, 1] range.
    /*
    if (x > 1) x = x / width;
    if (y > 1) y = y / height;
    */
    
    // Constrain values to valid range
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));
    
    return [x, y];
  });
}

/**
 * Calculate what percentage of keypoints are detected with sufficient confidence
 * @param {Array} landmarks - The normalized landmarks
 * @returns {number} - Percentage of valid landmarks (0-100)
 */
function calculateDetectionCompleteness(landmarks) {
  if (!landmarks || landmarks.length === 0) return 0;
  const validPoints = landmarks.filter(pt => pt !== null).length;
  return Math.round((validPoints / landmarks.length) * 100);
}

/**
 * Pose overlay component that visualizes detected and ideal poses
 */
export default function PoseOverlay({ 
  detection, 
  exerciseType, 
  targetWidth, 
  targetHeight,
  confidenceThreshold = MIN_CONFIDENCE_THRESHOLD,
  showIdealPose = true,
  showDebugInfo = true
}) {
  const canvasRef = useRef(null);
  const [detectionQuality, setDetectionQuality] = useState(0);
  const [detectionValid, setDetectionValid] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // [Change 3] Set canvas dimensions based on targetWidth/Height or parent if not set
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = targetWidth || parent.clientWidth;
      canvas.height = targetHeight || parent.clientHeight;
    } else {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }


    // Extract and normalize landmark data (already normalized by backend)
    const raw = detection?.landmarks || [];
    // Here, normalizeLandmarks won't perform pixel-to-normalized conversion if points are already [0,1]
    const landmarks = normalizeLandmarks(raw, canvas.width, canvas.height, confidenceThreshold); 
    
    // Check if we have enough valid points for a reasonable detection
    const completeness = calculateDetectionCompleteness(landmarks);
    setDetectionQuality(completeness);
    
    // Require at least 50% of points to be valid
    const isValid = completeness >= 50;
    setDetectionValid(isValid);
    
    // Process ideal pose if valid and requested
    const idealRaw = (showIdealPose && exerciseType && IDEAL_POSES[exerciseType]) || [];
    // Ideal poses are always normalized [0,1], so normalizeLandmarks just filters by confidence (0 for ideal)
    const ideal = normalizeLandmarks(idealRaw, canvas.width, canvas.height, 0);

    // Only draw if we have a valid detection
    if (isValid) {
      // Draw detected skeleton
      ctx.strokeStyle = '#00cc99';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      SKELETON_CONNECTIONS.forEach(([i, j]) => {
        if (i >= landmarks.length || j >= landmarks.length) return;
        
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        
        if (p1 && p2) {
          ctx.beginPath();
          // Scale normalized coordinates to canvas pixels
          ctx.moveTo(p1[0] * canvas.width, p1[1] * canvas.height);
          ctx.lineTo(p2[0] * canvas.width, p2[1] * canvas.height);
          ctx.stroke();
        }
      });

      // Draw joints
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      landmarks.forEach((pt, index) => {
        if (pt) {
          ctx.beginPath();
          // Scale normalized coordinates to canvas pixels
          ctx.arc(pt[0] * canvas.width, pt[1] * canvas.height, 6, 0, Math.PI * 2);
          ctx.fill();
          
          // Optionally show point indices for debugging
          if (showDebugInfo) {
            ctx.fillStyle = 'black';
            ctx.font = '10px Arial';
            ctx.fillText(index.toString(), pt[0] * canvas.width + 8, pt[1] * canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
          }
        }
      });

      // Draw ideal skeleton if available
      if (showIdealPose && ideal.length > 0) {
        ctx.strokeStyle = 'rgba(0,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        
        SKELETON_CONNECTIONS.forEach(([i, j]) => {
          if (i >= ideal.length || j >= ideal.length) return;
          
          const p1 = ideal[i];
          const p2 = ideal[j];
          
          if (p1 && p2) {
            ctx.beginPath();
            // Scale normalized coordinates to canvas pixels
            ctx.moveTo(p1[0] * canvas.width, p1[1] * canvas.height);
            ctx.lineTo(p2[0] * canvas.width, p2[1] * canvas.height);
            ctx.stroke();
          }
        });
        ctx.setLineDash([]);
      }
    }
    
    // Show detection quality indicator
    if (showDebugInfo) {
      ctx.font = '14px Arial';
      ctx.fillStyle = isValid ? '#00cc99' : '#ff6666';
      ctx.fillText(`Detection: ${completeness}% ${isValid ? '✓' : '✗'}`, 10, 20);
    }
    
  }, [detection, exerciseType, targetWidth, targetHeight, confidenceThreshold, showIdealPose, showDebugInfo]);

  return (
    <div className="pose-overlay-container">
      <canvas
        ref={canvasRef}
        // [Change 4] Pass targetWidth/Height directly to canvas for initial sizing
        width={targetWidth}
        height={targetHeight}
        className="pose-overlay"
      />
      {!detectionValid && (
        <div className="pose-detection-warning">
          Poor pose detection. Please ensure full body is visible.
        </div>
      )}
    </div>
  );
}