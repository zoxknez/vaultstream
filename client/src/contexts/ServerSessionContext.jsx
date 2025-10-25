import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ApiError from '../utils/ApiError';
import {
  getSessionSnapshot,
  subscribeToServerSession,
  clearServerSession
} from '../services/serverSession';
import {
  loginToServer,
  logoutFromServer
} from '../services/serverAuthService';

const ServerSessionContext = createContext({
  session: {
    authenticated: false,
    csrfToken: null,
    lastAuthenticatedAt: null
  },
  loading: false,
  error: null,
  login: async () => {},
  logout: async () => {},
  resetError: () => {}
});

export const ServerSessionProvider = ({ children }) => {
  const [session, setSession] = useState(() => getSessionSnapshot());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToServerSession((nextSession) => {
      setSession(nextSession);
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (password) => {
    setLoading(true);
    setError(null);

    try {
      const result = await loginToServer(password);
      setError(null);
      return result;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : (err?.message || 'Unable to authenticate.');
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
      const message = err instanceof ApiError ? err.message : (err?.message || 'Logout failed.');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  const value = useMemo(() => ({
    session,
    loading,
    error,
    login,
    logout,
    resetError
  }), [session, loading, error, login, logout, resetError]);

  return (
    <ServerSessionContext.Provider value={value}>
      {children}
    </ServerSessionContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useServerSession = () => {
  const context = useContext(ServerSessionContext);
  if (!context) {
    throw new Error('useServerSession must be used within a ServerSessionProvider');
  }
  return context;
};
