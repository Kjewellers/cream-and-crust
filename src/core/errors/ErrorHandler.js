/**
 * ErrorHandler.js
 * Unified Enterprise Error Normalizer & Dispatcher
 *
 * Enforces Phase 8 Error Architecture:
 * Every exception flows through:
 *   ErrorHandler -> ErrorMonitor -> Crashlytics -> Developer Console -> Friendly UI
 *
 * Guarantees:
 * - NO raw stack traces shown to end users
 * - NO raw Firebase/SDK error strings shown to end users
 * - NO unhandled rejections or component crashes
 */

import { captureError, captureFirebaseError, captureAPIError, captureAIError, getFriendlyMessage, CATEGORY, SEVERITY } from '../../services/ErrorMonitor.js';

class ErrorHandlerEngine {
  /**
   * Normalize any caught error into a clean user-friendly string.
   *
   * @param {Error|object|string} rawError
   * @param {string} category - One of CATEGORY constants
   * @param {object} context - Additional metadata
   * @returns {string} User-friendly message string
   */
  handle(rawError, category = CATEGORY.JS_ERROR, context = {}) {
    const errMessage = rawError?.message || String(rawError || '');

    // Format category specific error handling
    if (category === CATEGORY.FIREBASE_ERROR || errMessage.includes('firebase') || errMessage.includes('firestore')) {
      captureFirebaseError(rawError, context);
      return getFriendlyMessage(CATEGORY.FIREBASE_ERROR);
    }

    if (category === CATEGORY.API_FAILURE) {
      captureAPIError(rawError, context);
      return getFriendlyMessage(CATEGORY.API_FAILURE);
    }

    if (category === CATEGORY.AI_FAILURE) {
      captureAIError(rawError, context);
      return getFriendlyMessage(CATEGORY.AI_FAILURE);
    }

    // Default fallback capture
    captureError({
      category,
      severity: context.severity || SEVERITY.ERROR,
      message: errMessage,
      stack: rawError?.stack || '',
      currentRoute: window.location?.pathname || '/',
      ...context,
    });

    return getFriendlyMessage(category);
  }
}

export const ErrorHandler = new ErrorHandlerEngine();
