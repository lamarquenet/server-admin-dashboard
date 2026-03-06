import { useEffect, useRef } from 'react';

/**
 * Custom hook for setting up intervals that properly handle callback changes
 * and clean up on unmount. This prevents memory leaks from stale intervals.
 * 
 * @param {Function} callback - The function to call on each interval
 * @param {number|null} delay - The interval delay in ms, or null to pause
 * @param {Array} deps - Additional dependencies that should trigger interval reset
 */
export const useInterval = (callback, delay, deps = []) => {
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay, ...deps]);
};

export default useInterval;
