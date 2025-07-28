import { Contestant } from './contestant';
import { VotingSession, UserVoteState } from './voting';

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

/**
 * Vote submission response
 */
export interface VoteResponse {
  success: boolean;
  contestant: Contestant;
  userVoteState: UserVoteState;
  error?: string;
}

/**
 * Contestants data response
 */
export interface ContestantsResponse {
  contestants: Contestant[];
  session: VotingSession;
  timestamp: Date;
}

/**
 * Vote submission request payload
 */
export interface VoteRequest {
  contestantId: string;
  sessionId: string;
  userId?: string; // Optional for anonymous voting
}

/**
 * Polling update response
 */
export interface PollingUpdateResponse {
  contestants: Contestant[];
  session: VotingSession;
  hasChanges: boolean;
  timestamp: Date;
}