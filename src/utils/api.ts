import { Contestant } from '../types/contestant';
import { VotingSession, UserVoteState } from '../types/voting';
import { VoteRequest, VoteResponse, ContestantsResponse, PollingUpdateResponse } from '../types/api';
import { AppError, ErrorType } from '../types/errors';

/**
 * Base API configuration
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
const API_TIMEOUT = 10000; // 10 seconds

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generic API request function with error handling and timeout
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorCode = response.status.toString();
      let errorDetails = null;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        errorCode = errorData.code || errorCode;
        errorDetails = errorData.details || null;
      } catch {
        // If we can't parse the error response, use the default message
      }

      throw new ApiError(errorMessage, response.status, errorCode, errorDetails);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, 'TIMEOUT');
      }
      
      if (error.message.includes('Failed to fetch')) {
        throw new ApiError('Network error - please check your connection', 0, 'NETWORK_ERROR');
      }
    }

    throw new ApiError('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
  }
}

/**
 * Convert ApiError to AppError
 */
function convertToAppError(error: ApiError): AppError {
  let errorType: ErrorType;

  switch (error.code) {
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      errorType = ErrorType.NETWORK_ERROR;
      break;
    case 'VALIDATION_ERROR':
      errorType = ErrorType.VALIDATION_ERROR;
      break;
    case 'VOTE_ERROR':
      errorType = ErrorType.VOTE_ERROR;
      break;
    default:
      errorType = ErrorType.NETWORK_ERROR;
  }

  return {
    type: errorType,
    message: error.message,
    recoverable: error.status < 500 && error.status !== 0,
    details: {
      status: error.status,
      code: error.code,
      ...error.details,
    },
  };
}

/**
 * API Functions
 */

/**
 * Fetch all contestants and current voting session
 */
export async function fetchContestants(): Promise<ContestantsResponse> {
  try {
    return await apiRequest<ContestantsResponse>('/contestants');
  } catch (error) {
    if (error instanceof ApiError) {
      throw convertToAppError(error);
    }
    throw error;
  }
}

/**
 * Submit a vote for a contestant
 */
export async function submitVote(voteRequest: VoteRequest): Promise<VoteResponse> {
  try {
    return await apiRequest<VoteResponse>('/vote', {
      method: 'POST',
      body: JSON.stringify(voteRequest),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw convertToAppError(error);
    }
    throw error;
  }
}

/**
 * Get current voting session information
 */
export async function fetchVotingSession(): Promise<VotingSession> {
  try {
    return await apiRequest<VotingSession>('/session');
  } catch (error) {
    if (error instanceof ApiError) {
      throw convertToAppError(error);
    }
    throw error;
  }
}

/**
 * Poll for updates (contestants and session data)
 */
export async function pollUpdates(lastUpdateTimestamp?: Date): Promise<PollingUpdateResponse> {
  try {
    const params = new URLSearchParams();
    if (lastUpdateTimestamp) {
      params.append('since', lastUpdateTimestamp.toISOString());
    }

    const endpoint = `/updates${params.toString() ? `?${params.toString()}` : ''}`;
    return await apiRequest<PollingUpdateResponse>(endpoint);
  } catch (error) {
    if (error instanceof ApiError) {
      throw convertToAppError(error);
    }
    throw error;
  }
}

/**
 * Get user's current vote state
 */
export async function fetchUserVoteState(sessionId: string, userId?: string): Promise<UserVoteState> {
  try {
    const params = new URLSearchParams({ sessionId });
    if (userId) {
      params.append('userId', userId);
    }

    return await apiRequest<UserVoteState>(`/user-votes?${params.toString()}`);
  } catch (error) {
    if (error instanceof ApiError) {
      throw convertToAppError(error);
    }
    throw error;
  }
}

/**
 * Validate vote request before submission
 */
export function validateVoteRequest(voteRequest: VoteRequest): string | null {
  if (!voteRequest.contestantId) {
    return 'Contestant ID is required';
  }

  if (!voteRequest.sessionId) {
    return 'Session ID is required';
  }

  if (voteRequest.contestantId.length < 1) {
    return 'Invalid contestant ID';
  }

  if (voteRequest.sessionId.length < 1) {
    return 'Invalid session ID';
  }

  return null;
}

/**
 * Retry wrapper for API calls with exponential backoff
 */
export async function withRetry<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx) except for 408 (timeout)
      if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 408) {
        throw error;
      }

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Batch API requests with concurrency control
 */
export async function batchRequests<T>(
  requests: (() => Promise<T>)[],
  concurrency: number = 3
): Promise<(T | Error)[]> {
  const results: (T | Error)[] = [];
  
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchPromises = batch.map(async (request, index) => {
      try {
        return await request();
      } catch (error) {
        return error as Error;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Check if the API is available
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await apiRequest('/health', { method: 'GET' });
    return true;
  } catch {
    return false;
  }
}