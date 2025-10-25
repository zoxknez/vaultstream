const STORAGE_KEY = 'seedboxlite_server_session';

let state = {
  csrfToken: null,
  authenticated: false,
  lastAuthenticatedAt: null
};

const subscribers = new Set();

const isBrowser = typeof window !== 'undefined';

const persistState = () => {
  if (!isBrowser) return;

  const payload = {
    csrfToken: state.csrfToken,
    authenticated: state.authenticated,
    lastAuthenticatedAt: state.lastAuthenticatedAt
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Unable to persist server session state', error);
  }
};

const notify = () => {
  subscribers.forEach((callback) => {
    try {
      callback({ ...state });
    } catch (error) {
      console.error('Server session subscriber error', error);
    }
  });
};

const initialize = () => {
  if (!isBrowser) return;

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        state = {
          csrfToken: parsed.csrfToken || null,
          authenticated: Boolean(parsed.authenticated && parsed.csrfToken),
          lastAuthenticatedAt: parsed.lastAuthenticatedAt || null
        };
      }
    }
  } catch (error) {
    console.warn('Failed to restore server session state', error);
  }
};

initialize();

const setState = (partial) => {
  state = {
    ...state,
    ...partial
  };

  if (!state.csrfToken) {
    state.authenticated = false;
    state.lastAuthenticatedAt = null;
  }

  persistState();
  notify();
};

export const getSessionSnapshot = () => ({ ...state });

export const subscribeToServerSession = (listener) => {
  subscribers.add(listener);
  listener({ ...state });

  return () => {
    subscribers.delete(listener);
  };
};

export const setCsrfToken = (token) => {
  if (!token) {
    clearServerSession();
    return;
  }

  setState({
    csrfToken: token,
    authenticated: true,
    lastAuthenticatedAt: new Date().toISOString()
  });
};

export const clearServerSession = () => {
  setState({
    csrfToken: null,
    authenticated: false,
    lastAuthenticatedAt: null
  });
};

export const getCsrfHeader = () => {
  if (!state.csrfToken) {
    return {};
  }

  return {
    'X-Seedbox-CSRF': state.csrfToken
  };
};
