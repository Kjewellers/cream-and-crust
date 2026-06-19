/**
 * Wraps a promise with a timeout. If the promise does not resolve within `ms` milliseconds,
 * it rejects with a specific 'auth/timeout' error.
 * 
 * @param {Promise} promise - The auth promise to wrap
 * @param {number} ms - Timeout in milliseconds (default: 12000)
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise}
 */
export const withAuthTimeout = (promise, ms = 12000, operationName = 'Auth Operation') => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        const err = new Error(`${operationName} timed out after ${ms}ms`);
        err.code = 'auth/timeout';
        reject(err);
      }, ms);
    })
  ]);
};
