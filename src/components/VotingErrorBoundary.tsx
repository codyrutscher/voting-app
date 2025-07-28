'use client';

import React from 'react';
import { ErrorBoundary, ErrorFallbackProps } from './ErrorBoundary';

/**
 * Specialized error fallback for voting-related errors
 */
const VotingErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  retry, 
  resetError 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="text-yellow-600 mb-4">
        <svg 
          className="w-10 h-10 mx-auto mb-3" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-yellow-800 mb-2">
        Voting Temporarily Unavailable
      </h3>
      
      <p className="text-yellow-700 text-center mb-4 max-w-sm">
        We're having trouble processing votes right now. Your previous votes are still saved.
      </p>
      
      <div className="flex gap-2">
        <button
          onClick={retry}
          className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors text-sm"
        >
          Try Again
        </button>
        
        <button
          onClick={resetError}
          className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors text-sm"
        >
          Continue Browsing
        </button>
      </div>
    </div>
  );
};

interface VotingErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Error boundary specifically for voting components
 * Provides voting-specific error handling and recovery
 */
export const VotingErrorBoundary: React.FC<VotingErrorBoundaryProps> = ({ 
  children, 
  onError 
}) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log voting-specific error details
    console.error('Voting error occurred:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // In production, you might want to report this to analytics
    // analytics.track('voting_error', { error: error.message });
  };

  return (
    <ErrorBoundary
      fallback={VotingErrorFallback}
      onError={handleError}
      isolateFailures={true}
    >
      {children}
    </ErrorBoundary>
  );
};