const isBrowser = typeof window !== 'undefined';

export const LOCAL_EVENTS = {
  COLLECTIONS: 'collections:updated',
  WATCHLIST: 'watchlist:updated',
  HISTORY: 'history:updated',
  CONTINUE_WATCHING: 'continueWatching:updated'
};

export const emitLocalEvent = (eventName, detail = {}) => {
  if (!isBrowser) {
    return;
  }

  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  } catch (error) {
    console.warn('Failed to dispatch local event', eventName, error);
  }
};

export const addLocalEventListener = (eventName, handler) => {
  if (!isBrowser || typeof handler !== 'function') {
    return () => {};
  }

  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
};
