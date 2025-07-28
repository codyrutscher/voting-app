/**
 * Voting session configuration and state
 */
export interface VotingSession {
  id: string;
  isActive: boolean;
  startTime: Date;
  endTime: Date;
  maxVotesPerUser: number;
  contestants: string[]; // Array of contestant IDs
}

/**
 * User's voting state and history
 */
export interface UserVoteState {
  sessionId: string;
  votedContestants: Set<string>;
  totalVotes: number;
  lastUpdated: Date;
}

/**
 * Serializable version of UserVoteState for localStorage
 */
export interface SerializableUserVoteState {
  sessionId: string;
  votedContestants: string[];
  totalVotes: number;
  lastUpdated: string; // ISO string format
}