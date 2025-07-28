'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Contestant } from '../types/contestant';
import { useVoting } from '../contexts/VotingContext';
import { useResponsive } from '../hooks/useResponsive';
import { ContestantErrorBoundary } from './ContestantErrorBoundary';

interface ContestantCardProps {
  contestant: Contestant;
  votingEnabled?: boolean;
  sessionId?: string;
  onVoteSuccess?: (contestantId: string) => void;
  onVoteError?: (error: Error, contestantId: string) => void;
  className?: string;
}

/**
 * Individual contestant card component with voting functionality
 * Displays contestant information and handles vote interactions
 */
const ContestantCardContent: React.FC<ContestantCardProps> = ({
  contestant,
  votingEnabled = true,
  sessionId = 'default-session',
  onVoteSuccess,
  onVoteError,
  className = '',
}) => {
  const { isMobile, isTablet } = useResponsive();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const { hasVotedFor, addVote, error, setError } = useVoting();
  const [isVoting, setIsVoting] = useState(false);
  
  const hasVoted = hasVotedFor(contestant.id);
  const voteCount = contestant.voteCount;
  
  const clearError = () => setError(null);

  // Handle vote button click
  const handleVote = async () => {
    if (!votingEnabled || hasVoted || isVoting || !contestant.isActive) {
      return;
    }

    setIsVoting(true);
    try {
      await addVote(contestant.id);
      onVoteSuccess?.(contestant.id);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Vote failed');
      onVoteError?.(error, contestant.id);
    } finally {
      setIsVoting(false);
    }
  };

  // Handle image load events
  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  // Determine button state and styling
  const getButtonState = () => {
    if (!contestant.isActive) {
      return {
        disabled: true,
        text: 'Inactive',
        className: 'bg-gray-300 text-gray-500 cursor-not-allowed',
      };
    }

    if (!votingEnabled) {
      return {
        disabled: true,
        text: 'Voting Closed',
        className: 'bg-gray-300 text-gray-500 cursor-not-allowed',
      };
    }

    if (hasVoted) {
      return {
        disabled: true,
        text: 'Voted ✓',
        className: 'bg-green-500 text-white cursor-not-allowed',
      };
    }

    if (isVoting) {
      return {
        disabled: true,
        text: 'Voting...',
        className: 'bg-blue-400 text-white cursor-not-allowed',
      };
    }

    return {
      disabled: false,
      text: 'Vote',
      className: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 cursor-pointer',
    };
  };

  const buttonState = getButtonState();

  // Responsive sizing
  const cardClasses = `
    bg-white rounded-lg shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg
    ${isMobile ? 'w-full' : isTablet ? 'w-64' : 'w-72'}
    ${className}
  `;

  const imageSize = isMobile ? 200 : isTablet ? 240 : 280;

  return (
    <div className={cardClasses}>
      {/* Contestant Image */}
      <div className="relative bg-gray-100" style={{ height: imageSize }}>
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {!imageError ? (
          <Image
            src={contestant.imageUrl}
            alt={`${contestant.name} - ${contestant.category || 'Contestant'}`}
            fill
            className={`object-cover transition-opacity duration-200 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            sizes={`${imageSize}px`}
            priority={false}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <svg
              className="w-16 h-16 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="text-sm">Image unavailable</span>
          </div>
        )}

        {/* Vote Count Badge */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-sm font-medium">
          {voteCount.toLocaleString()} votes
        </div>

        {/* Category Badge */}
        {contestant.category && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
            {contestant.category}
          </div>
        )}
      </div>

      {/* Contestant Information */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
          {contestant.name}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {contestant.description}
        </p>

        {/* Error Display */}
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-xs">{error.message}</p>
            <button
              onClick={clearError}
              className="text-red-600 text-xs underline hover:no-underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Vote Button */}
        <button
          onClick={handleVote}
          disabled={buttonState.disabled}
          className={`
            w-full py-2 px-4 rounded-md font-medium text-sm transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2
            ${buttonState.className}
            ${isMobile ? 'py-3 text-base' : ''}
          `}
          aria-label={`Vote for ${contestant.name}`}
          aria-pressed={hasVoted}
        >
          {buttonState.text}
        </button>

        {/* Vote Status */}
        {hasVoted && (
          <p className="text-green-600 text-xs text-center mt-2">
            Thank you for voting!
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * ContestantCard component wrapped with error boundary
 */
export const ContestantCard: React.FC<ContestantCardProps> = (props) => {
  return (
    <ContestantErrorBoundary
      contestantId={props.contestant.id}
      onError={(error, errorInfo) => {
        console.error(`Error in ContestantCard for ${props.contestant.id}:`, error);
        props.onVoteError?.(error, props.contestant.id);
      }}
    >
      <ContestantCardContent {...props} />
    </ContestantErrorBoundary>
  );
};

export default ContestantCard;