import { ReactNode, ComponentType } from 'react';
import { Contestant } from './contestant';
import { VotingSession } from './voting';
import { AppError } from './errors';

/**
 * Base component props
 */
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

/**
 * ContestantCard component props
 */
export interface ContestantCardProps extends BaseComponentProps {
  contestant: Contestant;
  hasVoted: boolean;
  isVoting: boolean;
  votingEnabled: boolean;
  onVote: () => Promise<void>;
}

/**
 * VotingInterface component props
 */
export interface VotingInterfaceProps extends BaseComponentProps {
  contestants: Contestant[];
  votingWindowActive: boolean;
  onVote: (contestantId: string) => Promise<void>;
  loading?: boolean;
  error?: AppError | null;
}

/**
 * ErrorBoundary component props
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Error fallback component props
 */
export interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
  resetError: () => void;
}

/**
 * Loading spinner component props
 */
export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}