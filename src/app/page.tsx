'use client';

import React, { useEffect, useState } from 'react';
import { VotingProvider } from '../contexts/VotingContext';
import { VotingInterface } from '../components/VotingInterface';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { mockDataService, startVoteSimulation } from '../utils/mockData';
import { Contestant } from '../types/contestant';
import { VotingSession } from '../types/voting';

/**
 * Main voting page component
 * Integrates all voting components with mock data service
 */
export default function VotingPage() {
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [session, setSession] = useState<VotingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize data and start vote simulation
  useEffect(() => {
    let stopSimulation: (() => void) | null = null;

    const initializeData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch initial data
        const response = await mockDataService.getContestants();
        setContestants(response.contestants);
        setSession(response.session);

        // Start vote simulation for demo
        stopSimulation = startVoteSimulation(3000);

        // Enable voting window
        mockDataService.setVotingWindowStatus(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load voting data';
        setError(errorMessage);
        console.error('Failed to initialize voting data:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeData();

    // Cleanup
    return () => {
      if (stopSimulation) {
        stopSimulation();
      }
    };
  }, []);

  // Handle data refresh for polling
  const handleDataRefresh = async () => {
    try {
      const response = await mockDataService.pollUpdates();
      if (response.hasChanges) {
        setContestants(response.contestants);
        setSession(response.session);
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
      throw err; // Re-throw to let VotingInterface handle the error
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Voting System</h2>
          <p className="text-gray-600">Preparing contestants and voting session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Voting System</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Application error:', error, errorInfo);
      }}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  America's Got Talent - Live Voting
                </h1>
                <p className="text-gray-600 mt-1">
                  Vote for your favorite contestants in the finale!
                </p>
              </div>
              
              {/* Session Info */}
              {session && (
                <div className="text-right">
                  <div className="text-sm text-gray-500">Session</div>
                  <div className="font-medium text-gray-900">{session.id}</div>
                  <div className="text-xs text-gray-500">
                    {session.isActive ? (
                      <span className="text-green-600">● Live</span>
                    ) : (
                      <span className="text-red-600">● Closed</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="py-8">
          <VotingProvider
            initialSession={session}
            initialContestants={contestants}
          >
            <VotingInterface
              onDataRefresh={handleDataRefresh}
              pollingInterval={2000}
            />
          </VotingProvider>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <p className="text-gray-600 text-sm">
                © 2024 America's Got Talent Live Voting System
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Built with Next.js, React, and TypeScript
              </p>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}