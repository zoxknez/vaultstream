/**
 * useConcurrent Hook - React 19 Concurrent Features
 *
 * Custom hooks for leveraging React 19's concurrent rendering capabilities
 * to improve performance and user experience on slower devices.
 *
 * @module hooks/useConcurrent
 */

import { useCallback, useDeferredValue, useState, useTransition } from 'react';

/**
 * useOptimisticTransition Hook
 *
 * Wrapper around useTransition with loading state and error handling.
 * Use for non-blocking updates that should not interrupt user interaction.
 *
 * @returns {Array} [isPending, startTransition, error]
 *
 * @example
 * const [isPending, startTransition, error] = useOptimisticTransition();
 *
 * const handleSearch = (query) => {
 *   startTransition(() => {
 *     setSearchResults(expensiveSearch(query));
 *   });
 * };
 */
export const useOptimisticTransition = () => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const wrappedStartTransition = useCallback(
    (callback) => {
      setError(null);
      startTransition(() => {
        try {
          callback();
        } catch (err) {
          setError(err);
          console.error('[Transition Error]', err);
        }
      });
    },
    [startTransition]
  );

  return [isPending, wrappedStartTransition, error];
};

/**
 * useDeferredSearch Hook
 *
 * Optimized search with deferred value to prevent UI blocking.
 * Combines useDeferredValue with useTransition for smooth search experience.
 *
 * @param {string} initialQuery - Initial search query
 * @returns {Object} { query, deferredQuery, setQuery, isPending }
 *
 * @example
 * const { query, deferredQuery, setQuery, isPending } = useDeferredSearch('');
 *
 * // Use query for input value (instant updates)
 * <input value={query} onChange={(e) => setQuery(e.target.value)} />
 *
 * // Use deferredQuery for expensive operations (delayed updates)
 * const results = expensiveSearch(deferredQuery);
 */
export const useDeferredSearch = (initialQuery = '') => {
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const isPending = query !== deferredQuery;

  return {
    query,
    deferredQuery,
    setQuery,
    isPending
  };
};

/**
 * useDeferredList Hook
 *
 * Optimized list rendering with deferred value.
 * Prevents UI blocking when filtering/sorting large lists.
 *
 * @param {Array} list - List of items
 * @param {number} delay - Optional delay for deferred update (ms)
 * @returns {Object} { items, deferredItems, isPending }
 *
 * @example
 * const { items, deferredItems, isPending } = useDeferredList(torrents);
 *
 * // Render with deferredItems to prevent blocking
 * {deferredItems.map(item => <TorrentCard key={item.id} torrent={item} />)}
 */
export const useDeferredList = (list, delay = 0) => {
  const [items, setItems] = useState(list);
  const deferredItems = useDeferredValue(items);
  const isPending = items !== deferredItems;

  // Update items with optional delay
  const updateItems = useCallback(
    (newList) => {
      if (delay > 0) {
        setTimeout(() => setItems(newList), delay);
      } else {
        setItems(newList);
      }
    },
    [delay]
  );

  return {
    items,
    deferredItems,
    isPending,
    setItems: updateItems
  };
};

/**
 * useConcurrentState Hook
 *
 * State management with concurrent updates.
 * Wraps setState in startTransition for non-blocking updates.
 *
 * @param {*} initialValue - Initial state value
 * @returns {Array} [state, setState, isPending]
 *
 * @example
 * const [torrents, setTorrents, isPending] = useConcurrentState([]);
 *
 * // Update will not block UI
 * setTorrents(newTorrents);
 */
export const useConcurrentState = (initialValue) => {
  const [state, setState] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const setConcurrentState = useCallback((value) => {
    startTransition(() => {
      setState(value);
    });
  }, []);

  return [state, setConcurrentState, isPending];
};

/**
 * usePriorityUpdate Hook
 *
 * Separates urgent and non-urgent state updates.
 * Urgent updates happen immediately, non-urgent use transitions.
 *
 * @param {*} initialValue - Initial state value
 * @returns {Object} { value, setUrgent, setDeferred, isPending }
 *
 * @example
 * const { value, setUrgent, setDeferred, isPending } = usePriorityUpdate(0);
 *
 * // Urgent: User input, immediate feedback
 * setUrgent(newValue);
 *
 * // Deferred: Heavy computation, can be delayed
 * setDeferred(expensiveCalculation());
 */
export const usePriorityUpdate = (initialValue) => {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const setUrgent = useCallback((newValue) => {
    setValue(newValue);
  }, []);

  const setDeferred = useCallback((newValue) => {
    startTransition(() => {
      setValue(newValue);
    });
  }, []);

  return {
    value,
    setUrgent,
    setDeferred,
    isPending
  };
};

/**
 * useSmartUpdate Hook
 *
 * Automatically determines whether to use urgent or deferred update
 * based on data size/complexity.
 *
 * @param {*} initialValue - Initial state value
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Size threshold for deferred updates (default: 100)
 * @returns {Array} [value, smartSetValue, isPending]
 *
 * @example
 * const [items, setItems, isPending] = useSmartUpdate([], { threshold: 50 });
 *
 * // Automatically uses transition if array length > 50
 * setItems(newItems);
 */
export const useSmartUpdate = (initialValue, options = {}) => {
  const { threshold = 100 } = options;
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const smartSetValue = useCallback(
    (newValue) => {
      // Determine if value is "heavy" and needs deferred update
      const isHeavy =
        (Array.isArray(newValue) && newValue.length > threshold) ||
        (typeof newValue === 'object' && Object.keys(newValue || {}).length > threshold);

      if (isHeavy) {
        // Use transition for heavy updates
        startTransition(() => {
          setValue(newValue);
        });
      } else {
        // Use urgent update for light updates
        setValue(newValue);
      }
    },
    [threshold, startTransition]
  );

  return [value, smartSetValue, isPending];
};

/**
 * Utility: Check if concurrent features are available
 */
export const isConcurrentModeAvailable = () => {
  try {
    return typeof useTransition === 'function' && typeof useDeferredValue === 'function';
  } catch {
    return false;
  }
};

// Default export with all hooks
export default {
  useOptimisticTransition,
  useDeferredSearch,
  useDeferredList,
  useConcurrentState,
  usePriorityUpdate,
  useSmartUpdate,
  isConcurrentModeAvailable
};
