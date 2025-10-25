/**
 * 🎹 KEYBOARD NAVIGATION HOOK
 * Enables accessible keyboard navigation for interactive elements
 * Supports Arrow keys, Tab, Enter, Escape, Home, End
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * useKeyboardNav hook
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether keyboard navigation is enabled
 * @param {string} options.orientation - 'horizontal' or 'vertical'
 * @param {boolean} options.loop - Whether to loop from end to start
 * @param {Function} options.onSelect - Callback when item is selected (Enter/Space)
 * @param {Function} options.onEscape - Callback when Escape is pressed
 * @returns {Object} - Ref and handlers
 */
export function useKeyboardNav(options = {}) {
  const { enabled = true, orientation = 'horizontal', loop = true, onSelect, onEscape } = options;

  const containerRef = useRef(null);
  const focusedIndexRef = useRef(0);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    return Array.from(containerRef.current.querySelectorAll(selector));
  }, []);

  const focusElement = useCallback(
    (index) => {
      const elements = getFocusableElements();
      if (elements.length === 0) return;

      let targetIndex = index;

      if (loop) {
        targetIndex = ((index % elements.length) + elements.length) % elements.length;
      } else {
        targetIndex = Math.max(0, Math.min(index, elements.length - 1));
      }

      focusedIndexRef.current = targetIndex;
      elements[targetIndex]?.focus();
    },
    [getFocusableElements, loop]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled) return;

      const elements = getFocusableElements();
      const currentIndex = elements.findIndex((el) => el === document.activeElement);

      if (currentIndex === -1) return;

      const isHorizontal = orientation === 'horizontal';
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

      switch (e.key) {
        case nextKey:
          e.preventDefault();
          focusElement(currentIndex + 1);
          break;

        case prevKey:
          e.preventDefault();
          focusElement(currentIndex - 1);
          break;

        case 'Home':
          e.preventDefault();
          focusElement(0);
          break;

        case 'End':
          e.preventDefault();
          focusElement(elements.length - 1);
          break;

        case 'Enter':
        case ' ': // Space
          if (onSelect && document.activeElement) {
            e.preventDefault();
            onSelect(document.activeElement, currentIndex);
          }
          break;

        case 'Escape':
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          break;

        default:
          break;
      }
    },
    [enabled, orientation, getFocusableElements, focusElement, onSelect, onEscape]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  return {
    ref: containerRef,
    focusElement,
    getFocusableElements
  };
}

/**
 * useKeyboardShortcuts hook
 * Global keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts = {}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      Object.entries(shortcuts).forEach(([shortcut, callback]) => {
        const parts = shortcut.toLowerCase().split('+');
        const shortcutKey = parts[parts.length - 1];

        const matchesKey = key === shortcutKey;
        const matchesCtrl = parts.includes('ctrl') === ctrl;
        const matchesShift = parts.includes('shift') === shift;
        const matchesAlt = parts.includes('alt') === alt;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
          e.preventDefault();
          callback(e);
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

export default useKeyboardNav;
