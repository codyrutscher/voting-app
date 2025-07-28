/**
 * Core contestant interface representing a participant in the voting system
 */
export interface Contestant {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  voteCount: number;
  isActive: boolean;
  category?: string;
}

/**
 * Contestant data for API responses and internal state management
 */
export interface ContestantData extends Contestant {
  lastUpdated: Date;
}