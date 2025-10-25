/**
 * 🖥️ ELECTRON FULLSCREEN HOOK
 * Electron-specific fullscreen API integration
 * Better than HTML5 fullscreen for desktop apps
 */

import { useCallback, useEffect, useState } from 'react';

/**
 * useElectronFullscreen hook
 * @returns {Object} - Fullscreen state and controls
 */
export function useElectronFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isElectronAvailable] = useState(() => !!window.electronAPI);

  // Check if Electron fullscreen is available
  const supportsElectronFullscreen = isElectronAvailable;

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    if (supportsElectronFullscreen) {
      // Use Electron's native fullscreen
      window.electronAPI.window.toggleFullscreen();
      setIsFullscreen(true);
    } else {
      // Fallback to HTML5 fullscreen
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
        setIsFullscreen(true);
      } catch (error) {
        console.error('Failed to enter fullscreen:', error);
      }
    }
  }, [supportsElectronFullscreen]);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    if (supportsElectronFullscreen) {
      window.electronAPI.window.toggleFullscreen();
      setIsFullscreen(false);
    } else {
      // Fallback to HTML5 fullscreen
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
        setIsFullscreen(false);
      } catch (error) {
        console.error('Failed to exit fullscreen:', error);
      }
    }
  }, [supportsElectronFullscreen]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

      setIsFullscreen(!!isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    supportsElectronFullscreen
  };
}

/**
 * useVideoKeyboardShortcuts hook
 * Desktop keyboard shortcuts for video player
 */
export function useVideoKeyboardShortcuts(callbacks = {}) {
  useEffect(() => {
    const {
      onPlayPause,
      onSeekForward,
      onSeekBackward,
      onVolumeUp,
      onVolumeDown,
      onToggleMute,
      onToggleFullscreen,
      onToggleSubtitles,
      onSpeedUp,
      onSpeedDown
    } = callbacks;

    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ': // Space
        case 'k':
          e.preventDefault();
          onPlayPause?.();
          break;

        case 'arrowright':
        case 'l':
          e.preventDefault();
          if (e.shiftKey) {
            onSeekForward?.(30); // Shift + Right = 30s
          } else {
            onSeekForward?.(5); // Right = 5s
          }
          break;

        case 'arrowleft':
        case 'j':
          e.preventDefault();
          if (e.shiftKey) {
            onSeekBackward?.(30); // Shift + Left = 30s
          } else {
            onSeekBackward?.(5); // Left = 5s
          }
          break;

        case 'arrowup':
          e.preventDefault();
          onVolumeUp?.(0.1);
          break;

        case 'arrowdown':
          e.preventDefault();
          onVolumeDown?.(0.1);
          break;

        case 'm':
          e.preventDefault();
          onToggleMute?.();
          break;

        case 'f':
          e.preventDefault();
          onToggleFullscreen?.();
          break;

        case 'c':
          e.preventDefault();
          onToggleSubtitles?.();
          break;

        case '>':
        case '.':
          e.preventDefault();
          onSpeedUp?.();
          break;

        case '<':
        case ',':
          e.preventDefault();
          onSpeedDown?.();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callbacks]);
}

export default useElectronFullscreen;
