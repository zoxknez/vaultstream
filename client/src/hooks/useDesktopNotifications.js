/**
 * 🔔 DESKTOP NOTIFICATIONS HOOK
 * Electron/Web notifications for playback events
 */

import { useCallback, useEffect } from 'react';

/**
 * Request notification permission
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show desktop notification
 */
function showNotification(title, options = {}) {
  if (Notification.permission === 'granted') {
    return new Notification(title, {
      icon: '/leaf.svg',
      badge: '/leaf.svg',
      ...options
    });
  }
  return null;
}

/**
 * useDesktopNotifications hook
 * @param {Object} options - Notification options
 * @param {boolean} options.enabled - Enable notifications
 * @param {boolean} options.notifyOnPlay - Notify when playback starts
 * @param {boolean} options.notifyOnPause - Notify when playback pauses
 * @param {boolean} options.notifyOnEnd - Notify when playback ends
 * @param {boolean} options.notifyOnError - Notify on errors
 * @param {boolean} options.notifyOnBuffering - Notify when buffering
 */
export function useDesktopNotifications(options = {}) {
  const {
    enabled = true,
    notifyOnPlay = false,
    notifyOnPause = false,
    notifyOnEnd = true,
    notifyOnError = true,
    notifyOnBuffering = false
  } = options;

  // Request permission on mount
  useEffect(() => {
    if (enabled) {
      requestNotificationPermission();
    }
  }, [enabled]);

  // Notification helpers
  const notifyPlay = useCallback(
    (mediaTitle) => {
      if (enabled && notifyOnPlay) {
        showNotification('Now Playing', {
          body: mediaTitle || 'Playback started',
          tag: 'playback-play',
          silent: true
        });
      }
    },
    [enabled, notifyOnPlay]
  );

  const notifyPause = useCallback(
    (mediaTitle) => {
      if (enabled && notifyOnPause) {
        showNotification('Paused', {
          body: mediaTitle || 'Playback paused',
          tag: 'playback-pause',
          silent: true
        });
      }
    },
    [enabled, notifyOnPause]
  );

  const notifyEnd = useCallback(
    (mediaTitle) => {
      if (enabled && notifyOnEnd) {
        showNotification('Playback Complete', {
          body: mediaTitle || 'Finished playing',
          tag: 'playback-end',
          silent: true
        });
      }
    },
    [enabled, notifyOnEnd]
  );

  const notifyError = useCallback(
    (errorMessage) => {
      if (enabled && notifyOnError) {
        showNotification('Playback Error', {
          body: errorMessage || 'An error occurred during playback',
          tag: 'playback-error',
          requireInteraction: true
        });
      }
    },
    [enabled, notifyOnError]
  );

  const notifyBuffering = useCallback(
    (bufferPercent) => {
      if (enabled && notifyOnBuffering) {
        showNotification('Buffering', {
          body: `Buffering... ${bufferPercent || 0}%`,
          tag: 'playback-buffer',
          silent: true
        });
      }
    },
    [enabled, notifyOnBuffering]
  );

  const notifyCustom = useCallback(
    (title, body, options = {}) => {
      if (enabled) {
        return showNotification(title, {
          body,
          silent: true,
          ...options
        });
      }
      return null;
    },
    [enabled]
  );

  return {
    notifyPlay,
    notifyPause,
    notifyEnd,
    notifyError,
    notifyBuffering,
    notifyCustom,
    requestPermission: requestNotificationPermission
  };
}

export default useDesktopNotifications;
