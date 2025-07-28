import { Contestant } from '../types/contestant';
import { VotingSession, UserVoteState } from '../types/voting';
import { VoteRequest, VoteResponse, ContestantsResponse, PollingUpdateResponse } from '../types/api';

/**
 * Mock contestant data
 */
export const mockContestants: Contestant[] = [
  {
    id: 'contestant-1',
    name: 'Sarah Johnson',
    imageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
    description: 'Professional singer from Nashville with a powerful voice and stage presence.',
    voteCount: 1247,
    isActive: true,
    category: 'Music',
  },
  {
    id: 'contestant-2',
    name: 'Marcus Chen',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    description: 'Contemporary dancer and choreographer known for innovative performances.',
    voteCount: 892,
    isActive: true,
    category: 'Dance',
  },
  {
    id: 'contestant-3',
    name: 'Emma Rodriguez',
    imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    description: 'Stand-up comedian with sharp wit and relatable storytelling.',
    voteCount: 1156,
    isActive: true,
    category: 'Comedy',
  },
  {
    id: 'contestant-4',
    name: 'David Thompson',
    imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    description: 'Magician specializing in close-up magic and mind-bending illusions.',
    voteCount: 743,
    isActive: true,
    category: 'Magic',
  },
  {
    id: 'contestant-5',
    name: 'Aisha Patel',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    description: 'Acrobat and aerial performer with breathtaking stunts and grace.',
    voteCount: 1034,
    isActive: true,
    category: 'Acrobatics',
  },
  {
    id: 'contestant-6',
    name: 'Jake Williams',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    description: 'Multi-instrumentalist and songwriter with original compositions.',
    voteCount: 567,
    isActive: true,
    category: 'Music',
  },
  {
    id: 'contestant-7',
    name: 'Luna Martinez',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    description: 'Spoken word artist and poet with powerful social commentary.',
    voteCount: 423,
    isActive: false, // Inactive contestant for testing
    category: 'Poetry',
  },
  {
    id: 'contestant-8',
    name: 'Ryan O\'Connor',
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
    description: 'Beatboxer and vocal percussionist with incredible range and creativity.',
    voteCount: 789,
    isActive: true,
    category: 'Music',
  },
];

/**
 * Mock voting session
 */
export const mockVotingSession: VotingSession = {
  id: 'session-2025-finale',
  isActive: true,
  startTime: new Date('2025-07-28T00:00:00Z'),
  endTime: new Date('2025-07-29T23:59:59Z'),
  maxVotesPerUser: 3,
  contestants: mockContestants.map(c => c.id),
};

/**
 * Mock data service class
 */
export class MockDataService {
  private contestants: Contestant[] = [...mockContestants];
  private session: VotingSession = { ...mockVotingSession };
  private userVotes: Map<string, Set<string>> = new Map();
  private lastUpdateTime: Date = new Date();

  constructor() {
    // Load persisted votes from localStorage on initialization
    this.loadPersistedVotes();
  }

  /**
   * Load votes from localStorage
   */
  private loadPersistedVotes(): void {
    if (typeof window === 'undefined') return; // Skip on server-side

    try {
      const storedVotes = localStorage.getItem(`voting-app-votes-${this.session.id}`);
      if (storedVotes) {
        const votesData = JSON.parse(storedVotes);
        this.userVotes = new Map(
          Object.entries(votesData).map(([userId, votes]) => [
            userId,
            new Set(votes as string[])
          ])
        );
      }
    } catch (error) {
      console.warn('Failed to load persisted votes:', error);
    }
  }

  /**
   * Save votes to localStorage
   */
  private saveVotesToStorage(): void {
    if (typeof window === 'undefined') return; // Skip on server-side

    try {
      const votesData: Record<string, string[]> = {};
      this.userVotes.forEach((votes, userId) => {
        votesData[userId] = Array.from(votes);
      });
      localStorage.setItem(`voting-app-votes-${this.session.id}`, JSON.stringify(votesData));
    } catch (error) {
      console.warn('Failed to save votes to storage:', error);
    }
  }

  /**
   * Simulate network delay
   */
  private async delay(ms: number = 300 + Math.random() * 700): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Simulate random errors
   */
  private simulateError(errorRate: number = 0.05): void {
    if (Math.random() < errorRate) {
      const errors = [
        'Network timeout',
        'Server temporarily unavailable',
        'Rate limit exceeded',
        'Invalid request format',
      ];
      throw new Error(errors[Math.floor(Math.random() * errors.length)]);
    }
  }

  /**
   * Get all contestants and session data
   */
  async getContestants(): Promise<ContestantsResponse> {
    await this.delay();
    this.simulateError(0.02); // 2% error rate

    return {
      contestants: this.contestants,
      session: this.session,
      timestamp: new Date(),
    };
  }

  /**
   * Submit a vote for a contestant
   */
  async submitVote(voteRequest: VoteRequest): Promise<VoteResponse> {
    await this.delay(500 + Math.random() * 1000); // Longer delay for vote submission
    this.simulateError(0.08); // 8% error rate for votes

    const { contestantId, sessionId, userId = 'anonymous' } = voteRequest;

    // Validate session
    if (sessionId !== this.session.id) {
      throw new Error('Invalid session ID');
    }

    if (!this.session.isActive) {
      throw new Error('Voting session is not active');
    }

    // Check if voting window is open
    const now = new Date();
    if (now < this.session.startTime || now > this.session.endTime) {
      throw new Error('Voting window is closed');
    }

    // Find contestant
    const contestant = this.contestants.find(c => c.id === contestantId);
    if (!contestant) {
      throw new Error('Contestant not found');
    }

    if (!contestant.isActive) {
      throw new Error('Contestant is not active');
    }

    // Check user vote limits
    const userVoteSet = this.userVotes.get(userId) || new Set();
    
    if (userVoteSet.has(contestantId)) {
      throw new Error('You have already voted for this contestant');
    }

    if (userVoteSet.size >= this.session.maxVotesPerUser) {
      throw new Error('You have reached your voting limit');
    }

    // Record the vote
    userVoteSet.add(contestantId);
    this.userVotes.set(userId, userVoteSet);

    // Save votes to localStorage for persistence
    this.saveVotesToStorage();

    // Update contestant vote count
    contestant.voteCount += 1;
    this.lastUpdateTime = new Date();

    // Create user vote state
    const userVoteState: UserVoteState = {
      sessionId: this.session.id,
      votedContestants: userVoteSet,
      totalVotes: userVoteSet.size,
      lastUpdated: new Date(),
    };

    return {
      success: true,
      contestant,
      userVoteState,
    };
  }

  /**
   * Get current voting session
   */
  async getVotingSession(): Promise<VotingSession> {
    await this.delay();
    this.simulateError(0.01); // 1% error rate

    return { ...this.session };
  }

  /**
   * Poll for updates
   */
  async pollUpdates(since?: Date): Promise<PollingUpdateResponse> {
    await this.delay(200 + Math.random() * 300); // Faster for polling
    this.simulateError(0.03); // 3% error rate

    const hasChanges = !since || this.lastUpdateTime > since;

    // Simulate vote count changes
    if (hasChanges && Math.random() < 0.3) {
      const randomContestant = this.contestants[Math.floor(Math.random() * this.contestants.length)];
      if (randomContestant.isActive) {
        randomContestant.voteCount += Math.floor(Math.random() * 5) + 1;
        this.lastUpdateTime = new Date();
      }
    }

    return {
      contestants: this.contestants,
      session: this.session,
      hasChanges,
      timestamp: new Date(),
    };
  }

  /**
   * Get user vote state
   */
  async getUserVoteState(sessionId: string, userId: string = 'anonymous'): Promise<UserVoteState> {
    await this.delay();
    this.simulateError(0.02); // 2% error rate

    if (sessionId !== this.session.id) {
      throw new Error('Invalid session ID');
    }

    const userVoteSet = this.userVotes.get(userId) || new Set();

    return {
      sessionId: this.session.id,
      votedContestants: userVoteSet,
      totalVotes: userVoteSet.size,
      lastUpdated: new Date(),
    };
  }

  /**
   * Simulate session state changes
   */
  setVotingWindowStatus(isActive: boolean): void {
    this.session.isActive = isActive;
    this.lastUpdateTime = new Date();
  }

  /**
   * Reset all votes (for testing)
   */
  resetVotes(): void {
    this.userVotes.clear();
    this.contestants.forEach(contestant => {
      contestant.voteCount = Math.floor(Math.random() * 1000) + 100;
    });
    this.lastUpdateTime = new Date();
  }

  /**
   * Add random vote activity (for demo purposes)
   */
  simulateVoteActivity(): void {
    const activeContestants = this.contestants.filter(c => c.isActive);
    if (activeContestants.length === 0) return;

    const contestant = activeContestants[Math.floor(Math.random() * activeContestants.length)];
    contestant.voteCount += Math.floor(Math.random() * 3) + 1;
    this.lastUpdateTime = new Date();
  }

  /**
   * Get current statistics
   */
  getStatistics() {
    const totalVotes = this.contestants.reduce((sum, c) => sum + c.voteCount, 0);
    const activeContestants = this.contestants.filter(c => c.isActive).length;
    const totalUsers = this.userVotes.size;

    return {
      totalVotes,
      activeContestants,
      totalUsers,
      lastUpdate: this.lastUpdateTime,
    };
  }
}

/**
 * Global mock data service instance
 */
export const mockDataService = new MockDataService();

/**
 * Start background vote simulation (for demo)
 */
export function startVoteSimulation(intervalMs: number = 5000): () => void {
  const interval = setInterval(() => {
    if (Math.random() < 0.7) { // 70% chance of activity
      mockDataService.simulateVoteActivity();
    }
  }, intervalMs);

  return () => clearInterval(interval);
}