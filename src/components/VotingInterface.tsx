'use client';

import React, { useEffect, useState } from 'react';
import { ContestantCard } from './ContestantCard';
import { VotingErrorBoundary } from './VotingErrorBoundary';
import { useVoting } from '../contexts/VotingContext';
import { useResponsive } from '../hooks/useResponsive';
import { usePolling } from '../hooks/usePolling';
import { Contestant } from '../types/contestant';

interface VotingInterfaceProps {
  onDataRefresh?: () => Promise<void>;
  pollingInterval?: number;
  className?: string;
}

/**
 * Loading skeleton component for contestant cards
 */
const ContestantSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      <div className="bg-gray-200 h-64"></div>
      <div className="p-4">
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-3 bg-gray-200 rounded mb-3 w-3/4"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};

/**
 * Empty state component when no contestants are available
 */
const EmptyState: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-gray-400 mb-4">
        <svg
          className="w-16 h-16 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No Contestants</h3>
      <p className="text-gray-600 text-center max-w-md">{message}</p>
    </div>
  );
};

/**
 * Voting status banner component
 */
const VotingStatusBanner: React.FC = () => {
  const {
    session,
    votingWindowActive,
    userVoteState,
    remainingVotes,
    canVote,
  } = useVoting();

  if (!session) {
    return (
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="text-gray-400 mr-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">No Active Session</h3>
            <p className="text-sm text-gray-600">Waiting for voting session to begin...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!votingWindowActive) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="text-yellow-400 mr-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Voting Window Closed</h3>
            <p className="text-sm text-yellow-700">
              Voting is currently closed. Check back when the voting window opens.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const votesUsed = userVoteState.totalVotes;
  const maxVotes = session.maxVotesPerUser;
  const remaining = remainingVotes();

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-green-400 mr-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-green-800">Voting Active</h3>
            <p className="text-sm text-green-700">
              Cast your votes for your favorite contestants!
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-green-800">
            {remaining} / {maxVotes}
          </div>
          <div className="text-xs text-green-600">votes remaining</div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3">
        <div className="bg-green-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(votesUsed / maxVotes) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

/**
 * Main voting interface component
 * Displays contestant grid and manages voting interactions
 */
export const VotingInterface: React.FC<VotingInterfaceProps> = ({
  onDataRefresh,
  pollingInterval = 3000,
  className = '',
}) => {
  const { isMobile, isTablet } = useResponsive();
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const {
    loading,
    error,
    contestants,
    session,
    votingWindowActive,
    setError,
    updateContestant,
  } = useVoting();

  // Handle data refresh
  const handleDataRefresh = async () => {
    if (!onDataRefresh) return;

    try {
      setRefreshError(null);
      await onDataRefresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      setRefreshError(errorMessage);
      console.error('Data refresh failed:', err);
    }
  };

  // Set up polling for real-time updates
  const { isPolling, error: pollingError } = usePolling(
    handleDataRefresh,
    {
      interval: pollingInterval,
      enabled: !!onDataRefresh && votingWindowActive,
      onError: (error) => {
        console.error('Polling error:', error);
        setRefreshError(error.message);
      },
    }
  );

  // Handle vote success
  const handleVoteSuccess = (contestantId: string) => {
    // Optimistically update the contestant's vote count
    const contestant = contestants.find(c => c.id === contestantId);
    if (contestant) {
      updateContestant({
        ...contestant,
        voteCount: contestant.voteCount + 1,
      });
    }
  };

  // Handle vote error
  const handleVoteError = (error: Error, contestantId: string) => {
    console.error(`Vote error for contestant ${contestantId}:`, error);
    setError({
      type: 'VOTE_ERROR' as any,
      message: error.message,
      recoverable: true,
      retryAction: () => setError(null),
    });
  };

  // Filter active contestants
  const activeContestants = contestants.filter(contestant => contestant.isActive);

  // Determine grid layout based on screen size
  const getGridClasses = () => {
    if (isMobile) {
      return 'grid-cols-1 gap-4';
    } else if (isTablet) {
      return 'grid-cols-2 gap-6';
    } else {
      return 'grid-cols-3 xl:grid-cols-4 gap-6';
    }
  };

  return (
    <VotingErrorBoundary onError={(error) => console.error('VotingInterface error:', error)}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
        {/* Voting Status Banner */}
        <VotingStatusBanner />

        {/* Refresh Error */}
        {(refreshError || pollingError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="text-red-400 mr-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Connection Issue</h3>
                  <p className="text-sm text-red-700">
                    {refreshError || pollingError?.message || 'Unable to refresh data'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDataRefresh}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {loading ? (
          /* Loading State */
          <div className={`grid ${getGridClasses()}`}>
            {Array.from({ length: 6 }).map((_, index) => (
              <ContestantSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-red-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Contestants</h3>
            <p className="text-gray-600 text-center max-w-md mb-4">{error.message}</p>
            {error.recoverable && (
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            )}
          </div>
        ) : activeContestants.length === 0 ? (
          /* Empty State */
          <EmptyState message="No contestants are currently available for voting. Please check back later." />
        ) : (
          /* Contestants Grid */
          <div className={`grid ${getGridClasses()}`}>
            {activeContestants.map((contestant) => (
              <ContestantCard
                key={contestant.id}
                contestant={contestant}
                votingEnabled={votingWindowActive}
                sessionId={session?.id}
                onVoteSuccess={handleVoteSuccess}
                onVoteError={handleVoteError}
              />
            ))}
          </div>
        )}

        {/* Polling Status Indicator */}
        {isPolling && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-full shadow-lg text-sm">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
              Live updates active
            </div>
          </div>
        )}
      </div>
    </VotingErrorBoundary>
  );
};

export default VotingInterface;