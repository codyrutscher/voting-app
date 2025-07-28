'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Contestant } from '../types/contestant';
import { VotingSession, UserVoteState, SerializableUserVoteState } from '../types/voting';
import { AppError, ErrorType } from '../types/errors';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Action types for the voting reducer
type VotingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: AppError | null }
  | { type: 'SET_SESSION'; payload: VotingSession | null }
  | { type: 'SET_CONTESTANTS'; payload: Contestant[] }
  | { type: 'UPDATE_CONTESTANT'; payload: Contestant }
  | { type: 'SET_USER_VOTE_STATE'; payload: UserVoteState }
  | { type: 'ADD_VOTE'; payload: { contestantId: string } }
  | { type: 'SET_VOTING_WINDOW_STATUS'; payload: boolean }
  | { type: 'RESET_STATE' };

// Voting context state interface
interface VotingState {
  loading: boolean;
  error: AppError | null;
  session: VotingSession | null;
  contestants: Contestant[];
  userVoteState: UserVoteState;
  votingWindowActive: boolean;
}

// Voting context interface
interface VotingContextType extends VotingState {
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: AppError | null) => void;
  setSession: (session: VotingSession | null) => void;
  setContestants: (contestants: Contestant[]) => void;
  updateContestant: (contestant: Contestant) => void;
  addVote: (contestantId: string) => Promise<void>;
  setVotingWindowStatus: (active: boolean) => void;
  resetState: () => void;
  
  // Computed values
  hasVotedFor: (contestantId: string) => boolean;
  canVote: () => boolean;
  remainingVotes: () => number;
  getContestantById: (id: string) => Contestant | undefined;
}

// Initial state
const initialState: VotingState = {
  loading: false,
  error: null,
  session: null,
  contestants: [],
  userVoteState: {
    sessionId: '',
    votedContestants: new Set(),
    totalVotes: 0,
    lastUpdated: new Date(),
  },
  votingWindowActive: false,
};

// Voting reducer
function votingReducer(state: VotingState, action: VotingAction): VotingState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_SESSION':
      const isVotingActive = action.payload ? 
        action.payload.isActive && 
        new Date() >= new Date(action.payload.startTime) && 
        new Date() <= new Date(action.payload.endTime) 
        : false;
        
      return { 
        ...state, 
        session: action.payload,
        votingWindowActive: isVotingActive,
        userVoteState: action.payload 
          ? { ...state.userVoteState, sessionId: action.payload.id }
          : state.userVoteState
      };
      
    case 'SET_CONTESTANTS':
      return { ...state, contestants: action.payload };
      
    case 'UPDATE_CONTESTANT':
      return {
        ...state,
        contestants: state.contestants.map(contestant =>
          contestant.id === action.payload.id ? action.payload : contestant
        ),
      };
      
    case 'SET_USER_VOTE_STATE':
      return { ...state, userVoteState: action.payload };
      
    case 'ADD_VOTE':
      const newVotedContestants = new Set(state.userVoteState.votedContestants);
      newVotedContestants.add(action.payload.contestantId);
      
      return {
        ...state,
        userVoteState: {
          ...state.userVoteState,
          votedContestants: newVotedContestants,
          totalVotes: state.userVoteState.totalVotes + 1,
          lastUpdated: new Date(),
        },
      };
      
    case 'SET_VOTING_WINDOW_STATUS':
      return { ...state, votingWindowActive: action.payload };
      
    case 'RESET_STATE':
      return initialState;
      
    default:
      return state;
  }
}

// Create the context
const VotingContext = createContext<VotingContextType | undefined>(undefined);

// Provider props interface
interface VotingProviderProps {
  children: ReactNode;
  initialSession?: VotingSession;
  initialContestants?: Contestant[];
}

// Voting provider component
export const VotingProvider: React.FC<VotingProviderProps> = ({
  children,
  initialSession,
  initialContestants = [],
}) => {
  // Check if we're in the middle of a reset
  const isResetting = typeof window !== 'undefined' && 
    sessionStorage.getItem('voting-reset-in-progress') === 'true';
  
  if (isResetting) {
    // Clear the reset flag
    sessionStorage.removeItem('voting-reset-in-progress');
    console.log('🔄 VotingContext: Reset detected, starting with clean state');
    
    // Extra safety: clear any remaining voting-state localStorage keys
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('voting-state-')) {
          localStorage.removeItem(key);
          console.log(`🔄 VotingContext: Cleared stale key: ${key}`);
        }
      });
    }
  }

  const initialVotingActive = initialSession ? 
    initialSession.isActive && 
    new Date() >= new Date(initialSession.startTime) && 
    new Date() <= new Date(initialSession.endTime) 
    : false;

  const [state, dispatch] = useReducer(votingReducer, {
    ...initialState,
    session: initialSession || null,
    contestants: initialContestants,
    votingWindowActive: initialVotingActive,
    userVoteState: {
      ...initialState.userVoteState,
      sessionId: initialSession?.id || '',
      // Force clean state if resetting - always start fresh
      votedContestants: new Set(),
      totalVotes: 0,
    },
  });

  // localStorage integration for vote persistence
  const storageKey = `voting-state-${state.session?.id || 'default'}`;
  const defaultStorageState: SerializableUserVoteState = {
    sessionId: state.session?.id || '',
    votedContestants: [],
    totalVotes: 0,
    lastUpdated: new Date().toISOString(),
  };

  const { value: storedVoteState, setValue: setStoredVoteState, removeValue } = useLocalStorage(
    storageKey,
    defaultStorageState
  );

  // Force clear stored state if reset was detected
  useEffect(() => {
    if (isResetting && removeValue) {
      console.log('🔄 VotingContext: Forcing localStorage clear for voting state');
      removeValue();
      // Also force the stored state to default values
      setStoredVoteState(defaultStorageState);
    }
  }, [isResetting, removeValue, setStoredVoteState]);

  // Sync with localStorage on mount and when session changes
  useEffect(() => {
    // Skip localStorage sync if we just reset
    if (isResetting) {
      console.log('🔄 VotingContext: Skipping localStorage sync due to reset');
      return;
    }
    
    // Only restore from localStorage if it's not a default/empty state
    if (storedVoteState && 
        storedVoteState.sessionId === state.session?.id && 
        storedVoteState.totalVotes > 0) {
      // Only update if the stored state is different from current state
      const currentVotedContestants = Array.from(state.userVoteState.votedContestants).sort();
      const storedVotedContestants = storedVoteState.votedContestants.sort();
      
      const isDifferent = 
        state.userVoteState.totalVotes !== storedVoteState.totalVotes ||
        currentVotedContestants.length !== storedVotedContestants.length ||
        !currentVotedContestants.every((id, index) => id === storedVotedContestants[index]);
      
      if (isDifferent) {
        const userVoteState: UserVoteState = {
          sessionId: storedVoteState.sessionId,
          votedContestants: new Set(storedVoteState.votedContestants),
          totalVotes: storedVoteState.totalVotes,
          lastUpdated: new Date(storedVoteState.lastUpdated),
        };
        
        dispatch({ type: 'SET_USER_VOTE_STATE', payload: userVoteState });
      }
    }
  }, [storedVoteState.sessionId, storedVoteState.totalVotes, storedVoteState.votedContestants.length, state.session?.id]);

  // Update localStorage when vote state changes
  useEffect(() => {
    if (state.userVoteState.sessionId) {
      const serializableState: SerializableUserVoteState = {
        sessionId: state.userVoteState.sessionId,
        votedContestants: Array.from(state.userVoteState.votedContestants),
        totalVotes: state.userVoteState.totalVotes,
        lastUpdated: state.userVoteState.lastUpdated.toISOString(),
      };
      
      // Only update localStorage if the state has actually changed
      const currentStoredContestants = storedVoteState.votedContestants.sort();
      const newContestants = serializableState.votedContestants.sort();
      
      const hasChanged = 
        storedVoteState.totalVotes !== serializableState.totalVotes ||
        currentStoredContestants.length !== newContestants.length ||
        !currentStoredContestants.every((id, index) => id === newContestants[index]);
      
      if (hasChanged) {
        setStoredVoteState(serializableState);
      }
    }
  }, [state.userVoteState.sessionId, state.userVoteState.totalVotes, state.userVoteState.votedContestants.size, setStoredVoteState, storedVoteState.totalVotes, storedVoteState.votedContestants.length, state.userVoteState.votedContestants, state.userVoteState.lastUpdated, storedVoteState.votedContestants]);

  // Action creators
  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: AppError | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const setSession = (session: VotingSession | null) => {
    dispatch({ type: 'SET_SESSION', payload: session });
  };

  const setContestants = (contestants: Contestant[]) => {
    dispatch({ type: 'SET_CONTESTANTS', payload: contestants });
  };

  const updateContestant = (contestant: Contestant) => {
    dispatch({ type: 'UPDATE_CONTESTANT', payload: contestant });
  };

  const addVote = async (contestantId: string) => {
    // Validate vote before adding
    if (state.userVoteState.votedContestants.has(contestantId)) {
      setError({
        type: ErrorType.VOTE_ERROR,
        message: 'You have already voted for this contestant',
        recoverable: false,
      });
      return;
    }

    if (!canVote()) {
      setError({
        type: ErrorType.VOTE_ERROR,
        message: 'You have reached your voting limit',
        recoverable: false,
      });
      return;
    }

    try {
      // Import and use the mock data service
      const { mockDataService } = await import('../utils/mockData');
      
      await mockDataService.submitVote({
        contestantId,
        sessionId: state.session?.id || '',
        userId: 'anonymous'
      });

      dispatch({ type: 'ADD_VOTE', payload: { contestantId } });
    } catch (err) {
      setError({
        type: ErrorType.VOTE_ERROR,
        message: err instanceof Error ? err.message : 'Failed to submit vote',
        recoverable: true,
      });
    }
  };

  const setVotingWindowStatus = (active: boolean) => {
    dispatch({ type: 'SET_VOTING_WINDOW_STATUS', payload: active });
  };

  const resetState = () => {
    dispatch({ type: 'RESET_STATE' });
  };

  // Computed values
  const hasVotedFor = (contestantId: string): boolean => {
    return state.userVoteState.votedContestants.has(contestantId);
  };

  const canVote = (): boolean => {
    if (!state.session || !state.votingWindowActive) {
      return false;
    }
    
    return state.userVoteState.totalVotes < state.session.maxVotesPerUser;
  };

  const remainingVotes = (): number => {
    if (!state.session) {
      return 0;
    }
    
    return Math.max(0, state.session.maxVotesPerUser - state.userVoteState.totalVotes);
  };

  const getContestantById = (id: string): Contestant | undefined => {
    return state.contestants.find(contestant => contestant.id === id);
  };

  // Context value
  const contextValue: VotingContextType = {
    ...state,
    setLoading,
    setError,
    setSession,
    setContestants,
    updateContestant,
    addVote,
    setVotingWindowStatus,
    resetState,
    hasVotedFor,
    canVote,
    remainingVotes,
    getContestantById,
  };

  return (
    <VotingContext.Provider value={contextValue}>
      {children}
    </VotingContext.Provider>
  );
};

// Custom hook to use the voting context
export const useVoting = (): VotingContextType => {
  const context = useContext(VotingContext);
  
  if (context === undefined) {
    throw new Error('useVoting must be used within a VotingProvider');
  }
  
  return context;
};

// Hook for accessing only voting session data (lighter alternative)
export const useVotingSession = () => {
  const { session, votingWindowActive, loading, error } = useVoting();
  
  return {
    session,
    votingWindowActive,
    loading,
    error,
  };
};

// Hook for accessing only contestant data
export const useContestants = () => {
  const { contestants, getContestantById, updateContestant } = useVoting();
  
  return {
    contestants,
    getContestantById,
    updateContestant,
  };
};

// Hook for accessing only user vote state
export const useUserVotes = () => {
  const { 
    userVoteState, 
    hasVotedFor, 
    canVote, 
    remainingVotes, 
    addVote 
  } = useVoting();
  
  return {
    userVoteState,
    hasVotedFor,
    canVote,
    remainingVotes,
    addVote,
  };
};