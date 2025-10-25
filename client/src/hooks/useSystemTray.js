/**
 * 🎯 SYSTEM TRAY INTEGRATION HOOK
 * Badge updates and tray notifications
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * useSystemTray hook
 * Integrates with Electron system tray
 */
export function useSystemTray() {
  const navigate = useNavigate();
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  // Listen for navigation events from menu
  useEffect(() => {
    if (!isElectron) return;

    const unsubscribers = [];

    // Navigate to route
    const unsubNavigate = window.electronAPI.navigation.onNavigateTo((route) => {
      console.log('📍 Navigating to:', route);
      navigate(route);
    });
    unsubscribers.push(unsubNavigate);

    // Focus search
    const unsubFocusSearch = window.electronAPI.navigation.onFocusSearch(() => {
      console.log('🔍 Focusing search');
      // Trigger search focus event
      const searchInput = document.querySelector(
        'input[type="search"], input[placeholder*="Search"]'
      );
      if (searchInput) {
        searchInput.focus();
      }
    });
    unsubscribers.push(unsubFocusSearch);

    // Open torrent file
    const unsubOpenTorrent = window.electronAPI.navigation.onOpenTorrentFile((filePath) => {
      console.log('📂 Opening torrent file:', filePath);
      // Dispatch custom event for torrent file
      window.dispatchEvent(new CustomEvent('electron:open-torrent-file', { detail: { filePath } }));
    });
    unsubscribers.push(unsubOpenTorrent);

    // Add magnet link
    const unsubAddMagnet = window.electronAPI.navigation.onAddMagnet(() => {
      console.log('🧲 Opening magnet dialog');
      // Dispatch custom event for magnet link
      window.dispatchEvent(new CustomEvent('electron:add-magnet-link'));
    });
    unsubscribers.push(unsubAddMagnet);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [isElectron, navigate]);

  // Update tray badge
  const updateBadge = async (count) => {
    if (!isElectron) return;

    try {
      await window.electronAPI.tray.updateBadge(count);
    } catch (error) {
      console.error('Failed to update tray badge:', error);
    }
  };

  // Show tray notification
  const showTrayNotification = async (title, message, icon) => {
    if (!isElectron) return;

    try {
      await window.electronAPI.tray.showNotification({ title, message, icon });
    } catch (error) {
      console.error('Failed to show tray notification:', error);
    }
  };

  return {
    updateBadge,
    showTrayNotification,
    isElectron
  };
}

export default useSystemTray;
