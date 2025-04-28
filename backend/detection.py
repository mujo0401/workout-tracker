# detection.py
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
        self.frame_skip = 0

    def process_frame(self, frame):
        """
        Run pose detection on a BGR frame, but on a downscaled image for speed.
        Returns:
         - frame (unmodified),
         - detection dict with 'landmarks', 'bbox', 'type'
        """
        self.frame_skip += 1
        # Skip every other frame if we already have a good detection
        if self.frame_skip % 2 == 0 and self.previous_detection:
            return frame, self.previous_detection

        h, w = frame.shape[:2]
        # --- Downscale for faster inference ---
        small_w, small_h = 320, 240
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
                landmarks.append({"id": idx, "x": x_px, "y": y_px})

            if landmarks:
                xs = [p['x'] for p in landmarks]
                ys = [p['y'] for p in landmarks]
                bbox = {
                    'x_min': min(xs), 'y_min': min(ys),
                    'x_max': max(xs), 'y_max': max(ys)
                }

        detection = {'landmarks': landmarks, 'bbox': bbox, 'type': 'person'}
        if landmarks:
            self.previous_detection = detection
        return frame, detection
