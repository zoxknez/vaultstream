// 🔗 StreamVault - Protocol Handler Hook
// Handles deep links (streamvault://) and magnet links (magnet:)

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function useProtocolHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.electron) {
      console.log('[Protocol] Not running in Electron');
      return;
    }

    // Handle magnet links
    const unsubscribeMagnet = window.electron.protocol.onMagnetLink((magnetLink) => {
      console.log('[Protocol] Received magnet link:', magnetLink);

      // Navigate to torrents page
      navigate('/torrents');

      // Dispatch custom event with magnet link data
      window.dispatchEvent(
        new CustomEvent('magnet-link', {
          detail: { magnetLink }
        })
      );
    });

    // Handle deep links (streamvault://route)
    const unsubscribeDeepLink = window.electron.protocol.onDeepLink((route) => {
      console.log('[Protocol] Received deep link:', route);

      // Parse route and navigate
      // Examples:
      // streamvault://home -> /
      // streamvault://search/query -> /search?q=query
      // streamvault://torrents -> /torrents
      // streamvault://play/torrent-hash -> /torrents (with auto-play)

      if (route === 'home' || route === '') {
        navigate('/');
      } else if (route.startsWith('search/')) {
        const query = route.replace('search/', '');
        navigate(`/search?q=${encodeURIComponent(query)}`);
      } else if (route.startsWith('play/')) {
        const torrentHash = route.replace('play/', '');
        navigate('/torrents');

        // Dispatch custom event to auto-play torrent
        window.dispatchEvent(
          new CustomEvent('auto-play-torrent', {
            detail: { torrentHash }
          })
        );
      } else {
        // Direct route navigation
        navigate(`/${route}`);
      }
    });

    return () => {
      unsubscribeMagnet();
      unsubscribeDeepLink();
    };
  }, [navigate]);
}
