import { useState, useCallback } from 'react';

/**
 * Shared hook for async operations with loading/error state.
 * Used by context providers to avoid duplicating the try/catch/loading pattern.
 */
export function useLoadingState(initialLoading = false, initialError: string | null = null) {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(initialError);

  const withLoading = useCallback(async (errorLabel: string, fn: () => Promise<void>) => {
    setIsLoading(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : errorLabel);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, setError, withLoading };
}
