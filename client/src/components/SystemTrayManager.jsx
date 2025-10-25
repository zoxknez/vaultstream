/**
 * 🎯 SYSTEM TRAY MANAGER COMPONENT
 * Handles tray integration and menu navigation
 */

import { useEffect } from 'react';
import { useSyncQueueSize } from '../hooks/useSyncStore';
import { useSystemTray } from '../hooks/useSystemTray';

const SystemTrayManager = () => {
  const { updateBadge, isElectron } = useSystemTray();
  const activeDownloads = useSyncQueueSize();

  // Update tray badge when active downloads change
  useEffect(() => {
    if (isElectron && activeDownloads !== undefined) {
      updateBadge(activeDownloads);
    }
  }, [activeDownloads, updateBadge, isElectron]);

  // This component doesn't render anything
  return null;
};

export default SystemTrayManager;
