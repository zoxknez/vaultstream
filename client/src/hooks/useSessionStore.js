/**
 * 🎣 SESSION HOOKS - useSyncExternalStore Pattern
 * Optimized hooks with granular selectors
 * Eliminates unnecessary re-renders
 */

import { useCallback, useState, useSyncExternalStore } from 'react';
import { loginToServer, logoutFromServer } from '../services/serverAuthService';
import { clearServerSession } from '../services/serverSession';
import sessionStore, {
  selectCsrfToken,
  selectIsAuthenticated,
  selectIsSessionValid,
  selectLastAuthenticatedAt,
  selectSession
} from '../stores/sessionStore';
import ApiError from '../utils/ApiError';

// ✅ Granular Hooks - Use these instead of full context

/**
 * Use authentication status only
 * Only re-renders when authenticated state changes
 */
export function useSessionAuth() {
  return useSyncExternalStore(
    sessionStore.subscribe,
    () => selectIsAuthenticated(sessionStore.getSnapshot()),
    () => false
  );
}

/**
 * Use CSRF token only
 * Only re-renders when CSRF token changes
 */
export function useSessionToken() {
  return useSyncExternalStore(
    sessionStore.subscribe,
    () => selectCsrfToken(sessionStore.getSnapshot()),
    () => null
  );
}

/**
 * Use session timestamp only
 * Only re-renders when timestamp changes
 */
export function useSessionTimestamp() {
  return useSyncExternalStore(
    sessionStore.subscribe,
    () => selectLastAuthenticatedAt(sessionStore.getSnapshot()),
    () => null
  );
}

/**
 * Use session validity check
 * Only re-renders when validity changes
 */
export function useSessionValidity() {
  return useSyncExternalStore(
    sessionStore.subscribe,
    () => selectIsSessionValid(sessionStore.getSnapshot()),
    () => false
  );
}

/**
 * Use full session object
 * ⚠️ Use sparingly - causes re-render on any session change
 */
export function useSession() {
  return useSyncExternalStore(
    sessionStore.subscribe,
    () => selectSession(sessionStore.getSnapshot()),
    sessionStore.getServerSnapshot
  );
}

/**
 * Use session actions (login, logout)
 * These don't cause re-renders as they're stable callbacks
 */
export function useSessionActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (password) => {
    setLoading(true);
    setError(null);

    try {
      const result = await loginToServer(password);
      setError(null);
      return result;
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : err?.message || 'Unable to authenticate.';
      setError(message);
      clearServerSession();
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await logoutFromServer();
      setError(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err?.message || 'Logout failed.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  return {
    login,
    logout,
    resetError,
    loading,
    error
  };
}

/**
 * Combined hook for components that need everything
 * ⚠️ Use granular hooks when possible for better performance
 */
export function useServerSession() {
  const session = useSession();
  const actions = useSessionActions();

  return {
    session,
    ...actions
  };
}
