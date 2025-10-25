// 🔗 StreamVault - Protocol Handler Integration Example
// How to listen for magnet links and auto-play events in TorrentsPage

import { useEffect } from 'react';

export default function TorrentsPageExample() {
  // Listen for magnet links from protocol handler
  useEffect(() => {
    const handleMagnetLink = (event) => {
      const { magnetLink } = event.detail;
      console.log('[TorrentsPage] Received magnet link:', magnetLink);

      // Add torrent to the list
      // addTorrent(magnetLink);

      // Show notification
      if (window.electron) {
        window.electron.tray.showNotification({
          title: 'Magnet Link Received',
          body: 'Adding torrent...'
        });
      }
    };

    const handleAutoPlay = (event) => {
      const { torrentHash } = event.detail;
      console.log('[TorrentsPage] Auto-play torrent:', torrentHash);

      // Find torrent by hash and start playing
      // playTorrent(torrentHash);
    };

    window.addEventListener('magnet-link', handleMagnetLink);
    window.addEventListener('auto-play-torrent', handleAutoPlay);

    return () => {
      window.removeEventListener('magnet-link', handleMagnetLink);
      window.removeEventListener('auto-play-torrent', handleAutoPlay);
    };
  }, []);

  return (
    <div>
      {/* Torrents content */}
      <h1>Torrents</h1>
      <p>Try opening a magnet link or deep link:</p>
      <ul>
        <li>magnet:?xt=urn:btih:HASH</li>
        <li>streamvault://play/HASH</li>
        <li>streamvault://torrents</li>
        <li>streamvault://search/query</li>
      </ul>
    </div>
  );
}
