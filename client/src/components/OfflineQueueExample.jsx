// 🌐 StreamVault - Offline Queue Usage Example
// How to use offline queue in torrent operations

import useOffline from '../hooks/useOffline';

export default function TorrentExample() {
  const { isOnline, isOffline, queueCount, fetchWithOfflineSupport } = useOffline();

  const addTorrent = async (magnetLink) => {
    try {
      // This will queue if offline, or execute immediately if online
      const response = await fetchWithOfflineSupport('/api/torrents/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet: magnetLink })
      });

      if (response.ok) {
        console.log('Torrent added successfully');
      }
    } catch (error) {
      if (error.message.includes('Offline')) {
        console.log('Torrent queued for when you are back online');
        // Show user notification that operation was queued
      } else {
        console.error('Failed to add torrent:', error);
      }
    }
  };

  return (
    <div>
      {isOffline && (
        <div className="offline-badge">Offline mode - {queueCount} operations queued</div>
      )}

      {isOnline && queueCount > 0 && (
        <div className="sync-badge">Syncing {queueCount} operations...</div>
      )}

      <button onClick={() => addTorrent('magnet:?xt=...')}>
        Add Torrent {isOffline && '(will queue)'}
      </button>
    </div>
  );
}
