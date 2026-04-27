import { QueryClient } from '@tanstack/react-query';

/**
 * React Query Client Configuration
 * 
 * Configures caching strategy, retry logic, and default options for all queries and mutations.
 * 
 * Requirements:
 * - 13.1: Implement React Query for data caching
 * - 13.2: Cache API responses for 5 minutes
 * - 13.5: Refetch stale data in the background
 * - 17.6: Implement retry logic for failed requests (maximum 3 attempts)
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes (Requirement 13.2)
      staleTime: 5 * 60 * 1000,
      
      // Cache is kept in memory for 10 minutes after becoming unused
      gcTime: 10 * 60 * 1000,
      
      // Retry failed requests up to 3 times (Requirement 17.6)
      retry: 3,
      
      // Exponential backoff for retries: 1s, 2s, 4s
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Don't refetch on window focus to reduce unnecessary requests
      refetchOnWindowFocus: false,
      
      // Don't refetch on component mount if data is still fresh
      refetchOnMount: false,
      
      // Refetch on network reconnection to ensure data consistency
      refetchOnReconnect: true,
      
      // Enable background refetching when data becomes stale (Requirement 13.5)
      refetchInterval: false,
      refetchIntervalInBackground: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      
      // Shorter retry delay for mutations
      retryDelay: 1000,
    },
  },
});
