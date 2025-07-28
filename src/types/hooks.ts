import { AppError, VoteError } from './errors';
import { UserVoteState, VotingSession } from './voting';
import { Contestant } from './contestant';

/**
 * useContestantVoting hook return type
 */
export interface UseContestantVotingReturn {
  hasVoted: boolean;
  isVoting: boolean;
  voteCount: number;
  vote: () => Promise<void>;
  error: VoteError | null;
  clearError: () => void;
}

/**
 * useLocalStorage hook return type
 */
export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
  isSupported: boolean;
  error: AppError | null;
}

/**
 * usePolling hook options
 */
export interface UsePollingOptions {
  interval: number;
  enabled: boolean;
  onError?: (error: Error) => void;
  immediate?: boolean; // Whether to run immediately on start
}

/**
 * usePolling hook return type
 */
export interface UsePollingReturn {
  isPolling: boolean;
  error: Error | null;
  start: () => void;
  stop: () => void;
  restart: () => void;
}

/**
 * useResponsive hook return type
 */
export interface UseResponsiveReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenSize: 'mobile' | 'tablet' | 'desktop';
  width: number;
  height: number;
}

/**
 * useVotingSession hook return type
 */
export interface UseVotingSessionReturn {
  session: VotingSession | null;
  contestants: Contestant[];
  userVoteState: UserVoteState;
  loading: boolean;
  error: AppError | null;
  refreshSession: () => Promise<void>;
}

/**
 * useErrorBoundary hook return type
 */
export interface UseErrorBoundaryReturn {
  showBoundary: (error: Error) => void;
  resetBoundary: () => void;
}