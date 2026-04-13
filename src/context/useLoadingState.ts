import { useState, useCallback } from 'react';

/**
 * Shared hook for async operations with loading/error state.
 * Used by context providers to avoid duplicating the try/catch/loading pattern.
 */
export function useLoadingState(initialLoading = false, initialError: string | null = null) {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(initialError);

  const withLoading = useCallback(async <T = void>(errorLabel: string, fn: () => Promise<T>): Promise<T | undefined> => {
    setIsLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : errorLabel);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, setError, withLoading };
}
