/**
 * MotionController.js — Centralized Motion State Engine
 * Enforces prefers-reduced-motion, Battery Saver detection, and background pause.
 */

class MotionControllerEngine {
  constructor() {
    this.reducedMotion = false;
    this.batterySaver = false;
    this.isScrolling = false;
    this.scrollTimer = null;
    this.listeners = new Set();

    this.initSystemListeners();
  }

  initSystemListeners() {
    if (typeof window === 'undefined') return;

    // 1. Reduced Motion Query
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = motionQuery.matches;
    motionQuery.addEventListener?.('change', (e) => {
      this.reducedMotion = e.matches;
      this.notify();
    });

    // 2. Battery Saver Query / API
    if ('getBattery' in navigator) {
      navigator.getBattery().then((battery) => {
        this.batterySaver = battery.saveData || battery.level < 0.15;
        battery.addEventListener('levelchange', () => {
          this.batterySaver = battery.level < 0.15;
          this.notify();
        });
      }).catch(() => {});
    }

    // 3. Scroll Pausing Listener — stored as named handler for cleanup
    this._scrollHandler = () => {
      if (!this.isScrolling) {
        this.isScrolling = true;
        this.notify();
      }
      clearTimeout(this.scrollTimer);
      this.scrollTimer = setTimeout(() => {
        this.isScrolling = false;
        this.notify();
      }, 150);
    };
    window.addEventListener('scroll', this._scrollHandler, { passive: true });
  }

  /**
   * Tear down the singleton (used in tests and HMR cleanup).
   * Removes the scroll listener to prevent memory leaks.
   */
  destroy() {
    if (this._scrollHandler) {
      window.removeEventListener('scroll', this._scrollHandler);
      this._scrollHandler = null;
    }
    clearTimeout(this.scrollTimer);
    this.listeners.clear();
  }


  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
  }

  getState() {
    return {
      reducedMotion: this.reducedMotion,
      batterySaver: this.batterySaver,
      isScrolling: this.isScrolling,
      allowAmbient: !this.reducedMotion && !this.batterySaver && !this.isScrolling,
    };
  }
}

export const MotionController = new MotionControllerEngine();
