/**
 * MotionAnalytics.js — Frame Performance & FPS Tracker for Cream AI
 */

class MotionAnalyticsService {
  constructor() {
    this.fps = 60;
    this.droppedFrames = 0;
    this.activeSprings = 0;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;

    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      this.startMonitoring();
    }
  }

  startMonitoring() {
    const tick = (time) => {
      const delta = time - this.lastFrameTime;
      this.frameCount += 1;

      if (delta >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / delta);
        if (this.fps < 50) this.droppedFrames += 1;
        this.frameCount = 0;
        this.lastFrameTime = time;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  getMetrics() {
    return {
      fps: this.fps,
      droppedFrames: this.droppedFrames,
      activeSprings: this.activeSprings,
    };
  }
}

export const MotionAnalytics = new MotionAnalyticsService();
