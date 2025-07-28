import { useState, useEffect, useCallback, useRef } from 'react';
import { UseLocalStorageReturn } from '../types/hooks';
import { AppError } from '../types/errors';

/**
 * Custom hook for managing localStorage with serialization, error handling, and cross-tab sync
 * @param key - The localStorage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns Object with value, setValue, removeValue, isSupported, and error
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): UseLocalStorageReturn<T> {
  const [error, setError] = useState<AppError | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const isInitialized = useRef(false);

  // Check if localStorage is supported
  const checkSupport = useCallback((): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      const testKey = '__localStorage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Initialize state with value from localStorage or default
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (err) {
      return defaultValue;
    }
  });

  // Initialize support check and handle initial parsing errors
  useEffect(() => {
    if (!isInitialized.current && typeof window !== 'undefined') {
      const supported = checkSupport();
      setIsSupported(supported);
      
      if (supported) {
        try {
          const item = window.localStorage.getItem(key);
          if (item !== null) {
            const parsedValue = JSON.parse(item);
            setValue(parsedValue);
          }
        } catch (err) {
          setError({
            type: 'STORAGE_ERROR',
            message: `Failed to parse localStorage value for key "${key}"`,
            recoverable: true,
            retryAction: () => setError(null)
          });
        }
      }
      
      isInitialized.current = true;
    }
  }, [key, checkSupport]);

  // Handle storage events for cross-tab synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue);
          setValue(newValue);
          setError(null);
        } catch (err) {
          setError({
            type: 'STORAGE_ERROR',
            message: `Failed to sync localStorage value for key "${key}"`,
            recoverable: true,
            retryAction: () => setError(null)
          });
        }
      } else if (e.key === key && e.newValue === null) {
        // Key was removed in another tab
        setValue(defaultValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, defaultValue]);

  // Set value in localStorage and state
  const setStoredValue = useCallback((newValue: T | ((prev: T) => T)) => {
    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      setValue(valueToStore);
      
      if (isSupported && typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
      
      setError(null);
    } catch (err) {
      setError({
        type: 'STORAGE_ERROR',
        message: `Failed to save value to localStorage for key "${key}"`,
        recoverable: true,
        retryAction: () => setError(null)
      });
    }
  }, [key, value, isSupported]);

  // Remove value from localStorage and reset to default
  const removeValue = useCallback(() => {
    try {
      setValue(defaultValue);
      
      if (isSupported && typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      
      setError(null);
    } catch (err) {
      setError({
        type: 'STORAGE_ERROR',
        message: `Failed to remove value from localStorage for key "${key}"`,
        recoverable: true,
        retryAction: () => setError(null)
      });
    }
  }, [key, defaultValue, isSupported]);

  return {
    value,
    setValue: setStoredValue,
    removeValue,
    isSupported,
    error
  };
}