import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

// Mock window object for SSR testing
const mockWindow = global.window;

describe('useLocalStorage', () => {
  beforeEach(() => {
    // Reset localStorage mock
    (window.localStorage.getItem as jest.Mock).mockClear();
    (window.localStorage.setItem as jest.Mock).mockClear();
    (window.localStorage.removeItem as jest.Mock).mockClear();
    
    // Reset event listener mocks
    (window.addEventListener as jest.Mock).mockClear();
    (window.removeEventListener as jest.Mock).mockClear();
  });

  afterEach(() => {
    global.window = mockWindow;
  });

  describe('Basic functionality', () => {
    it('should return default value when localStorage is empty', () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      
      expect(result.current.value).toBe('default');
      expect(result.current.isSupported).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should return stored value when localStorage has data', () => {
      const storedValue = { name: 'John', age: 30 };
      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(storedValue));
      
      const { result } = renderHook(() => useLocalStorage('user', {}));
      
      expect(result.current.value).toEqual(storedValue);
    });

    it('should set value in localStorage and update state', () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
      
      const { result } = renderHook(() => useLocalStorage('counter', 0));
      
      act(() => {
        result.current.setValue(5);
      });
      
      expect(result.current.value).toBe(5);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('counter', '5');
    });

    it('should support functional updates', () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue('10');
      
      const { result } = renderHook(() => useLocalStorage('counter', 0));
      
      act(() => {
        result.current.setValue(prev => prev + 5);
      });
      
      expect(result.current.value).toBe(15);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('counter', '15');
    });

    it('should remove value and reset to default', () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue('"stored-value"');
      
      const { result } = renderHook(() => useLocalStorage('test', 'default'));
      
      act(() => {
        result.current.removeValue();
      });
      
      expect(result.current.value).toBe('default');
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('test');
    });
  });

  describe('Error handling', () => {
    it('should handle localStorage unavailability gracefully', () => {
      // Mock localStorage to throw error during support check
      const originalSetItem = window.localStorage.setItem;
      (window.localStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      const { result } = renderHook(() => useLocalStorage('test', 'default'));
      
      expect(result.current.isSupported).toBe(false);
      expect(result.current.value).toBe('default');
      
      // Restore original implementation
      window.localStorage.setItem = originalSetItem;
    });

    it('should handle JSON parse errors', async () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue('invalid-json');
      
      const { result } = renderHook(() => useLocalStorage('test', 'default'));
      
      // Wait for the useEffect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.value).toBe('default');
      expect(result.current.error).toEqual({
        type: 'STORAGE_ERROR',
        message: 'Failed to parse localStorage value for key "test"',
        recoverable: true,
        retryAction: expect.any(Function)
      });
    });

    it('should handle setItem errors', () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
      (window.localStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const { result } = renderHook(() => useLocalStorage('test', 'default'));
      
      act(() => {
        result.current.setValue('new-value');
      });
      
      expect(result.current.error).toEqual({
        type: 'STORAGE_ERROR',
        message: 'Failed to save value to localStorage for key "test"',
        recoverable: true,
        retryAction: expect.any(Function)
      });
    });

    it('should handle removeItem errors', () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue('"value"');
      (window.localStorage.removeItem as jest.Mock).mockImplementation(() => {
        throw new Error('Remove failed');
      });
      
      const { result } = renderHook(() => useLocalStorage('test', 'default'));
      
      act(() => {
        result.current.removeValue();
      });
      
      expect(result.current.error).toEqual({
        type: 'STORAGE_ERROR',
        message: 'Failed to remove value from localStorage for key "test"',
        recoverable: true,
        retryAction: expect.any(Function)
      });
    });

    it('should clear error when retry action is called', async () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue('invalid-json');
      
      const { result } = renderHook(() => useLocalStorage('test', 'default'));
      
      // Wait for the useEffect to run and set the error
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.error).not.toBe(null);
      
      act(() => {
        result.current.error?.retryAction?.();
      });
      
      expect(result.current.error).toBe(null);
    });
  });

  describe('Cross-tab synchronization', () => {
    it('should register storage event listener', () => {
      renderHook(() => useLocalStorage('test', 'default'));
      
      expect(window.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should remove storage event listener on unmount', () => {
      const { unmount } = renderHook(() => useLocalStorage('test', 'default'));
      
      unmount();
      
      expect(window.removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should update value when storage event occurs', () => {
      const { result } = renderHook(() => useLocalStorage('test', 'default'));
      
      // Get the storage event handler
      const storageHandler = (window.addEventListener as jest.Mock).mock.calls[0][1];
      
      // Simulate storage event from another tab
      const storageEvent = {
        key: 'test',
        newValue: '"updated-value"',
        oldValue: '"old-value"'
      };
      
      act(() => {
        storageHandler(storageEvent);
      });
      
      expect(result.current.value).toBe('updated-value');
    });

    it('should reset to default when key is removed in another tab', () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue('"initial-value"');
      
      const { result } = renderHook(() => useLocalStorage('test', 'default'));
      
      // Get the storage event handler
      const storageHandler = (window.addEventListener as jest.Mock).mock.calls[0][1];
      
      // Simulate key removal from another tab
      const storageEvent = {
        key: 'test',
        newValue: null,
        oldValue: '"initial-value"'
      };
      
      act(() => {
        storageHandler(storageEvent);
      });
      
      expect(result.current.value).toBe('default');
    });

    it('should ignore storage events for different keys', () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue('"initial-value"');
      
      const { result } = renderHook(() => useLocalStorage('test', 'default'));
      
      // Get the storage event handler
      const storageHandler = (window.addEventListener as jest.Mock).mock.calls[0][1];
      
      // Simulate storage event for different key
      const storageEvent = {
        key: 'other-key',
        newValue: '"other-value"',
        oldValue: null
      };
      
      act(() => {
        storageHandler(storageEvent);
      });
      
      expect(result.current.value).toBe('initial-value');
    });

    it('should handle JSON parse errors in storage events', () => {
      const { result } = renderHook(() => useLocalStorage('test', 'default'));
      
      // Get the storage event handler
      const storageHandler = (window.addEventListener as jest.Mock).mock.calls[0][1];
      
      // Simulate storage event with invalid JSON
      const storageEvent = {
        key: 'test',
        newValue: 'invalid-json',
        oldValue: null
      };
      
      act(() => {
        storageHandler(storageEvent);
      });
      
      expect(result.current.error).toEqual({
        type: 'STORAGE_ERROR',
        message: 'Failed to sync localStorage value for key "test"',
        recoverable: true,
        retryAction: expect.any(Function)
      });
    });
  });

  describe('SSR compatibility', () => {
    it('should handle server-side rendering without window', () => {
      // Mock window as undefined
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      
      const { result } = renderHook(() => useLocalStorage('test', 'default'));
      
      expect(result.current.value).toBe('default');
      expect(result.current.isSupported).toBe(false); // Should be false without window
      
      // Restore window
      global.window = originalWindow;
    });

    it('should initialize support check on client side', () => {
      const { result, rerender } = renderHook(() => useLocalStorage('test', 'default'));
      
      // Should be supported when window is available
      expect(result.current.isSupported).toBe(true);
      
      // After rerender, should maintain support status
      rerender();
      expect(result.current.isSupported).toBe(true);
    });
  });

  describe('Type safety', () => {
    it('should work with string values', () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue('"hello"');
      
      const { result } = renderHook(() => useLocalStorage('string-key', 'default'));
      
      expect(result.current.value).toBe('hello');
      expect(typeof result.current.value).toBe('string');
    });

    it('should work with number values', () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue('42');
      
      const { result } = renderHook(() => useLocalStorage('number-key', 0));
      
      expect(result.current.value).toBe(42);
      expect(typeof result.current.value).toBe('number');
    });

    it('should work with object values', () => {
      const obj = { name: 'John', age: 30 };
      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(obj));
      
      const { result } = renderHook(() => useLocalStorage('object-key', {}));
      
      expect(result.current.value).toEqual(obj);
      expect(typeof result.current.value).toBe('object');
    });

    it('should work with array values', () => {
      const arr = [1, 2, 3];
      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(arr));
      
      const { result } = renderHook(() => useLocalStorage('array-key', []));
      
      expect(result.current.value).toEqual(arr);
      expect(Array.isArray(result.current.value)).toBe(true);
    });

    it('should work with boolean values', () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue('true');
      
      const { result } = renderHook(() => useLocalStorage('boolean-key', false));
      
      expect(result.current.value).toBe(true);
      expect(typeof result.current.value).toBe('boolean');
    });
  });
});