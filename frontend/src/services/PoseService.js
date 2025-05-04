// src/services/PoseService.js

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Part 1: Client→Server Pose Analysis (JSON)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Send detected landmarks for form/quality analysis
 * @param {{landmarks: [number,number][]}} detection  Object with landmarks array
 * @param {string} exerciseType                        Type of exercise (e.g., 'pushup')
 * @param {number} heartRate                           Current heart rate
 * @returns {Promise<object>}                         Analysis result from server
 */
export async function analyzePose(detection, exerciseType, heartRate) {
  if (!detection || !Array.isArray(detection.landmarks)) {
    throw new Error('Invalid detection object: landmarks array required.');
  }

  const endpoint = 'http://localhost:5000/api/workout/analyze-pose';
  const payload = {
    landmarks: detection.landmarks,
    exerciseType,
    heartRate
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
}


/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Part 2: Skeleton & Ideal Poses (BlazePose 33-point)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const SKELETON_CONNECTIONS = [
  [0,1],[1,2],[2,3],[0,4],[4,5],[5,6],[3,7],[6,8],[9,10],
  [11,12],[11,23],[12,24],[23,24],
  [11,13],[13,15],[15,17],[15,18],[15,19],
  [12,14],[14,16],[16,20],[16,21],[16,22],
  [23,25],[25,27],[27,29],[27,31],
  [24,26],[26,28],[28,30],[28,32]
];

export const IDEAL_POSES = {
  pushup: [ /* normalized [x,y] values */
    [0.5, 0.05], [0.5, 0.10], [0.45, 0.20], [0.4, 0.4], [0.55, 0.2],
    [0.6, 0.4], [0.5, 0.6], [0.5, 0.8], [0.3, 1], [0.7, 1],
    [0.5, 0.12], [0.48, 0.25], [0.44, 0.55], [0.52, 0.25], [0.56, 0.55],
    [0.5, 0.85], [0.5, 0.95]
  ],
  situp: [
    [0.5, 0.05], [0.5, 0.15], [0.5, 0.3], [0.5, 0.5], [0.5, 0.3],
    [0.5, 0.5], [0.5, 0.7], [0.5, 0.9], [0.45, 1], [0.55, 1],
    [0.5, 0.18], [0.5, 0.35], [0.5, 0.6], [0.5, 0.35], [0.5, 0.6],
    [0.5, 0.85], [0.5, 0.95]
  ]
};
