// src/services/PoseService.js

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Part 1: Client→Server Pose Analysis (JSON)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Minimum confidence threshold for pose detection points
export const MIN_CONFIDENCE_THRESHOLD = 0.45;

/**
 * Validates the detection object before sending to the server
 * @param {object} detection - The detection object with landmarks
 * @returns {boolean} - Whether the detection is valid
 */
export function validateDetection(detection) {
  if (!detection || !Array.isArray(detection.landmarks)) {
    return false;
  }
  
  // Check if we have enough valid landmarks (at least half)
  const validCount = detection.landmarks.filter(landmark => {
    if (!landmark) return false;
    
    if (Array.isArray(landmark)) {
      return landmark.length >= 2;
    }
    
    if (typeof landmark === 'object') {
      return typeof landmark.x === 'number' && typeof landmark.y === 'number';
    }
    
    return false;
  }).length;
  
  return validCount >= Math.floor(detection.landmarks.length / 2);
}

/**
 * Send detected landmarks for form/quality analysis
 * @param {{landmarks: [number,number][]}} detection - Object with landmarks array
 * @param {string} exerciseType - Type of exercise (e.g., 'pushup')
 * @param {number} heartRate - Current heart rate
 * @returns {Promise<object>} - Analysis result from server
 */
export async function analyzePose(detection, exerciseType, heartRate) {
  if (!validateDetection(detection)) {
    throw new Error('Invalid detection object: landmarks array required with sufficient valid points.');
  }

  const endpoint = 'http://localhost:5000/api/workout/analyze-pose';
  
  try {
    // Pre-process landmarks to ensure consistent format
    const processedLandmarks = detection.landmarks.map(landmark => {
      if (!landmark) return null;
      
      if (Array.isArray(landmark)) {
        return {
          x: landmark[0],
          y: landmark[1],
          confidence: landmark.length > 2 ? landmark[2] : 1.0
        };
      }
      
      if (typeof landmark === 'object') {
        return {
          x: landmark.x,
          y: landmark.y,
          confidence: landmark.confidence || landmark.visibility || 1.0
        };
      }
      
      return null;
    });
    
    const payload = {
      landmarks: processedLandmarks,
      exerciseType,
      heartRate,
      clientInfo: {
        width: window.innerWidth,
        height: window.innerHeight,
        timestamp: Date.now()
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Pose analysis failed: ${response.status} ${response.statusText}${errText ? ' – ' + errText : ''}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error in analyzePose:', error);
    throw error;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Part 2: Skeleton & Ideal Poses (BlazePose 33-point)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Reference for BlazePose 33-point model:
// 0: nose
// 1-10: face landmarks
// 11: left shoulder
// 12: right shoulder
// 13: left elbow
// 14: right elbow
// 15: left wrist
// 16: right wrist
// 17-22: hands
// 23: left hip
// 24: right hip
// 25: left knee
// 26: right knee
// 27: left ankle
// 28: right ankle
// 29-32: feet

// Primary connections between landmarks to form a skeleton
export const SKELETON_CONNECTIONS = [
  // Face connections
  [0,1], [1,2], [2,3], [3,7], [0,4], [4,5], [5,6], [6,8], [9,10],
  
  // Upper body core
  [11,12], [11,23], [12,24], [23,24],
  
  // Left arm
  [11,13], [13,15], [15,17], [15,19], [17,19],
  
  // Right arm
  [12,14], [14,16], [16,18], [16,20], [18,20],
  
  // Left leg
  [23,25], [25,27], [27,29], [27,31], [29,31],
  
  // Right leg 
  [24,26], [26,28], [28,30], [28,32], [30,32]
];

// Ideal poses with normalized coordinates [0-1] for specific exercises
export const IDEAL_POSES = {
  pushup: [
    // Head
    [0.5, 0.08], [0.5, 0.10], [0.48, 0.12], [0.46, 0.14], [0.52, 0.12], 
    [0.54, 0.14], [0.5, 0.15], [0.46, 0.16], [0.54, 0.16], [0.48, 0.20], [0.52, 0.20],
    
    // Shoulders
    [0.4, 0.2], [0.6, 0.2], 
    
    // Arms
    [0.25, 0.25], [0.75, 0.25], [0.1, 0.3], [0.9, 0.3],
    
    // Hands
    [0.05, 0.35], [0.95, 0.35], [0.05, 0.33], [0.95, 0.33], [0.05, 0.37], [0.95, 0.37],
    
    // Hips
    [0.4, 0.45], [0.6, 0.45],
    
    // Legs
    [0.4, 0.7], [0.6, 0.7], [0.4, 0.95], [0.6, 0.95],
    
    // Feet
    [0.35, 0.98], [0.65, 0.98], [0.45, 0.98], [0.55, 0.98]
  ],
  
  squat: [
    // Head
    [0.5, 0.15], [0.5, 0.16], [0.48, 0.17], [0.46, 0.18], [0.52, 0.17], 
    [0.54, 0.18], [0.5, 0.19], [0.46, 0.20], [0.54, 0.20], [0.48, 0.22], [0.52, 0.22],
    
    // Shoulders
    [0.4, 0.25], [0.6, 0.25], 
    
    // Arms
    [0.3, 0.35], [0.7, 0.35], [0.25, 0.45], [0.75, 0.45],
    
    // Hands
    [0.2, 0.55], [0.8, 0.55], [0.18, 0.55], [0.82, 0.55], [0.22, 0.55], [0.78, 0.55],
    
    // Hips
    [0.45, 0.5], [0.55, 0.5],
    
    // Legs (bent)
    [0.35, 0.65], [0.65, 0.65], [0.45, 0.8], [0.55, 0.8],
    
    // Feet
    [0.45, 0.95], [0.55, 0.95], [0.4, 0.95], [0.6, 0.95]
  ],
  
  situp: [
    // Head (lifted)
    [0.5, 0.35], [0.5, 0.36], [0.48, 0.37], [0.46, 0.38], [0.52, 0.37], 
    [0.54, 0.38], [0.5, 0.39], [0.46, 0.40], [0.54, 0.40], [0.48, 0.41], [0.52, 0.41],
    
    // Shoulders
    [0.45, 0.45], [0.55, 0.45], 
    
    // Arms (crossed on chest)
    [0.5, 0.55], [0.5, 0.55], [0.45, 0.48], [0.55, 0.48],
    
    // Hands
    [0.55, 0.50], [0.45, 0.50], [0.57, 0.50], [0.43, 0.50], [0.53, 0.50], [0.47, 0.50],
    
    // Hips
    [0.5, 0.65], [0.5, 0.65],
    
    // Legs
    [0.5, 0.8], [0.5, 0.8], [0.5, 0.95], [0.5, 0.95],
    
    // Feet
    [0.5, 0.98], [0.5, 0.98], [0.48, 0.98], [0.52, 0.98]
  ]
};

/**
 * Calculate angle between three points in degrees
 * Useful for measuring joint angles
 * @param {number[]} p1 - First point [x,y]
 * @param {number[]} p2 - Middle point (joint) [x,y]
 * @param {number[]} p3 - Third point [x,y]
 * @returns {number} - Angle in degrees
 */
export function calculateJointAngle(p1, p2, p3) {
  if (!p1 || !p2 || !p3) return null;
  
  // Calculate vectors
  const vector1 = [p1[0] - p2[0], p1[1] - p2[1]];
  const vector2 = [p3[0] - p2[0], p3[1] - p2[1]];
  
  // Calculate dot product
  const dotProduct = vector1[0] * vector2[0] + vector1[1] * vector2[1];
  
  // Calculate magnitudes
  const magnitude1 = Math.sqrt(vector1[0] * vector1[0] + vector1[1] * vector1[1]);
  const magnitude2 = Math.sqrt(vector2[0] * vector2[0] + vector2[1] * vector2[1]);
  
  // Calculate angle in radians
  const cosAngle = dotProduct / (magnitude1 * magnitude2);
  
  // Convert to degrees
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

/**
 * Get key joint angles from landmarks (useful for exercise analysis)
 * @param {Array} landmarks - Normalized landmarks array
 * @returns {object} - Object with joint angles
 */
export function getJointAngles(landmarks) {
  if (!landmarks || !Array.isArray(landmarks)) {
    return null;
  }
  
  // Example key angles
  return {
    leftElbow: calculateJointAngle(landmarks[11], landmarks[13], landmarks[15]),
    rightElbow: calculateJointAngle(landmarks[12], landmarks[14], landmarks[16]),
    leftShoulder: calculateJointAngle(landmarks[23], landmarks[11], landmarks[13]),
    rightShoulder: calculateJointAngle(landmarks[24], landmarks[12], landmarks[14]),
    leftKnee: calculateJointAngle(landmarks[23], landmarks[25], landmarks[27]),
    rightKnee: calculateJointAngle(landmarks[24], landmarks[26], landmarks[28]),
    leftHip: calculateJointAngle(landmarks[11], landmarks[23], landmarks[25]),
    rightHip: calculateJointAngle(landmarks[12], landmarks[24], landmarks[26])
  };
}