/**
 * Error types for consistent error handling across the application
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  COMPONENT_ERROR = 'COMPONENT_ERROR',
  VOTE_ERROR = 'VOTE_ERROR',
  POLLING_ERROR = 'POLLING_ERROR',
  SESSION_ERROR = 'SESSION_ERROR'
}

/**
 * Application error interface with recovery options
 */
export interface AppError {
  type: ErrorType;
  message: string;
  recoverable: boolean;
  retryAction?: () => void;
  details?: Record<string, any>;
}

/**
 * Vote-specific error types
 */
export enum VoteErrorCode {
  ALREADY_VOTED = 'ALREADY_VOTED',
  VOTE_LIMIT_EXCEEDED = 'VOTE_LIMIT_EXCEEDED',
  VOTING_CLOSED = 'VOTING_CLOSED',
  CONTESTANT_INACTIVE = 'CONTESTANT_INACTIVE',
  INVALID_CONTESTANT = 'INVALID_CONTESTANT',
  NETWORK_FAILURE = 'NETWORK_FAILURE'
}

/**
 * Vote error with specific error codes
 */
export interface VoteError extends AppError {
  type: ErrorType.VOTE_ERROR;
  code: VoteErrorCode;
  contestantId?: string;
}