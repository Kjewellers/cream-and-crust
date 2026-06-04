/**
 * useAsyncOperation — run an async op with a hard timeout and standard
 * idle/pending/success/error transitions, so loaders never hang forever and
 * the view stays interactive on failure.
 *
 * Requirements: 1.7 (rejections surface a message, view stays interactive),
 * 1.8 / 1.10 (resolve to success/error within 15s), 20.6, 20.7.
 */
import { useCallback, useRef, useState } from 'react';

export class TimeoutError extends Error {
  constructor(ms) {
    super(`Operation timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Race a promise against a timeout. Rejects with TimeoutError if `promise`
 * does not settle within `ms`. Pure helper (no React), so it is unit-testable.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms = 15000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {{ run: (fn: () => Promise<any>) => Promise<any>, status: string, error: Error|null, data: any, reset: () => void }}
 */
export function useAsyncOperation({ timeoutMs = 15000 } = {}) {
  const [status, setStatus] = useState('idle'); // idle | pending | success | error
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const mounted = useRef(true);

  const run = useCallback(
    async (fn) => {
      setStatus('pending');
      setError(null);
      try {
        const result = await withTimeout(Promise.resolve().then(fn), timeoutMs);
        if (mounted.current) {
          setData(result);
          setStatus('success');
        }
        return result;
      } catch (e) {
        if (mounted.current) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setStatus('error');
        }
        throw e;
      }
    },
    [timeoutMs]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setData(null);
  }, []);

  return { run, status, error, data, reset };
}

export default useAsyncOperation;
