import { useState, useCallback, useEffect, useRef } from 'react';
import { UseContestantVotingReturn } from '../types/hooks';
import { VoteError, ErrorType, VoteErrorCode } from '../types/errors';
import { SerializableUserVoteState } from '../types/voting';
import { useLocalStorage } from './useLocalStorage';

/**
 * Mock API function for vote submission
 * In a real implementation, this would make an HTTP request
 */
const submitVote = async (contestantId: string): Promise<{ success: boolean; voteCount: number; error?: string }> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // Simulate occasional failures (10% chance)
  if (Math.random() < 0.1) {
    throw new Error('Network error: Failed to submit vote');
  }
  
  // Simulate vote limit exceeded (5% chance)
  if (Math.random() < 0.05) {
    return {
      success: false,
      voteCount: 0,
      error: 'VOTE_LIMIT_EXCEEDED'
    };
  }
  
  // Simulate successful vote
  return {
    success: true,
    voteCount: Math.floor(Math.random() * 1000) + 100
  };
};

/**
 * Custom hook for managing voting state for a specific contestant
 * Provides isolated state per contestant with localStorage persistence
 * 
 * @param contestantId - The ID of the contestant
 * @param sessionId - The current voting session ID
 * @returns Voting state and actions for the contestant
 */
export function useContestantVoting(
  contestantId: string,
  sessionId: string = 'default-session'
): UseContestantVotingReturn {
  // Local state for voting process
  const [isVoting, setIsVoting] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [error, setError] = useState<VoteError | null>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // localStorage integration for vote persistence
  const storageKey = `voting-state-${sessionId}`;
  const defaultVoteState: SerializableUserVoteState = {
    sessionId,
    votedContestants: [],
    totalVotes: 0,
    lastUpdated: new Date().toISOString()
  };
  
  const { value: voteState, setValue: setVoteState, error: storageError } = useLocalStorage(
    storageKey,
    defaultVoteState
  );
  
  // Check if user has already voted for this contestant
  const hasVoted = voteState.votedContestants.includes(contestantId);
  
  // Clear error handler
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Create vote error helper
  const createVoteError = useCallback((
    code: VoteErrorCode,
    message: string,
    retryAction?: () => void
  ): VoteError => ({
    type: ErrorType.VOTE_ERROR,
    code,
    message,
    recoverable: !!retryAction,
    retryAction,
    contestantId,
    details: { contestantId, sessionId }
  }), [contestantId, sessionId]);
  
  // Vote submission handler with optimistic updates
  const vote = useCallback(async (): Promise<void> => {
    // Prevent voting if already voted
    if (hasVoted) {
      const error = createVoteError(
        VoteErrorCode.ALREADY_VOTED,
        'You have already voted for this contestant'
      );
      setError(error);
      return;
    }
    
    // Prevent concurrent voting attempts
    if (isVoting) {
      return;
    }
    
    setIsVoting(true);
    setError(null);
    
    // Store original state for rollback
    const originalVoteState = voteState;
    const originalVoteCount = voteCount;
    
    try {
      // Optimistic update - immediately update UI
      const optimisticVoteState: SerializableUserVoteState = {
        ...voteState,
        votedContestants: [...voteState.votedContestants, contestantId],
        totalVotes: voteState.totalVotes + 1,
        lastUpdated: new Date().toISOString()
      };
      
      setVoteState(optimisticVoteState);
      setVoteCount(prev => prev + 1);
      
      // Submit vote to server
      const response = await submitVote(contestantId);
      
      // Check if component is still mounted
      if (!isMountedRef.current) return;
      
      if (response.success) {
        // Update with actual vote count from server
        setVoteCount(response.voteCount);
      } else {
        // Handle server-side errors
        let errorCode: VoteErrorCode;
        let errorMessage: string;
        
        switch (response.error) {
          case 'VOTE_LIMIT_EXCEEDED':
            errorCode = VoteErrorCode.VOTE_LIMIT_EXCEEDED;
            errorMessage = 'You have reached your voting limit';
            break;
          case 'VOTING_CLOSED':
            errorCode = VoteErrorCode.VOTING_CLOSED;
            errorMessage = 'Voting window has closed';
            break;
          case 'CONTESTANT_INACTIVE':
            errorCode = VoteErrorCode.CONTESTANT_INACTIVE;
            errorMessage = 'This contestant is no longer active';
            break;
          default:
            errorCode = VoteErrorCode.INVALID_CONTESTANT;
            errorMessage = response.error || 'Failed to submit vote';
        }
        
        // Rollback optimistic update
        setVoteState(originalVoteState);
        setVoteCount(originalVoteCount);
        
        const error = createVoteError(errorCode, errorMessage, vote);
        setError(error);
      }
    } catch (err) {
      // Check if component is still mounted
      if (!isMountedRef.current) return;
      
      // Rollback optimistic update
      setVoteState(originalVoteState);
      setVoteCount(originalVoteCount);
      
      // Handle network errors
      const error = createVoteError(
        VoteErrorCode.NETWORK_FAILURE,
        err instanceof Error ? err.message : 'Network error occurred',
        vote
      );
      setError(error);
    } finally {
      if (isMountedRef.current) {
        setIsVoting(false);
      }
    }
  }, [
    hasVoted,
    isVoting,
    voteState,
    voteCount,
    contestantId,
    setVoteState,
    createVoteError
  ]);
  
  // Handle storage errors by converting them to vote errors
  useEffect(() => {
    if (storageError && !error) {
      const voteError = createVoteError(
        VoteErrorCode.NETWORK_FAILURE,
        `Storage error: ${storageError.message}`,
        clearError
      );
      setError(voteError);
    }
  }, [storageError, error, createVoteError, clearError]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return {
    hasVoted,
    isVoting,
    voteCount,
    vote,
    error,
    clearError
  };
}