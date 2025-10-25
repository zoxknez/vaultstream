import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, HardDrive, Activity, Download, RefreshCw, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config/environment';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import ApiError from '../utils/ApiError';
import { markServerSessionInvalid } from '../services/serverAuthService';
import { useServerSession } from '../contexts/ServerSessionContext.jsx';
import ServerSessionStatus from './ServerSessionStatus';
import Footer from './Footer';
import { getTorrents, deleteTorrent, clearAllTorrents } from '../services/api';
import { useToast } from './Toast';
import useConfirmDialog from '../hooks/useConfirmDialog';
import './CacheManagementPage.css';

const CacheManagementPage = () => {
  const navigate = useNavigate();
  const { session } = useServerSession();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [cacheStats, setCacheStats] = useState({
    totalSize: 0,
    totalSizeFormatted: '0 B',
    fileCount: 0,
    activeTorrents: 0,
    torrents: [],
    usagePercentage: 0,
    cacheLimit: 5368709120, // 5GB default
  cacheLimitFormatted: '5 GB',
    directories: [],
    lastUpdated: null
  });
  const [requestConfirm, confirmDialog] = useConfirmDialog();

  const handleUnauthorized = useCallback((message) => {
    markServerSessionInvalid();
    setError(message);
    setCacheStats((prev) => ({
      ...prev,
      torrents: [],
      activeTorrents: 0
    }));
  }, []);

  const loadCacheStats = useCallback(async () => {
    if (!session.authenticated) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      setRefreshing(true);
      const [stats, torrentsData] = await Promise.all([
        fetchWithTimeout(config.getApiUrl('/api/cache/stats'), {}, 8000).then((response) => response.json()),
        getTorrents()
      ]);

      const list = Array.isArray(torrentsData) ? torrentsData : (torrentsData?.torrents || []);
      const directories = Array.isArray(stats?.directories) ? [...stats.directories] : [];
      const computedFileCount = typeof stats?.fileCount === 'number'
        ? stats.fileCount
        : directories.reduce((sum, dir) => sum + (dir.fileCount || 0), 0);

      setCacheStats((previous) => ({
        ...stats,
        fileCount: computedFileCount,
        directories,
        cacheLimit: stats?.cacheLimit ?? previous.cacheLimit,
        cacheLimitFormatted: stats?.cacheLimitFormatted ?? previous.cacheLimitFormatted,
        lastUpdated: stats?.lastUpdated ?? new Date().toISOString(),
        torrents: list,
        activeTorrents: list.length
      }));
    } catch (err) {
      console.error('Error loading cache stats:', err);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        handleUnauthorized('Administrator authentication required to view cache statistics.');
      } else {
        setError(err.message || 'Failed to load cache data.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.authenticated, handleUnauthorized]);

  useEffect(() => {
    loadCacheStats();
  }, [loadCacheStats]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearAllCache = async () => {
    const confirmed = await requestConfirm({
      title: 'Clear cache',
      message: 'Clear entire cache? All active torrents will be stopped. This cannot be undone.',
      confirmLabel: 'Clear Cache',
      cancelLabel: 'Cancel',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    try {
      await fetchWithTimeout(
        config.getApiUrl('/api/cache/clear'),
        {
          method: 'POST',
          withCsrf: true
        },
        7000
      );

      await clearAllTorrents();

      toast.success('Cache je uspešno očišćena.');
      loadCacheStats();
    } catch (err) {
      console.error('Error clearing cache:', err);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        handleUnauthorized('Session expired. Authenticate again to manage cache.');
      } else {
        toast.error('Brisanje cache-a nije uspelo.');
      }
    }
  };

  const clearSingleTorrent = async (infoHash, name) => {
    const confirmed = await requestConfirm({
      title: 'Remove torrent',
      message: `Remove torrent "${name}" from cache?`,
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    try {
      const result = await deleteTorrent(infoHash);
      const message = result?.data?.message || 'Torrent je uklonjen iz cache-a.';
      toast.success(message);
      loadCacheStats();
    } catch (err) {
      console.error('Error removing torrent:', err);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        handleUnauthorized('Session expired. Authenticate again to manage cache.');
      } else {
        toast.error('Uklanjanje torenta nije uspelo.');
      }
    }
  };

  const torrents = cacheStats.torrents || [];
  const usagePercent = Math.min(100, Math.max(0, Math.round(cacheStats.usagePercentage || 0)));
  const directorySummaries = Array.isArray(cacheStats.directories)
    ? [...cacheStats.directories].sort((a, b) => (b.totalSize || 0) - (a.totalSize || 0))
    : [];

  const formatRelativeTime = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return 'moments ago';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days} d ago`;
    const months = Math.round(days / 30);
    return `${months} mo ago`;
  };

  if (!session.authenticated) {
    return (
      <div className="cache-page">
        <div className="cache-content">
          <ServerSessionStatus />
          <div className="cache-guard">
            <ServerSessionStatus.Alert />
            {error && (
              <div className="cache-alert">{error}</div>
            )}
          </div>
        </div>
        <Footer />
        {confirmDialog}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cache-page">
        <div className="cache-content">
          <ServerSessionStatus compact />
          <div className="cache-loading">
            <div className="loading-spinner" />
            <p>Loading cache data...</p>
          </div>
        </div>
        {confirmDialog}
      </div>
    );
  }

  return (
    <div className="cache-page">
      <div className="cache-content">
        <ServerSessionStatus compact />
        {error && (
          <div className="cache-alert">{error}</div>
        )}
        {/* Hero Header */}
        <div className="cache-hero">
          <div className="cache-header">
            <div className="cache-icon-box">
              <Database size={28} />
            </div>
            <div className="cache-title-box">
              <h1>Cache Management</h1>
              <p>Monitor storage and manage torrent cache</p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadCacheStats}
            className="refresh-btn"
            disabled={refreshing}
          >
            <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Stats Bar */}
        <div className="cache-stats-bar">
          <div className="cache-stat-card">
            <div className="stat-icon">
              <HardDrive size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{cacheStats.totalSizeFormatted}</div>
              <div className="stat-label">Cache Size</div>
            </div>
          </div>

          <div className="cache-stat-card">
            <div className="stat-icon">
              <Activity size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{cacheStats.activeTorrents}</div>
              <div className="stat-label">Active Torrents</div>
            </div>
          </div>

          <div className="cache-stat-card">
            <div className="stat-icon">
              <Download size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{cacheStats.fileCount}</div>
              <div className="stat-label">Cached Files</div>
            </div>
          </div>

          <div className="cache-stat-card">
            <div className="stat-icon">
              <Database size={20} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{usagePercent}%</div>
              <div className="stat-label">Usage</div>
            </div>
          </div>
        </div>

        {/* Storage Bar */}
        <div className="storage-section">
          <div className="storage-header">
            <h2>Storage Usage</h2>
            <p>{cacheStats.totalSizeFormatted} of {cacheStats.cacheLimitFormatted} used</p>
          </div>

          <div className="storage-bar">
            <div 
              className="storage-bar-fill" 
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          <div className="storage-info">
            <span className="storage-label">Cache Limit: {cacheStats.cacheLimitFormatted}</span>
            <span className="storage-percent">{usagePercent}% utilized</span>
          </div>
        </div>

        {directorySummaries.length > 0 && (
          <div className="cache-directories">
            <div className="directories-header">
              <h2>Cache Directories</h2>
              {cacheStats.lastUpdated && (
                <span className="directories-updated">Refreshed {formatRelativeTime(cacheStats.lastUpdated)}</span>
              )}
            </div>
            <div className="directories-grid">
              {directorySummaries.map((dir) => (
                <div key={dir.path} className="directory-card">
                  <div className="directory-path" title={dir.path}>{dir.path}</div>
                  <div className="directory-meta">
                    <span className="directory-size">{dir.totalSizeFormatted || formatBytes(dir.totalSize || 0)}</span>
                    <span className="directory-files">{dir.fileCount || 0} files</span>
                  </div>
                  <div className="directory-status">
                    <span className={dir.exists ? 'status-pill ok' : 'status-pill missing'}>
                      {dir.exists ? 'Available' : 'Missing'}
                    </span>
                    <span className="directory-updated">
                      {dir.exists && dir.lastModifiedISO
                        ? `Updated ${formatRelativeTime(dir.lastModifiedISO)}`
                        : 'No recent activity'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="cache-actions-section">
          <div className="actions-header">
            <h2>Quick Actions</h2>
            <p>Manage your cache storage</p>
          </div>

          <div className="cache-actions-grid">
            <button 
              type="button" 
              onClick={clearAllCache} 
              className="cache-action-btn danger"
            >
              <div className="action-icon">
                <Trash2 size={22} />
              </div>
              <div className="action-content">
                <h3>Clear All Cache</h3>
                <p>Remove all torrents and cached files</p>
              </div>
            </button>
          </div>
        </div>

        {/* Torrents List */}
        <div className="torrents-section">
          <div className="torrents-header">
            <h2>Active Torrents</h2>
            <p>{torrents.length} torrent{torrents.length !== 1 ? 's' : ''} in cache</p>
          </div>

          {torrents.length > 0 ? (
            <div className="torrents-grid">
              {torrents.map((torrent) => {
                const progressPercent = Math.min(100, Math.max(0, Number(((torrent.progress || 0) * 100).toFixed(1))));

                return (
                  <div key={torrent.infoHash} className="torrent-card">
                    <div className="torrent-header">
                      <h3 className="torrent-name" title={torrent.name}>
                        {torrent.name}
                      </h3>
                      <span className="torrent-size">{formatBytes(torrent.size || 0)}</span>
                    </div>

                    <div className="torrent-progress-bar">
                      <div 
                        className="torrent-progress-fill" 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="torrent-meta">
                      <div className="meta-item">
                        <span className="meta-label">Progress</span>
                        <span className="meta-value">{progressPercent}%</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Downloaded</span>
                        <span className="meta-value">{formatBytes(torrent.downloaded || 0)}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Files</span>
                        <span className="meta-value">{torrent.files?.length || 0}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Peers</span>
                        <span className="meta-value">{torrent.peers || 0}</span>
                      </div>
                    </div>

                    <div className="torrent-actions">
                      <button
                        type="button"
                        onClick={() => navigate(`/torrent/${torrent.infoHash}`)}
                        className="torrent-action-btn primary"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => clearSingleTorrent(torrent.infoHash, torrent.name)}
                        className="torrent-action-btn danger"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cache-empty">
              <HardDrive size={48} />
              <h3>No active torrents</h3>
              <p>Start streaming to see torrents here</p>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
      {confirmDialog}
    </div>
  );
};

export default CacheManagementPage;
