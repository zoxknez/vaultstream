/**
 * 🎯 FOCUS TRAP HOOK
 * Traps focus within a container (for modals, dropdowns, etc.)
 * Ensures keyboard navigation stays within the active element
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * useFocusTrap hook
 * @param {boolean} isActive - Whether the focus trap is active
 * @param {Object} options - Configuration options
 * @returns {Object} - Ref to attach to container
 */
export function useFocusTrap(isActive = false, options = {}) {
  const { initialFocus = null, returnFocus = true, allowOutsideClick = false } = options;

  const containerRef = useRef(null);
  const previousActiveElement = useRef(null);

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

  const handleKeyDown = useCallback(
    (e) => {
      if (!isActive || e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab (backwards)
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab (forwards)
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    },
    [isActive, getFocusableElements]
  );

  const handleClickOutside = useCallback(
    (e) => {
      if (
        !isActive ||
        allowOutsideClick ||
        !containerRef.current ||
        containerRef.current.contains(e.target)
      ) {
        return;
      }

      // Clicked outside - prevent focus loss
      e.preventDefault();
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    },
    [isActive, allowOutsideClick, getFocusableElements]
  );

  useEffect(() => {
    if (!isActive) return;

    // Store previous active element
    previousActiveElement.current = document.activeElement;

    // Focus initial element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      if (initialFocus && containerRef.current?.contains(initialFocus)) {
        initialFocus.focus();
      } else {
        focusableElements[0].focus();
      }
    }

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);

      // Return focus to previous element
      if (returnFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [
    isActive,
    handleKeyDown,
    handleClickOutside,
    getFocusableElements,
    initialFocus,
    returnFocus
  ]);

  return containerRef;
}

/**
 * useFocusVisible hook
 * Tracks when focus should be visible (keyboard navigation)
 */
export function useFocusVisible() {
  const isMouseDownRef = useRef(false);

  useEffect(() => {
    const handleMouseDown = () => {
      isMouseDownRef.current = true;
    };

    const handleKeyDown = () => {
      isMouseDownRef.current = false;
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return () => !isMouseDownRef.current;
}

export default useFocusTrap;
