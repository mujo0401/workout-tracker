// src/StreamManager.js

import { io } from "socket.io-client";

export default class StreamManager {
  constructor(onFrame, onCounts, onConnect, onError, onDetections) {
    // === Socket Initialization ===
    this.socket = io("http://localhost:5000", {
      reconnectionAttempts: 5,
      timeout: 5000,
      pingInterval: 25000,
      pingTimeout: 5000
    });
    this.socket.binaryType = "arraybuffer";

    // === DEBUG: catch-all listener for every incoming event ===
    this.socket.onAny((event, payload) => {
      console.log("[socket event]", event, payload);
    });

    // === Frame Queue & Metrics ===
    this.maxQueueSize       = 1;
    this.frameQueue         = [];
    this.processingFrame    = false;
    this.animationFrameId   = null;
    this.skippedFrames      = 0;
    this.fpsRenderCounter   = 0;
    this.fpsTimer           = performance.now();
    this.currentRenderFps   = 0;

    // === Connection Events ===
    this.socket.on("connect", () => {
      console.log("StreamManager: Socket connected", this.socket.id);
      onConnect?.();
    });

    this.socket.on("connect_error", (err) => {
      console.error("StreamManager: Connection Error", err);
      onError?.(err);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("StreamManager: Socket disconnected", reason);
      this.stopProcessingFrames();
      this.frameQueue = [];
    });

    // === Core Event Handlers ===

    // 1) Video frames
    this.socket.on("frame", (buffer) => {
      this._handleFrame(buffer, onFrame);
    });

    // 2) Workout counts (pushups, situps, etc.)
    this.socket.on("counts", (counts) => {
      onCounts?.(counts);
    });

    // 3) Object detections — normalize missing fields
    // new StreamManager.js
this.socket.on("detections", raw => {
  let bbox = null;

  if (raw.bbox && typeof raw.bbox === 'object') {
    // either keep it as object:
    bbox = raw.bbox;
    // — or convert to [xMin, yMin, xMax, yMax]:
    // bbox = [raw.bbox.x_min, raw.bbox.y_min, raw.bbox.x_max, raw.bbox.y_max];
  }

  const detectionData = {
    bbox,
    landmarks: Array.isArray(raw.landmarks) ? raw.landmarks : [],
    type:      typeof raw.type === 'string'  ? raw.type      : 'person',
  };

  onDetections?.(detectionData);
});

    // 4) Ping for debug/latency
    this.socket.on("ping", (data) => {
      console.log("StreamManager: ping", data);
    });

    // === Periodic Metrics Logging ===
    setInterval(() => {
      const now = performance.now();
      const intervalSec = (now - this.fpsTimer) / 1000;
      this.currentRenderFps = intervalSec > 0
        ? Math.round(this.fpsRenderCounter / intervalSec)
        : this.fpsRenderCounter;

      console.log(
        `StreamManager: RenderFPS=${this.currentRenderFps}, Queue=${this.frameQueue.length}, Dropped=${this.skippedFrames}`
      );

      this.fpsRenderCounter = 0;
      this.skippedFrames    = 0;
      this.fpsTimer         = now;
    }, 2000);
  }

  // === Internal frame buffering & loop start ===
  _handleFrame(buffer, onFrame) {
    try {
      // Drop oldest if queue is full
      while (this.frameQueue.length >= this.maxQueueSize) {
        this.frameQueue.shift();
        this.skippedFrames++;
      }
      this.frameQueue.push(buffer);

      if (!this.processingFrame) {
        this.startProcessingFrames(onFrame);
      }
    } catch (err) {
      console.error("StreamManager: Error handling incoming frame", err);
    }
  }

  startProcessingFrames(onFrame) {
    if (this.processingFrame) return;
    this.processingFrame = true;

    const loop = () => {
      if (!this.processingFrame || this.frameQueue.length === 0) {
        this.processingFrame = false;
        return;
      }
      const buffer = this.frameQueue.shift();
      this.fpsRenderCounter++;

      try {
        onFrame?.(buffer);
      } catch (err) {
        console.error("StreamManager: Error processing frame", err);
      }

      this.animationFrameId = requestAnimationFrame(loop);  // schedule next :contentReference[oaicite:3]{index=3}
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  // === Stop & Cleanup ===
  stopProcessingFrames() {
    this.processingFrame = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  disconnect() {
    this.stopProcessingFrames();
    this.frameQueue = [];
    if (this.socket.connected) {
      console.log("StreamManager: Disconnecting socket...");
      this.socket.close();
    }
  }

  // === Utility Getters & Quality Controls ===
  getSocket() {
    return this.socket;
  }

  getFPS() {
    return this.currentRenderFps;
  }

  requestLowerQuality() {
    if (!this.socket.connected) {
      console.warn("StreamManager: Cannot request lower quality, not connected.");
      return;
    }
    console.log("StreamManager: Requesting lower quality");
    this.socket.emit("quality_adjustment", { level: "low" });
  }

  requestHigherQuality() {
    if (!this.socket.connected) {
      console.warn("StreamManager: Cannot request higher quality, not connected.");
      return;
    }
    console.log("StreamManager: Requesting higher quality");
    this.socket.emit("quality_adjustment", { level: "high" });
  }
}
