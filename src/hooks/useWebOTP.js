import { useEffect } from 'react';

/**
 * Custom hook to auto-read incoming SMS OTP via the WebOTP API on Android & supported mobile WebViews.
 * 
 * @param {boolean} active - Whether the OTP listener should be active.
 * @param {function(string): void} onOtpReceived - Callback invoked with the 6-digit OTP code when received.
 */
export function useWebOTP(active, onOtpReceived) {
  useEffect(() => {
    if (!active || typeof window === 'undefined' || !('OTPCredential' in window)) {
      return;
    }

    const abortController = new AbortController();

    navigator.credentials
      .get({
        otp: { transport: ['sms'] },
        signal: abortController.signal,
      })
      .then((otpCredential) => {
        if (otpCredential && otpCredential.code) {
          console.log('[WebOTP] Auto-read SMS OTP code:', otpCredential.code);
          const cleanCode = String(otpCredential.code).replace(/\D/g, '').slice(0, 6);
          if (cleanCode.length === 6) {
            onOtpReceived(cleanCode);
          }
        }
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          console.warn('[WebOTP] Auto-read listener notice:', err?.message || err);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [active, onOtpReceived]);
}
