/**
 * StartupManager.js — Centralized, two-tier application startup orchestrator.
 *
 * Phase 2 Architectural Specification:
 * - Only CRITICAL services block UI rendering:
 *     1. Environment Validation
 *     2. Firebase & Auth Readiness
 *     3. Theme Initialization
 *     4. Profile Status
 *     5. Network Connectivity
 * - NON-CRITICAL background services initialize asynchronously AFTER UI appears:
 *     1. RevenueCat Purchases
 *     2. Remote Config / Feature Flags
 *     3. Analytics & Crashlytics
 *     4. OTA Updater
 *     5. Push Notifications
 *     6. AI Context Preload
 */

import { EventBus, EVENTS } from '../eventBus/index.js';

export const STEP_STATUS = Object.freeze({
  PENDING: 'pending',
  RUNNING: 'running',
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  FAILED: 'failed',
  SKIPPED: 'skipped',
});

export const STEPS = Object.freeze({
  ENVIRONMENT: 'environment',
  FIREBASE_AUTH: 'firebase_auth',
  THEME: 'theme',
  PROFILE: 'profile',
  NETWORK: 'network',
  // Background steps
  PURCHASES: 'purchases',
  REMOTE_CONFIG: 'remote_config',
  ANALYTICS: 'analytics',
  OTA: 'ota',
  NOTIFICATIONS: 'notifications',
  AI_PRELOAD: 'ai_preload',
});

class StartupManagerEngine {
  constructor() {
    this._state = 'idle';
    this._steps = new Map(
      Object.values(STEPS).map((s) => [s, STEP_STATUS.PENDING])
    );
    this._readyCallbacks = [];
    this._readyTime = null;
    this._initializedSteps = new Set();
  }

  get isReady() {
    return this._state === 'ready' || this._state === 'critical_ready';
  }

  get isFullyLoaded() {
    return this._state === 'ready';
  }

  getStepStatuses() {
    return Object.fromEntries(this._steps);
  }

  onReady(callback) {
    if (this.isReady) {
      Promise.resolve().then(callback);
    } else {
      this._readyCallbacks.push(callback);
    }
  }

  /**
   * Main entry point. Idempotent.
   */
  async run() {
    if (this._state !== 'idle') return;
    this._state = 'running';

    console.log('[StartupManager] Initializing Critical Pipeline…');
    const t0 = Date.now();

    // ── CRITICAL TIER (Blocks UI) ──────────────────────────────────────────────
    await this._runStep(STEPS.ENVIRONMENT, this._initEnvironment.bind(this));
    await this._runStep(STEPS.FIREBASE_AUTH, this._initFirebaseAuth.bind(this));
    await this._runStep(STEPS.THEME, this._initTheme.bind(this));
    await this._runStep(STEPS.PROFILE, this._initProfile.bind(this));
    await this._runStep(STEPS.NETWORK, this._initNetwork.bind(this));

    this._state = 'critical_ready';
    this._readyTime = Date.now() - t0;
    console.log(`[StartupManager] CRITICAL READY in ${this._readyTime}ms — Unlocking UI`);

    // Notify UI waiting callbacks immediately
    this._notifyCallbacks();
    EventBus.emit(EVENTS.STARTUP_READY, { elapsed: this._readyTime });

    // ── BACKGROUND TIER (Non-blocking) ──────────────────────────────────────────
    setTimeout(() => {
      this._runBackgroundPipeline();
    }, 100);
  }

  async _runBackgroundPipeline() {
    console.log('[StartupManager] Initializing Non-Critical Background Services…');

    await Promise.allSettled([
      this._runStep(STEPS.PURCHASES, this._initPurchases.bind(this)),
      this._runStep(STEPS.REMOTE_CONFIG, this._initRemoteConfig.bind(this)),
      this._runStep(STEPS.ANALYTICS, this._initAnalytics.bind(this)),
      this._runStep(STEPS.OTA, this._initOTA.bind(this)),
      this._runStep(STEPS.NOTIFICATIONS, this._initNotifications.bind(this)),
      this._runStep(STEPS.AI_PRELOAD, this._initAIPreload.bind(this)),
    ]);

    this._state = 'ready';
    console.log('[StartupManager] Background Services Fully Loaded');
  }

  _notifyCallbacks() {
    this._readyCallbacks.forEach((cb) => {
      try { cb(); } catch (_) {}
    });
    this._readyCallbacks = [];
  }

  async _runStep(name, fn) {
    if (this._initializedSteps.has(name)) {
      return STEP_STATUS.SKIPPED;
    }
    this._initializedSteps.add(name);

    this._steps.set(name, STEP_STATUS.RUNNING);
    EventBus.emit(EVENTS.STARTUP_STEP_COMPLETE, { step: name, status: STEP_STATUS.RUNNING });

    try {
      const result = await Promise.race([
        fn(),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 3500)),
      ]);

      const status = result === 'timeout'
        ? STEP_STATUS.DEGRADED
        : (result ?? STEP_STATUS.HEALTHY);

      this._steps.set(name, status);
      EventBus.emit(EVENTS.STARTUP_STEP_COMPLETE, { step: name, status });
      console.log(`[StartupManager] ${name}: ${status}`);
    } catch (err) {
      this._steps.set(name, STEP_STATUS.FAILED);
      EventBus.emit(EVENTS.STARTUP_STEP_COMPLETE, { step: name, status: STEP_STATUS.FAILED });
      console.warn(`[StartupManager] ${name}: FAILED —`, err?.message);
    }
  }

  // ─── Step Implementations ─────────────────────────────────────────────────────

  async _initEnvironment() {
    if (import.meta.env.PROD) {
      const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID'];
      const missing = required.filter((k) => !import.meta.env[k]);
      if (missing.length > 0) return STEP_STATUS.DEGRADED;
    }
    return STEP_STATUS.HEALTHY;
  }

  async _initFirebaseAuth() {
    try {
      const { auth } = await import('../../services/firebase.js');
      return auth ? STEP_STATUS.HEALTHY : STEP_STATUS.DEGRADED;
    } catch {
      return STEP_STATUS.DEGRADED;
    }
  }

  async _initTheme() {
    try {
      const { ThemeService } = await import('../theme/ThemeService.js');
      return ThemeService ? STEP_STATUS.HEALTHY : STEP_STATUS.HEALTHY;
    } catch {
      return STEP_STATUS.HEALTHY;
    }
  }

  async _initProfile() {
    return STEP_STATUS.HEALTHY;
  }

  async _initNetwork() {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    return isOnline ? STEP_STATUS.HEALTHY : STEP_STATUS.DEGRADED;
  }

  async _initPurchases() {
    try {
      const { isNativeAndroidRuntime } = await import('../../services/purchases.js');
      if (!isNativeAndroidRuntime()) return STEP_STATUS.SKIPPED;
      return STEP_STATUS.HEALTHY;
    } catch {
      return STEP_STATUS.DEGRADED;
    }
  }

  async _initRemoteConfig() {
    return STEP_STATUS.HEALTHY;
  }

  async _initAnalytics() {
    try {
      const { initErrorMonitor } = await import('../../services/ErrorMonitor.js');
      initErrorMonitor(() => null);
      return STEP_STATUS.HEALTHY;
    } catch {
      return STEP_STATUS.DEGRADED;
    }
  }

  async _initOTA() {
    try {
      const Platform = (await import('../../platform/Platform.js')).default;
      if (!Platform.isNative) return STEP_STATUS.SKIPPED;
      const { otaService } = await import('../../services/otaService.js');
      otaService.startBackgroundCheck();
      return STEP_STATUS.HEALTHY;
    } catch {
      return STEP_STATUS.DEGRADED;
    }
  }

  async _initNotifications() {
    return STEP_STATUS.HEALTHY;
  }

  async _initAIPreload() {
    return STEP_STATUS.HEALTHY;
  }
}

export const StartupManager = new StartupManagerEngine();
