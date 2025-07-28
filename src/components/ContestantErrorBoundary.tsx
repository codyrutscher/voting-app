'use client';

import React from 'react';
import { ErrorBoundary, ErrorFallbackProps } from './ErrorBoundary';

/**
 * Minimal error fallback for individual contestant cards
 */
const ContestantErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  retry, 
  resetError 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-lg min-h-[200px]">
      <div className="text-gray-400 mb-3">
        <svg 
          className="w-8 h-8 mx-auto" 
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
      </div>
      
      <p className="text-sm text-gray-600 text-center mb-3">
        Unable to load contestant
      </p>
      
      <button
        onClick={retry}
        className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
      >
        Retry
      </button>
    </div>
  );
};

interface ContestantErrorBoundaryProps {
  children: React.ReactNode;
  contestantId?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Error boundary for individual contestant components
 * Provides isolated error handling so one failing contestant doesn't break the entire list
 */
export const ContestantErrorBoundary: React.FC<ContestantErrorBoundaryProps> = ({ 
  children, 
  contestantId,
  onError 
}) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log contestant-specific error details
    console.error('Contestant component error:', {
      contestantId,
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
    // analytics.track('contestant_error', { 
    //   contestantId, 
    //   error: error.message 
    // });
  };

  return (
    <ErrorBoundary
      fallback={ContestantErrorFallback}
      onError={handleError}
      isolateFailures={true}
    >
      {children}
    </ErrorBoundary>
  );
};