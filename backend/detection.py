import cv2
import mediapipe as mp

mp_pose = mp.solutions.pose

class ExerciseDetector:
    def __init__(self,
                 model_complexity=1,
                 min_detection_confidence=0.5,
                 min_tracking_confidence=0.5):
        self.pose = mp_pose.Pose(
            model_complexity=model_complexity,
            enable_segmentation=False,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            static_image_mode=False
        )
        self.previous_detection = None
        self.frame_skip_counter = 0 # [Change 1] Renamed for clarity
        self.skip_frames_threshold = 1 # [Change 2] Default to skip 1 frame after successful detection
        self.last_detection_quality = 0 # [Change 3] Track quality to adapt skipping

    def process_frame(self, frame):
        """
        Run pose detection on a BGR frame, but on a downscaled image for speed.
        Returns:
         - frame (unmodified),
         - detection dict with 'landmarks', 'bbox', 'type'
        """
        self.frame_skip_counter += 1

        # [Change 4] Adaptive frame skipping logic
        # Only skip if a previous detection was good and we've processed enough frames since
        if self.previous_detection and self.last_detection_quality > 70 and self.frame_skip_counter % self.skip_frames_threshold != 0:
            return frame, self.previous_detection
        
        h, w = frame.shape[:2]
        # --- Downscale for faster inference ---
        small_w, small_h = 320, 240 # Keep original downscale
        small = cv2.resize(frame, (small_w, small_h))
        rgb_small = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb_small)

        landmarks = []
        bbox = None
        if results.pose_landmarks:
            for idx, lm in enumerate(results.pose_landmarks.landmark):
                # Scale back up to original resolution
                x_px = int(lm.x * w)
                y_px = int(lm.y * h)
                # [Change 5] Include confidence/visibility in landmark data
                landmarks.append({"id": idx, "x": x_px, "y": y_px, "confidence": lm.visibility if hasattr(lm, 'visibility') else 1.0})

            if landmarks:
                xs = [p['x'] for p in landmarks]
                ys = [p['y'] for p in landmarks]
                bbox = {
                    'x_min': min(xs), 'y_min': min(ys),
                    'x_max': max(xs), 'y_max': max(ys)
                }
                
                # [Change 6] Calculate detection quality for adaptive skipping
                valid_landmarks_count = sum(1 for lm in landmarks if lm['confidence'] > self.pose.min_tracking_confidence)
                self.last_detection_quality = (valid_landmarks_count / len(landmarks)) * 100 if len(landmarks) > 0 else 0
                
                # [Change 7] Adjust skip threshold based on quality
                if self.last_detection_quality < 50: # If detection is poor, don't skip frames
                    self.skip_frames_threshold = 1
                elif self.last_detection_quality > 90: # If detection is very good, can skip more
                    self.skip_frames_threshold = 3
                else: # Otherwise, default skip
                    self.skip_frames_threshold = 1
        else:
            self.last_detection_quality = 0 # No landmarks means poor quality

        detection = {'landmarks': landmarks, 'bbox': bbox, 'type': 'person'}
        if landmarks:
            self.previous_detection = detection
        return frame, detection