/**
 * useFirestoreSubscription — resilient Firestore subscription hook.
 *
 * Gates the subscription on a valid uid, handles errors gracefully (sets
 * loading to false so the page renders instead of hanging), and includes a
 * safety timeout so the loader never hangs forever.
 *
 * This eliminates the "Try again" / error boundary flash that occurred when
 * pages subscribed before Firebase auth had validated the token.
 */
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const SAFETY_TIMEOUT = 8000;

/**
 * @param {(uid: string, onData: Function, onError?: Function) => Function} subscribeFn
 *   A Firestore subscription function that takes (callback, uid, errorCallback?)
 *   and returns an unsubscribe function.
 * @param {{ transform?: Function }} [opts]
 * @returns {{ data: any, loading: boolean, error: Error|null }}
 */
export function useFirestoreSubscription(subscribeFn, { transform } = {}) {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const safetyRef = useRef(null);

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) {
      // No user yet — keep loading but don't hang forever.
      safetyRef.current = setTimeout(() => setLoading(false), SAFETY_TIMEOUT);
      return () => clearTimeout(safetyRef.current);
    }

    setLoading(true);
    setError(null);
    safetyRef.current = setTimeout(() => setLoading(false), SAFETY_TIMEOUT);

    const unsub = subscribeFn(
      (result) => {
        clearTimeout(safetyRef.current);
        setData(transform ? transform(result) : result);
        setLoading(false);
      },
      uid,
      (err) => {
        clearTimeout(safetyRef.current);
        console.error('Subscription error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(safetyRef.current);
      if (typeof unsub === 'function') unsub();
    };
  }, [currentUser?.uid]);

  return { data, loading, error };
}

export default useFirestoreSubscription;
