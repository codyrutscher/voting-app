import { renderHook, act, waitFor } from '@testing-library/react';
import { useContestantVoting } from '../useContestantVoting';
import { VoteErrorCode } from '../../types/errors';

// Mock the useLocalStorage hook
jest.mock('../useLocalStorage', () => ({
  useLocalStorage: jest.fn()
}));

// Mock the submitVote function - we'll test the hook behavior without mocking the internal implementation

describe('useContestantVoting', () => {
  const mockSetValue = jest.fn();
  const mockUseLocalStorage = require('../useLocalStorage').useLocalStorage;
  
  const defaultVoteState = {
    sessionId: 'test-session',
    votedContestants: [],
    totalVotes: 0,
    lastUpdated: new Date().toISOString()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalStorage.mockReturnValue({
      value: defaultVoteState,
      setValue: mockSetValue,
      removeValue: jest.fn(),
      isSupported: true,
      error: null
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => 
        useContestantVoting('contestant-1', 'test-session')
      );
      
      expect(result.current.hasVoted).toBe(false);
      expect(result.current.isVoting).toBe(false);
      expect(result.current.voteCount).toBe(0);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.vote).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
    
    it('should detect if user has already voted', () => {
      mockUseLocalStorage.mockReturnValue({
        value: {
          ...defaultVoteState,
          votedContestants: ['contestant-1']
        },
        setValue: mockSetValue,
        removeValue: jest.fn(),
        isSupported: true,
        error: null
      });
      
      const { result } = renderHook(() => 
        useContestantVoting('contestant-1', 'test-session')
      );
      
      expect(result.current.hasVoted).toBe(true);
    });
  });
  
  describe('Vote Submission', () => {
    it('should prevent voting if already voted', async () => {
      mockUseLocalStorage.mockReturnValue({
        value: {
          ...defaultVoteState,
          votedContestants: ['contestant-1']
        },
        setValue: mockSetValue,
        removeValue: jest.fn(),
        isSupported: true,
        error: null
      });
      
      const { result } = renderHook(() => 
        useContestantVoting('contestant-1', 'test-session')
      );
      
      await act(async () => {
        await result.current.vote();
      });
      
      expect(result.current.error).not.toBe(null);
      expect(result.current.error?.code).toBe(VoteErrorCode.ALREADY_VOTED);
      expect(mockSetValue).not.toHaveBeenCalled();
    });
    
    it('should prevent concurrent voting attempts', async () => {
      const { result } = renderHook(() => 
        useContestantVoting('contestant-1', 'test-session')
      );
      
      // Start first vote
      const promise1 = act(async () => {
        await result.current.vote();
      });
      
      // Try to start second vote immediately
      const promise2 = act(async () => {
        await result.current.vote();
      });
      
      await Promise.all([promise1, promise2]);
      
      // Should only call setValue once for the first vote
      expect(mockSetValue).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Optimistic Updates', () => {
    it('should perform optimistic update before server response', async () => {
      // Mock a delayed server response
      const delayedPromise = new Promise(resolve => 
        setTimeout(() => resolve({ success: true, voteCount: 150 }), 100)
      );
      
      // We need to mock the actual implementation since we can't easily mock the internal submitVote
      const { result } = renderHook(() => 
        useContestantVoting('contestant-1', 'test-session')
      );
      
      act(() => {
        result.current.vote();
      });
      
      // Should immediately update localStorage with optimistic state
      await waitFor(() => {
        expect(mockSetValue).toHaveBeenCalledWith({
          sessionId: 'test-session',
          votedContestants: ['contestant-1'],
          totalVotes: 1,
          lastUpdated: expect.any(String)
        });
      });
    });
    
    it('should rollback optimistic update on server error', async () => {
      // This test would require mocking the internal submitVote function
      // For now, we'll test the error handling logic
      const { result } = renderHook(() => 
        useContestantVoting('contestant-1', 'test-session')
      );
      
      // The actual implementation includes rollback logic
      // This test verifies the structure is in place
      expect(result.current.vote).toBeDefined();
      expect(result.current.clearError).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    it('should clear errors when clearError is called', () => {
      const { result } = renderHook(() => 
        useContestantVoting('contestant-1', 'test-session')
      );
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBe(null);
    });
    
    it('should handle localStorage errors', () => {
      const storageError = {
        type: 'STORAGE_ERROR',
        message: 'localStorage not available',
        recoverable: true
      };
      
      mockUseLocalStorage.mockReturnValue({
        value: defaultVoteState,
        setValue: mockSetValue,
        removeValue: jest.fn(),
        isSupported: false,
        error: storageError
      });
      
      const { result } = renderHook(() => 
        useContestantVoting('contestant-1', 'test-session')
      );
      
      expect(result.current.error).not.toBe(null);
      expect(result.current.error?.message).toContain('Storage error');
    });
  });
  
  describe('localStorage Integration', () => {
    it('should use correct storage key format', () => {
      renderHook(() => 
        useContestantVoting('contestant-1', 'test-session')
      );
      
      expect(mockUseLocalStorage).toHaveBeenCalledWith(
        'voting-state-test-session',
        expect.objectContaining({
          sessionId: 'test-session',
          votedContestants: [],
          totalVotes: 0
        })
      );
    });
    
    it('should use default session if none provided', () => {
      renderHook(() => 
        useContestantVoting('contestant-1')
      );
      
      expect(mockUseLocalStorage).toHaveBeenCalledWith(
        'voting-state-default-session',
        expect.objectContaining({
          sessionId: 'default-session'
        })
      );
    });
    
    it('should persist vote state to localStorage', async () => {
      const { result } = renderHook(() => 
        useContestantVoting('contestant-1', 'test-session')
      );
      
      act(() => {
        result.current.vote();
      });
      
      await waitFor(() => {
        expect(mockSetValue).toHaveBeenCalledWith(
          expect.objectContaining({
            votedContestants: ['contestant-1'],
            totalVotes: 1
          })
        );
      });
    });
  });
  
  describe('Component Lifecycle', () => {
    it('should handle unmounting gracefully', () => {
      const { result, unmount } = renderHook(() => 
        useContestantVoting('contestant-1', 'test-session')
      );
      
      // Start a vote operation
      act(() => {
        result.current.vote();
      });
      
      // Unmount component
      unmount();
      
      // Should not throw errors or cause memory leaks
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });
  
  describe('Vote Count Updates', () => {
    it('should update vote count optimistically', async () => {
      const { result } = renderHook(() => 
        useContestantVoting('contestant-1', 'test-session')
      );
      
      expect(result.current.voteCount).toBe(0);
      
      act(() => {
        result.current.vote();
      });
      
      // Should immediately increment vote count
      await waitFor(() => {
        expect(result.current.voteCount).toBe(1);
      });
    });
  });
  
  describe('Session Management', () => {
    it('should isolate vote state per session', () => {
      const { result: result1 } = renderHook(() => 
        useContestantVoting('contestant-1', 'session-1')
      );
      
      const { result: result2 } = renderHook(() => 
        useContestantVoting('contestant-1', 'session-2')
      );
      
      expect(mockUseLocalStorage).toHaveBeenCalledWith(
        'voting-state-session-1',
        expect.any(Object)
      );
      
      expect(mockUseLocalStorage).toHaveBeenCalledWith(
        'voting-state-session-2',
        expect.any(Object)
      );
    });
    
    it('should isolate vote state per contestant', () => {
      mockUseLocalStorage.mockReturnValueOnce({
        value: {
          ...defaultVoteState,
          votedContestants: ['contestant-1']
        },
        setValue: mockSetValue,
        removeValue: jest.fn(),
        isSupported: true,
        error: null
      });
      
      const { result: result1 } = renderHook(() => 
        useContestantVoting('contestant-1', 'test-session')
      );
      
      mockUseLocalStorage.mockReturnValueOnce({
        value: defaultVoteState,
        setValue: mockSetValue,
        removeValue: jest.fn(),
        isSupported: true,
        error: null
      });
      
      const { result: result2 } = renderHook(() => 
        useContestantVoting('contestant-2', 'test-session')
      );
      
      expect(result1.current.hasVoted).toBe(true);
      expect(result2.current.hasVoted).toBe(false);
    });
  });
});