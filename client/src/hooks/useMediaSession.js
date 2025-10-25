/**
 * 🎮 MEDIA SESSION HOOK
 * Desktop Media Session API integration
 * Enables system media controls (keyboard, headphones, macOS Touch Bar)
 */

import { useEffect } from 'react';

/**
 * useMediaSession hook
 * @param {Object} options - Media session options
 * @param {string} options.title - Media title
 * @param {string} options.artist - Artist/series name
 * @param {string} options.album - Album/season name
 * @param {string} options.artwork - Artwork URL
 * @param {Function} options.onPlay - Play callback
 * @param {Function} options.onPause - Pause callback
 * @param {Function} options.onSeekBackward - Seek backward callback
 * @param {Function} options.onSeekForward - Seek forward callback
 * @param {Function} options.onPreviousTrack - Previous track callback
 * @param {Function} options.onNextTrack - Next track callback
 */
export function useMediaSession(options = {}) {
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      console.warn('Media Session API not supported');
      return;
    }

    const {
      title = 'StreamVault',
      artist = '',
      album = '',
      artwork = [],
      onPlay,
      onPause,
      onSeekBackward,
      onSeekForward,
      onPreviousTrack,
      onNextTrack
    } = options;

    // Set metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
      artwork: Array.isArray(artwork)
        ? artwork
        : [
            { src: artwork || '/leaf.svg', sizes: '96x96', type: 'image/svg+xml' },
            { src: artwork || '/leaf.svg', sizes: '128x128', type: 'image/svg+xml' },
            { src: artwork || '/leaf.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: artwork || '/leaf.svg', sizes: '256x256', type: 'image/svg+xml' },
            { src: artwork || '/leaf.svg', sizes: '384x384', type: 'image/svg+xml' },
            { src: artwork || '/leaf.svg', sizes: '512x512', type: 'image/svg+xml' }
          ]
    });

    // Set action handlers
    const handlers = {
      play: onPlay,
      pause: onPause,
      seekbackward: onSeekBackward,
      seekforward: onSeekForward,
      previoustrack: onPreviousTrack,
      nexttrack: onNextTrack
    };

    Object.entries(handlers).forEach(([action, handler]) => {
      if (handler) {
        navigator.mediaSession.setActionHandler(action, handler);
      }
    });

    // Set position state (will be updated externally)
    const updatePositionState = (currentTime, duration, playbackRate = 1.0) => {
      if ('setPositionState' in navigator.mediaSession) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration || 0,
            playbackRate: playbackRate || 1.0,
            position: currentTime || 0
          });
        } catch (error) {
          console.warn('Failed to set position state:', error);
        }
      }
    };

    // Expose updatePositionState
    if (options.onPositionStateChange) {
      options.onPositionStateChange(updatePositionState);
    }

    return () => {
      // Clear all handlers
      Object.keys(handlers).forEach((action) => {
        navigator.mediaSession.setActionHandler(action, null);
      });
    };
  }, [options]);
}

/**
 * Update playback state
 */
export function updateMediaSessionPlaybackState(state) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = state; // 'playing', 'paused', 'none'
  }
}

export default useMediaSession;
