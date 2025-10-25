/**
 * 🏪 SESSION STORE - React 19 useSyncExternalStore Pattern
 * Optimized external store for server session state
 * Eliminates unnecessary re-renders with granular selectors
 */

import { getSessionSnapshot, subscribeToServerSession } from '../services/serverSession';

// Internal store state
let sessionState = getSessionSnapshot();
let listeners = new Set();

// Notify all listeners
function notifyListeners() {
  listeners.forEach((listener) => listener());
}

// Subscribe to external session changes
subscribeToServerSession((nextSession) => {
  sessionState = nextSession;
  notifyListeners();
});

// ✅ Store API
export const sessionStore = {
  /**
   * Subscribe to store changes
   */
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Get current snapshot
   */
  getSnapshot() {
    return sessionState;
  },

  /**
   * Get server snapshot (for SSR - not used in Electron)
   */
  getServerSnapshot() {
    return {
      authenticated: false,
      csrfToken: null,
      lastAuthenticatedAt: null
    };
  },

  /**
   * Update session state
   */
  updateSession(newSession) {
    sessionState = newSession;
    notifyListeners();
  }
};

// ✅ Granular Selectors
// These prevent unnecessary re-renders by selecting only needed data

/**
 * Select authentication status
 */
export function selectIsAuthenticated(state) {
  return state.authenticated;
}

/**
 * Select CSRF token
 */
export function selectCsrfToken(state) {
  return state.csrfToken;
}

/**
 * Select last authenticated timestamp
 */
export function selectLastAuthenticatedAt(state) {
  return state.lastAuthenticatedAt;
}

/**
 * Select session validity
 */
export function selectIsSessionValid(state) {
  if (!state.authenticated || !state.lastAuthenticatedAt) {
    return false;
  }

  const now = Date.now();
  const sessionAge = now - state.lastAuthenticatedAt;
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  return sessionAge < maxAge;
}

/**
 * Select full session object (use sparingly)
 */
export function selectSession(state) {
  return state;
}

// Export default store
export default sessionStore;
