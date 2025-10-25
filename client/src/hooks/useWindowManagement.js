/**
 * 🪟 WINDOW MANAGEMENT HOOK
 * Multi-window support, mini player, always on top
 */

import { useCallback, useEffect, useState } from 'react';

/**
 * useWindowManagement hook
 * Manages Electron window features
 */
export function useWindowManagement() {
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [windowBounds, setWindowBounds] = useState(null);
  const [displayInfo, setDisplayInfo] = useState(null);
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  // Get initial window state
  useEffect(() => {
    if (!isElectron) return;

    // Get always on top status
    window.electronAPI.window.getAlwaysOnTop().then((result) => {
      setIsAlwaysOnTop(result.alwaysOnTop);
    });

    // Get window bounds
    window.electronAPI.window.getBounds().then((bounds) => {
      setWindowBounds(bounds);
    });

    // Get display info
    window.electronAPI.window.getDisplayInfo().then((info) => {
      setDisplayInfo(info);
    });
  }, [isElectron]);

  // Create mini player
  const createMiniPlayer = useCallback(
    async (videoData) => {
      if (!isElectron) return { success: false };

      try {
        const result = await window.electronAPI.window.createMiniPlayer(videoData);
        return result;
      } catch (error) {
        console.error('Failed to create mini player:', error);
        return { success: false, error: error.message };
      }
    },
    [isElectron]
  );

  // Close mini player
  const closeMiniPlayer = useCallback(async () => {
    if (!isElectron) return { success: false };

    try {
      const result = await window.electronAPI.window.closeMiniPlayer();
      return result;
    } catch (error) {
      console.error('Failed to close mini player:', error);
      return { success: false, error: error.message };
    }
  }, [isElectron]);

  // Toggle always on top
  const toggleAlwaysOnTop = useCallback(async () => {
    if (!isElectron) return;

    const newValue = !isAlwaysOnTop;
    try {
      await window.electronAPI.window.setAlwaysOnTop(newValue);
      setIsAlwaysOnTop(newValue);
    } catch (error) {
      console.error('Failed to toggle always on top:', error);
    }
  }, [isElectron, isAlwaysOnTop]);

  // Set window bounds
  const setWindowBoundsCustom = useCallback(
    async (bounds) => {
      if (!isElectron) return { success: false };

      try {
        const result = await window.electronAPI.window.setBounds(bounds);
        if (result.success) {
          setWindowBounds(bounds);
        }
        return result;
      } catch (error) {
        console.error('Failed to set window bounds:', error);
        return { success: false, error: error.message };
      }
    },
    [isElectron]
  );

  // Center window
  const centerWindow = useCallback(async () => {
    if (!isElectron) return { success: false };

    try {
      const result = await window.electronAPI.window.center();
      if (result.success) {
        // Update bounds
        const bounds = await window.electronAPI.window.getBounds();
        setWindowBounds(bounds);
      }
      return result;
    } catch (error) {
      console.error('Failed to center window:', error);
      return { success: false, error: error.message };
    }
  }, [isElectron]);

  // Get current window bounds
  const refreshWindowBounds = useCallback(async () => {
    if (!isElectron) return null;

    try {
      const bounds = await window.electronAPI.window.getBounds();
      setWindowBounds(bounds);
      return bounds;
    } catch (error) {
      console.error('Failed to get window bounds:', error);
      return null;
    }
  }, [isElectron]);

  return {
    isElectron,
    isAlwaysOnTop,
    windowBounds,
    displayInfo,
    createMiniPlayer,
    closeMiniPlayer,
    toggleAlwaysOnTop,
    setWindowBounds: setWindowBoundsCustom,
    centerWindow,
    refreshWindowBounds
  };
}

export default useWindowManagement;
