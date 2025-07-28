import { useCallback, useEffect, useRef, useState } from 'react';
import { UsePollingOptions, UsePollingReturn } from '../types/hooks';

/**
 * Custom hook for managing polling operations with configurable intervals
 * Provides start/stop controls, error handling, and automatic cleanup
 * 
 * @param callback - The function to execute on each poll
 * @param options - Configuration options for polling behavior
 * @returns Polling state and control functions
 */
export function usePolling(
  callback: () => Promise<void>,
  options: UsePollingOptions
): UsePollingReturn {
  const { interval, enabled, onError, immediate = false } = options;
  
  // State management
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs for managing intervals and preventing memory leaks
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const callbackRef = useRef(callback);
  const onErrorRef = useRef(onError);
  
  // Update refs when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  // Execute polling callback with error handling
  const executeCallback = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      await callbackRef.current();
      
      // Clear any previous errors on successful execution
      if (isMountedRef.current) {
        setError(prevError => prevError ? null : prevError);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      setError(errorInstance);
      
      // Call error handler if provided
      if (onErrorRef.current) {
        try {
          onErrorRef.current(errorInstance);
        } catch (handlerError) {
          console.error('Error in polling error handler:', handlerError);
        }
      }
    }
  }, []);
  
  // Start polling
  const start = useCallback(() => {
    if (!isMountedRef.current) return;
    
    // Check if already polling and return early
    if (intervalRef.current) return;
    
    setIsPolling(true);
    setError(null);
    
    // Execute immediately if requested
    if (immediate) {
      executeCallback();
    }
    
    // Set up interval
    intervalRef.current = setInterval(() => {
      executeCallback();
    }, interval);
  }, [interval, immediate, executeCallback]);
  
  // Stop polling
  const stop = useCallback(() => {
    if (!isMountedRef.current) return;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsPolling(false);
  }, []);
  
  // Restart polling (stop then start)
  const restart = useCallback(() => {
    stop();
    // Use setTimeout to ensure stop completes before start
    setTimeout(() => {
      if (isMountedRef.current) {
        start();
      }
    }, 0);
  }, [start, stop]);
  
  // Auto-start/stop based on enabled option
  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }
  }, [enabled, start, stop]);
  
  // Handle interval changes
  useEffect(() => {
    if (isPolling) {
      // Restart with new interval
      restart();
    }
  }, [interval, isPolling, restart]); // Don't include restart in deps to avoid infinite loop
  
  return {
    isPolling,
    error,
    start,
    stop,
    restart
  };
}