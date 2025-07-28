import { renderHook, act, waitFor } from '@testing-library/react';
import { usePolling } from '../usePolling';

// Mock timers
jest.useFakeTimers();

describe('usePolling', () => {
  let mockCallback: jest.Mock;
  let mockOnError: jest.Mock;
  
  beforeEach(() => {
    mockCallback = jest.fn().mockResolvedValue(undefined);
    mockOnError = jest.fn();
    jest.clearAllTimers();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() =>
        usePolling(mockCallback, { interval: 1000, enabled: false })
      );
      
      expect(result.current.isPolling).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.start).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.restart).toBe('function');
    });
  });
  
  describe('Auto-start behavior', () => {
    it('should auto-start when enabled is true', () => {
      const { result } = renderHook(() =>
        usePolling(mockCallback, { interval: 1000, enabled: true })
      );
      
      expect(result.current.isPolling).toBe(true);
    });
    
    it('should not auto-start when enabled is false', () => {
      const { result } = renderHook(() =>
        usePolling(mockCallback, { interval: 1000, enabled: false })
      );
      
      expect(result.current.isPolling).toBe(false);
    });
  });
  
  describe('Manual start/stop controls', () => {
    it('should start polling when start is called', async () => {
      const { result } = renderHook(() =>
        usePolling(mockCallback, { interval: 1000, enabled: false })
      );
      
      await act(async () => {
        result.current.start();
      });
      
      expect(result.current.isPolling).toBe(true);
    });
    
    it('should stop polling when stop is called', async () => {
      const { result } = renderHook(() =>
        usePolling(mockCallback, { interval: 1000, enabled: true })
      );
      
      expect(result.current.isPolling).toBe(true);
      
      await act(async () => {
        result.current.stop();
      });
      
      expect(result.current.isPolling).toBe(false);
    });
    
    it('should not start if already polling', () => {
      const { result } = renderHook(() =>
        usePolling(mockCallback, { interval: 1000, enabled: true })
      );
      
      expect(result.current.isPolling).toBe(true);
      
      // Try to start again
      act(() => {
        result.current.start();
      });
      
      // Should still be polling (no duplicate intervals)
      expect(result.current.isPolling).toBe(true);
    });
  });
  
  describe('Callback execution', () => {
    it('should execute callback at specified intervals', async () => {
      renderHook(() =>
        usePolling(mockCallback, { interval: 1000, enabled: true })
      );
      
      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledTimes(1);
      });
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledTimes(2);
      });
    });
    
    it('should execute callback immediately when immediate is true', async () => {
      renderHook(() =>
        usePolling(mockCallback, { 
          interval: 1000, 
          enabled: true, 
          immediate: true 
        })
      );
      
      // Should be called immediately without advancing timers
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledTimes(1);
      });
    });
    
    it('should not execute callback immediately when immediate is false', async () => {
      renderHook(() =>
        usePolling(mockCallback, { 
          interval: 1000, 
          enabled: true, 
          immediate: false 
        })
      );
      
      // Should not be called immediately
      expect(mockCallback).not.toHaveBeenCalled();
      
      // Should be called after interval
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledTimes(1);
      });
    });
  });
  
  describe('Error handling', () => {
    it('should handle callback errors and set error state', async () => {
      const error = new Error('Callback failed');
      mockCallback.mockRejectedValue(error);
      
      const { result } = renderHook(() =>
        usePolling(mockCallback, { 
          interval: 1000, 
          enabled: true,
          onError: mockOnError
        })
      );
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(result.current.error).toEqual(error);
        expect(mockOnError).toHaveBeenCalledWith(error);
      });
    });
    
    it('should clear error on successful callback execution', async () => {
      const error = new Error('Callback failed');
      mockCallback.mockRejectedValueOnce(error).mockResolvedValue(undefined);
      
      const { result } = renderHook(() =>
        usePolling(mockCallback, { interval: 1000, enabled: true })
      );
      
      // First call fails
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });
      
      // Second call succeeds
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });
    });
    
    it('should handle non-Error objects thrown by callback', async () => {
      mockCallback.mockRejectedValue('String error');
      
      const { result } = renderHook(() =>
        usePolling(mockCallback, { interval: 1000, enabled: true })
      );
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('String error');
      });
    });
    
    it('should handle errors in error handler gracefully', async () => {
      const callbackError = new Error('Callback failed');
      const handlerError = new Error('Handler failed');
      
      mockCallback.mockRejectedValue(callbackError);
      mockOnError.mockImplementation(() => {
        throw handlerError;
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { result } = renderHook(() =>
        usePolling(mockCallback, { 
          interval: 1000, 
          enabled: true,
          onError: mockOnError
        })
      );
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(result.current.error).toEqual(callbackError);
        expect(consoleSpy).toHaveBeenCalledWith('Error in polling error handler:', handlerError);
      });
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('Restart functionality', () => {
    it('should restart polling with restart method', async () => {
      const { result } = renderHook(() =>
        usePolling(mockCallback, { interval: 1000, enabled: true })
      );
      
      expect(result.current.isPolling).toBe(true);
      
      act(() => {
        result.current.restart();
      });
      
      // Should briefly stop then start again
      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
      });
    });
  });
  
  describe('Dynamic options changes', () => {
    it('should start polling when enabled changes from false to true', () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => usePolling(mockCallback, { interval: 1000, enabled }),
        { initialProps: { enabled: false } }
      );
      
      expect(result.current.isPolling).toBe(false);
      
      rerender({ enabled: true });
      
      expect(result.current.isPolling).toBe(true);
    });
    
    it('should stop polling when enabled changes from true to false', () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => usePolling(mockCallback, { interval: 1000, enabled }),
        { initialProps: { enabled: true } }
      );
      
      expect(result.current.isPolling).toBe(true);
      
      rerender({ enabled: false });
      
      expect(result.current.isPolling).toBe(false);
    });
    
    it('should restart with new interval when interval changes', async () => {
      const { result, rerender } = renderHook(
        ({ interval }) => usePolling(mockCallback, { interval, enabled: true }),
        { initialProps: { interval: 1000 } }
      );
      
      expect(result.current.isPolling).toBe(true);
      
      // Change interval
      rerender({ interval: 2000 });
      
      // Should still be polling with new interval after restart completes
      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
      });
    });
  });
  
  describe('Cleanup and memory management', () => {
    it('should cleanup interval on unmount', () => {
      const { result, unmount } = renderHook(() =>
        usePolling(mockCallback, { interval: 1000, enabled: true })
      );
      
      expect(result.current.isPolling).toBe(true);
      
      unmount();
      
      // Advance timers to ensure no callbacks are executed after unmount
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
    
    it('should not execute callback after component unmounts', async () => {
      const { unmount } = renderHook(() =>
        usePolling(mockCallback, { interval: 1000, enabled: true })
      );
      
      unmount();
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
    
    it('should not update state after component unmounts', async () => {
      const error = new Error('Test error');
      mockCallback.mockRejectedValue(error);
      
      const { result, unmount } = renderHook(() =>
        usePolling(mockCallback, { interval: 1000, enabled: true })
      );
      
      unmount();
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      // Should not cause any state updates or warnings
      expect(result.current.error).toBe(null);
    });
  });
  
  describe('Callback reference updates', () => {
    it('should use updated callback reference', async () => {
      const callback1 = jest.fn().mockResolvedValue(undefined);
      const callback2 = jest.fn().mockResolvedValue(undefined);
      
      const { rerender } = renderHook(
        ({ callback }) => usePolling(callback, { interval: 1000, enabled: true }),
        { initialProps: { callback: callback1 } }
      );
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).not.toHaveBeenCalled();
      });
      
      // Update callback
      rerender({ callback: callback2 });
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).toHaveBeenCalledTimes(1);
      });
    });
    
    it('should use updated error handler reference', async () => {
      const error = new Error('Test error');
      const onError1 = jest.fn();
      const onError2 = jest.fn();
      
      mockCallback.mockRejectedValue(error);
      
      const { rerender } = renderHook(
        ({ onError }) => usePolling(mockCallback, { 
          interval: 1000, 
          enabled: true, 
          onError 
        }),
        { initialProps: { onError: onError1 } }
      );
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(onError1).toHaveBeenCalledWith(error);
        expect(onError2).not.toHaveBeenCalled();
      });
      
      // Update error handler
      rerender({ onError: onError2 });
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(onError1).toHaveBeenCalledTimes(1);
        expect(onError2).toHaveBeenCalledWith(error);
      });
    });
  });
});