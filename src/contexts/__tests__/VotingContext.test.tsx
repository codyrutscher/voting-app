import React from 'react';
import { render, screen, act, renderHook } from '@testing-library/react';
import { VotingProvider, useVoting, useVotingSession, useContestants, useUserVotes } from '../VotingContext';
import { VotingSession } from '../../types/voting';
import { Contestant } from '../../types/contestant';
import { ErrorType } from '../../types/errors';

// Mock useLocalStorage hook
const mockSetValue = jest.fn();

jest.mock('../../hooks/useLocalStorage', () => ({
  useLocalStorage: jest.fn(() => ({
    value: {
      sessionId: 'test-session',
      votedContestants: [],
      totalVotes: 0,
      lastUpdated: new Date().toISOString(),
    },
    setValue: mockSetValue,
    removeValue: jest.fn(),
    isSupported: true,
    error: null,
  })),
}));

// Test data
const mockSession: VotingSession = {
  id: 'test-session',
  isActive: true,
  startTime: new Date('2024-01-01T10:00:00Z'),
  endTime: new Date('2024-01-01T12:00:00Z'),
  maxVotesPerUser: 3,
  contestants: ['contestant-1', 'contestant-2', 'contestant-3'],
};

const mockContestants: Contestant[] = [
  {
    id: 'contestant-1',
    name: 'Alice Johnson',
    imageUrl: '/images/alice.jpg',
    description: 'Singer from New York',
    voteCount: 150,
    isActive: true,
    category: 'Music',
  },
  {
    id: 'contestant-2',
    name: 'Bob Smith',
    imageUrl: '/images/bob.jpg',
    description: 'Dancer from California',
    voteCount: 120,
    isActive: true,
    category: 'Dance',
  },
  {
    id: 'contestant-3',
    name: 'Carol Davis',
    imageUrl: '/images/carol.jpg',
    description: 'Comedian from Texas',
    voteCount: 200,
    isActive: false,
    category: 'Comedy',
  },
  {
    id: 'contestant-4',
    name: 'David Wilson',
    imageUrl: '/images/david.jpg',
    description: 'Magician from Florida',
    voteCount: 80,
    isActive: true,
    category: 'Magic',
  },
];

// Test wrapper component
const TestWrapper: React.FC<{ 
  children: React.ReactNode;
  session?: VotingSession;
  contestants?: Contestant[];
}> = ({ children, session, contestants }) => (
  <VotingProvider initialSession={session} initialContestants={contestants}>
    {children}
  </VotingProvider>
);

describe('VotingContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('VotingProvider', () => {
    it('should provide initial state correctly', () => {
      const TestComponent = () => {
        const { loading, error, session, contestants, votingWindowActive } = useVoting();
        
        return (
          <div>
            <div data-testid="loading">{loading.toString()}</div>
            <div data-testid="error">{error ? error.message : 'null'}</div>
            <div data-testid="session">{session ? session.id : 'null'}</div>
            <div data-testid="contestants">{contestants.length}</div>
            <div data-testid="voting-active">{votingWindowActive.toString()}</div>
          </div>
        );
      };

      render(
        <TestWrapper session={mockSession} contestants={mockContestants}>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
      expect(screen.getByTestId('session')).toHaveTextContent('test-session');
      expect(screen.getByTestId('contestants')).toHaveTextContent('3');
      expect(screen.getByTestId('voting-active')).toHaveTextContent('false');
    });

    it('should throw error when useVoting is used outside provider', () => {
      const TestComponent = () => {
        useVoting();
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useVoting must be used within a VotingProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('State Management Actions', () => {
    it('should update loading state', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
      });

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it('should update error state', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
      });

      const testError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Test error',
        recoverable: true,
      };

      expect(result.current.error).toBe(null);

      act(() => {
        result.current.setError(testError);
      });

      expect(result.current.error).toEqual(testError);
    });

    it('should update session state', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
      });

      const newSession: VotingSession = {
        ...mockSession,
        id: 'new-session',
      };

      act(() => {
        result.current.setSession(newSession);
      });

      expect(result.current.session).toEqual(newSession);
      expect(result.current.userVoteState.sessionId).toBe('new-session');
    });

    it('should update contestants state', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
      });

      const newContestants = [mockContestants[0]];

      act(() => {
        result.current.setContestants(newContestants);
      });

      expect(result.current.contestants).toEqual(newContestants);
    });

    it('should update individual contestant', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => (
          <TestWrapper contestants={mockContestants}>{children}</TestWrapper>
        ),
      });

      const updatedContestant = {
        ...mockContestants[0],
        voteCount: 200,
      };

      act(() => {
        result.current.updateContestant(updatedContestant);
      });

      const contestant = result.current.getContestantById('contestant-1');
      expect(contestant?.voteCount).toBe(200);
    });

    it('should update voting window status', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
      });

      expect(result.current.votingWindowActive).toBe(false);

      act(() => {
        result.current.setVotingWindowStatus(true);
      });

      expect(result.current.votingWindowActive).toBe(true);
    });
  });

  describe('Voting Logic', () => {
    it('should add vote successfully', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => (
          <TestWrapper session={mockSession} contestants={mockContestants}>
            {children}
          </TestWrapper>
        ),
      });

      // Enable voting window
      act(() => {
        result.current.setVotingWindowStatus(true);
      });

      expect(result.current.hasVotedFor('contestant-1')).toBe(false);
      expect(result.current.userVoteState.totalVotes).toBe(0);

      act(() => {
        result.current.addVote('contestant-1');
      });

      expect(result.current.hasVotedFor('contestant-1')).toBe(true);
      expect(result.current.userVoteState.totalVotes).toBe(1);
    });

    it('should prevent duplicate votes', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => (
          <TestWrapper session={mockSession} contestants={mockContestants}>
            {children}
          </TestWrapper>
        ),
      });

      // Enable voting window
      act(() => {
        result.current.setVotingWindowStatus(true);
      });

      // Add first vote
      act(() => {
        result.current.addVote('contestant-1');
      });

      expect(result.current.userVoteState.totalVotes).toBe(1);
      expect(result.current.error).toBe(null);

      // Try to vote again for same contestant
      act(() => {
        result.current.addVote('contestant-1');
      });

      expect(result.current.userVoteState.totalVotes).toBe(1);
      expect(result.current.error?.message).toContain('already voted');
    });

    it('should enforce vote limits', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => (
          <TestWrapper session={mockSession} contestants={mockContestants}>
            {children}
          </TestWrapper>
        ),
      });

      // Enable voting window
      act(() => {
        result.current.setVotingWindowStatus(true);
      });

      // Add maximum votes (3 different contestants)
      act(() => {
        result.current.addVote('contestant-1');
      });
      
      act(() => {
        result.current.addVote('contestant-2');
      });
      
      act(() => {
        result.current.addVote('contestant-3');
      });

      expect(result.current.userVoteState.totalVotes).toBe(3);
      expect(result.current.canVote()).toBe(false);

      // Try to add another vote for a new contestant - should fail due to vote limit
      act(() => {
        result.current.addVote('contestant-4'); // This should fail due to limit
      });

      expect(result.current.error?.message).toContain('voting limit');
    });
  });

  describe('Computed Values', () => {
    it('should calculate remaining votes correctly', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => (
          <TestWrapper session={mockSession} contestants={mockContestants}>
            {children}
          </TestWrapper>
        ),
      });

      expect(result.current.remainingVotes()).toBe(3);

      // Enable voting and add one vote
      act(() => {
        result.current.setVotingWindowStatus(true);
      });
      
      act(() => {
        result.current.addVote('contestant-1');
      });

      expect(result.current.remainingVotes()).toBe(2);
    });

    it('should check if user can vote', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => (
          <TestWrapper session={mockSession} contestants={mockContestants}>
            {children}
          </TestWrapper>
        ),
      });

      // Cannot vote when window is closed
      expect(result.current.canVote()).toBe(false);

      // Can vote when window is open
      act(() => {
        result.current.setVotingWindowStatus(true);
      });

      expect(result.current.canVote()).toBe(true);
    });

    it('should find contestant by ID', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => (
          <TestWrapper contestants={mockContestants}>{children}</TestWrapper>
        ),
      });

      const contestant = result.current.getContestantById('contestant-1');
      expect(contestant?.name).toBe('Alice Johnson');

      const nonExistent = result.current.getContestantById('non-existent');
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('Specialized Hooks', () => {
    it('should provide voting session data with useVotingSession', () => {
      const { result } = renderHook(() => useVotingSession(), {
        wrapper: ({ children }) => (
          <TestWrapper session={mockSession}>{children}</TestWrapper>
        ),
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.votingWindowActive).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should provide contestant data with useContestants', () => {
      const { result } = renderHook(() => useContestants(), {
        wrapper: ({ children }) => (
          <TestWrapper contestants={mockContestants}>{children}</TestWrapper>
        ),
      });

      expect(result.current.contestants).toEqual(mockContestants);
      expect(result.current.getContestantById('contestant-1')).toEqual(mockContestants[0]);
    });

    it('should provide user vote data with useUserVotes', () => {
      const { result } = renderHook(() => useUserVotes(), {
        wrapper: ({ children }) => (
          <TestWrapper session={mockSession}>{children}</TestWrapper>
        ),
      });

      expect(result.current.userVoteState.totalVotes).toBe(0);
      expect(result.current.hasVotedFor('contestant-1')).toBe(false);
      expect(result.current.remainingVotes()).toBe(3);
    });
  });

  describe('State Reset', () => {
    it('should reset state to initial values', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => (
          <TestWrapper session={mockSession} contestants={mockContestants}>
            {children}
          </TestWrapper>
        ),
      });

      // Make some changes
      act(() => {
        result.current.setLoading(true);
        result.current.setVotingWindowStatus(true);
        result.current.addVote('contestant-1');
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.votingWindowActive).toBe(true);

      // Reset state
      act(() => {
        result.current.resetState();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.session).toBe(null);
      expect(result.current.contestants).toEqual([]);
      expect(result.current.votingWindowActive).toBe(false);
      expect(result.current.userVoteState.totalVotes).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing session gracefully', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
      });

      expect(result.current.canVote()).toBe(false);
      expect(result.current.remainingVotes()).toBe(0);
    });

    it('should handle empty contestants array', () => {
      const { result } = renderHook(() => useVoting(), {
        wrapper: ({ children }) => (
          <TestWrapper session={mockSession} contestants={[]}>
            {children}
          </TestWrapper>
        ),
      });

      expect(result.current.contestants).toEqual([]);
      expect(result.current.getContestantById('any-id')).toBeUndefined();
    });
  });
});