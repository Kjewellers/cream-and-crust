/**
 * devLogger.js
 *
 * Secure Internal Logging Engine for Cream AI.
 * Logs technical tracebacks and diagnostic details strictly to internal dev console.
 * User UI only receives clean, professional, non-technical feedback.
 */

export function devLogAIError(context, error) {
  if (process.env.NODE_ENV !== 'production') {
    console.group(`[DEV-AI-LOG] ${context}`);
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error Message:', error?.message || error);
    if (error?.stack) console.error('Stack Trace:', error.stack);
    console.groupEnd();
  }
}

export function devLogAIInfo(context, details) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV-AI-LOG] ${context}:`, details);
  }
}

/**
 * Returns a user-friendly error message that masks all technical complexity.
 */
export function getUserFriendlyErrorMessage() {
  return "Cream AI encountered a temporary request issue. Please try again or rephrase your request.";
}
