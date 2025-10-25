import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { usePollingWithBackoff } from '../hooks/usePollingWithBackoff';
import { getTorrentsWithRetry } from '../services/api';
import ErrorBoundary from './ErrorBoundary';
import { formatErrorMessage } from '../utils/errorUtils';
import './TorrentList.css';

const TorrentList = ({ refreshSignal }) => {
  const [pollingInterval, setPollingInterval] = useState(5000);

  const {
    data,
    isLoading,
    error,
    refetch
  } = usePollingWithBackoff(
    getTorrentsWithRetry,
    pollingInterval,
    true,
    30000,
    true
  );

  useEffect(() => {
    if (refreshSignal !== undefined) {
      refetch();
    }
  }, [refreshSignal, refetch]);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec) return '0 B/s';
    return `${formatSize(bytesPerSec)}/s`;
  };

  return (
    <div className="torrent-list-wrapper">
      <div className="torrent-list-toolbar">
        <div>
          <h3 className="torrent-row-title">Aktivni torenti</h3>
          <p className="torrent-row-meta-text">Automatsko osvežavanje uz adaptivno anketiranje pozadine.</p>
        </div>
        <div className="torrent-toolbar-actions">
          <button className="torrent-refresh-btn" onClick={refetch}>
            <RefreshCw size={16} />
            Osveži sada
          </button>
          <select
            className="torrent-interval-select"
            value={pollingInterval}
            onChange={(e) => setPollingInterval(parseInt(e.target.value, 10))}
          >
            <option value="2000">2s</option>
            <option value="5000">5s</option>
            <option value="10000">10s</option>
            <option value="30000">30s</option>
          </select>
        </div>
      </div>

      {isLoading && !data && (
        <div className="torrent-state-card">Učitavam podatke o torrentima...</div>
      )}

      {error && (
        <div className="torrent-state-card">
          <strong>Došlo je do greške:</strong>
          <div style={{ marginTop: '4px' }}>{formatErrorMessage(error, 'Nije moguće učitati torente.')}</div>
          <button className="torrent-refresh-btn" style={{ marginTop: 'var(--space-sm)' }} onClick={refetch}>
            <RefreshCw size={16} />
            Pokušaj ponovo
          </button>
        </div>
      )}

      {!error && data && data.torrents && data.torrents.length === 0 && (
        <div className="torrent-state-card">
          Nema aktivnih torrenata. Dodaj novi preko pretrage ili uvezi .torrent datoteku.
        </div>
      )}

      {data && data.torrents && data.torrents.length > 0 && (
        <div className="torrent-grid">
          {data.torrents.map((torrent) => (
            <Link
              to={`/torrent/${torrent.infoHash}`}
              key={torrent.infoHash}
              className="torrent-row-card floating-card"
            >
              <div className="torrent-row-header">
                <h4 className="torrent-row-title">{torrent.name}</h4>
                <span className="torrent-row-progress-value">
                  {(torrent.progress * 100).toFixed(0)}%
                </span>
              </div>
              <div className="torrent-row-meta">
                <span>Veličina: {formatSize(torrent.size)}</span>
                <span>Brzina: {formatSpeed(torrent.downloadSpeed)}</span>
                <span>Peerovi: {torrent.peers}</span>
              </div>
              <div className="torrent-progress-track">
                <div
                  className="torrent-progress-fill"
                  style={{ width: `${Math.max(0, Math.min(100, torrent.progress * 100))}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// Wrap with error boundary
const TorrentListWithErrorBoundary = ({ refreshSignal }) => (
  <ErrorBoundary onRetry={() => window.location.reload()}>
    <TorrentList refreshSignal={refreshSignal} />
  </ErrorBoundary>
);

export default TorrentListWithErrorBoundary;
