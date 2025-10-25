/**
 * DownloadManager Component
 * 
 * Real-time torrent download manager with visual progress tracking
 * Shows all active, paused, and completed downloads
 * 
 * Features:
 * - Live progress bars with percentage
 * - Download/upload speed meters
 * - ETA calculation
 * - Pause/Resume/Cancel controls
 * - Seeders/Leechers count
 * - File size and downloaded amount
 * - Batch operations (pause all, resume all, clear completed)
 */

import { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  Pause,
  Play,
  X,
  Check,
  Clock,
  Users,
  HardDrive,
  AlertCircle,
  Trash2,
  MoreVertical,
  AlertTriangle
} from 'lucide-react';
import './DownloadManager.css';
import ConfirmDialog from './ConfirmDialog';

function DownloadManager({ torrents, onPause, onResume, onCancel, onRemove, onRefresh }) {
  const [filter, setFilter] = useState('all'); // all, downloading, completed, paused
  const [sortBy, setSortBy] = useState('dateAdded'); // dateAdded, progress, speed, name
  const [expandedTorrent, setExpandedTorrent] = useState(null);
  const [selectedTorrents, setSelectedTorrents] = useState(new Set());
  const [confirmState, setConfirmState] = useState(null);

  // Auto-refresh every 2 seconds
  useEffect(() => {
    if (!onRefresh) return;

    const interval = setInterval(() => {
      onRefresh();
    }, 2000);

    return () => clearInterval(interval);
  }, [onRefresh]);

  /**
   * Format bytes to human readable
   */
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Format speed (bytes/sec to MB/s or KB/s)
   */
  const formatSpeed = (bytesPerSec) => {
    if (bytesPerSec === 0) return '0 KB/s';
    if (bytesPerSec < 1024) return bytesPerSec.toFixed(0) + ' B/s';
    if (bytesPerSec < 1024 * 1024) return (bytesPerSec / 1024).toFixed(1) + ' KB/s';
    return (bytesPerSec / (1024 * 1024)).toFixed(2) + ' MB/s';
  };

  /**
   * Format ETA (seconds to human readable)
   */
  const formatETA = (seconds) => {
    if (!seconds || seconds === Infinity || seconds < 0) return '∞';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  /**
   * Calculate ETA based on download speed and remaining bytes
   */
  const calculateETA = (torrent) => {
    if (torrent.progress >= 100 || torrent.downloadSpeed === 0) return null;
    const remaining = torrent.totalSize - torrent.downloaded;
    return remaining / torrent.downloadSpeed;
  };

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'downloading':
        return 'status-downloading';
      case 'seeding':
      case 'completed':
        return 'status-completed';
      case 'paused':
        return 'status-paused';
      case 'error':
        return 'status-error';
      default:
        return 'status-default';
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'downloading':
        return <Download size={16} />;
      case 'seeding':
      case 'completed':
        return <Check size={16} />;
      case 'paused':
        return <Pause size={16} />;
      case 'error':
        return <AlertCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  /**
   * Filter torrents
   */
  const filteredTorrents = torrents.filter(torrent => {
    if (filter === 'all') return true;
    if (filter === 'downloading') return torrent.status === 'downloading';
    if (filter === 'completed') return torrent.status === 'completed' || torrent.status === 'seeding';
    if (filter === 'paused') return torrent.status === 'paused';
    return true;
  });

  /**
   * Sort torrents
   */
  const sortedTorrents = [...filteredTorrents].sort((a, b) => {
    switch (sortBy) {
      case 'dateAdded':
        return new Date(b.dateAdded) - new Date(a.dateAdded);
      case 'progress':
        return b.progress - a.progress;
      case 'speed':
        return b.downloadSpeed - a.downloadSpeed;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  /**
   * Toggle torrent selection
   */
  const toggleSelection = (hash) => {
    const newSelected = new Set(selectedTorrents);
    if (newSelected.has(hash)) {
      newSelected.delete(hash);
    } else {
      newSelected.add(hash);
    }
    setSelectedTorrents(newSelected);
  };

  /**
   * Select all visible torrents
   */
  const selectAll = () => {
    if (selectedTorrents.size === sortedTorrents.length) {
      setSelectedTorrents(new Set());
    } else {
      setSelectedTorrents(new Set(sortedTorrents.map(t => t.hash)));
    }
  };

  /**
   * Batch pause
   */
  const batchPause = () => {
    selectedTorrents.forEach(hash => {
      const torrent = torrents.find(t => t.hash === hash);
      if (torrent && torrent.status === 'downloading') {
        onPause(hash);
      }
    });
    setSelectedTorrents(new Set());
  };

  /**
   * Batch resume
   */
  const batchResume = () => {
    selectedTorrents.forEach(hash => {
      const torrent = torrents.find(t => t.hash === hash);
      if (torrent && torrent.status === 'paused') {
        onResume(hash);
      }
    });
    setSelectedTorrents(new Set());
  };

  const openConfirmDialog = (config) => {
    setConfirmState({
      title: config.title,
      message: config.message,
      confirmLabel: config.confirmLabel ?? 'Confirm',
      cancelLabel: config.cancelLabel ?? 'Cancel',
      danger: config.danger ?? false,
      icon: config.icon ?? AlertTriangle,
      onConfirm: () => {
        config.onConfirm?.();
        setConfirmState(null);
      },
      onCancel: () => {
        config.onCancel?.();
        setConfirmState(null);
      }
    });
  };

  /**
   * Batch remove
   */
  const batchRemove = () => {
    if (selectedTorrents.size === 0) {
      return;
    }

    const hashes = Array.from(selectedTorrents);

    openConfirmDialog({
      title: 'Remove torrents',
      message: `Remove ${hashes.length} selected torrent${hashes.length === 1 ? '' : 's'}? This will stop and delete their progress.`,
      confirmLabel: 'Remove',
      cancelLabel: 'Keep',
      danger: true,
      onConfirm: () => {
        hashes.forEach((hash) => {
          onRemove(hash);
        });
        setSelectedTorrents(new Set());
      }
    });
  };

  /**
   * Render torrent item
   */
  const renderTorrentItem = (torrent) => {
    const isExpanded = expandedTorrent === torrent.hash;
    const isSelected = selectedTorrents.has(torrent.hash);
    const eta = calculateETA(torrent);

    return (
      <div
        key={torrent.hash}
        className={`download-item ${getStatusColor(torrent.status)} ${isSelected ? 'selected' : ''}`}
      >
        {/* Checkbox */}
        <div className="download-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelection(torrent.hash)}
          />
        </div>

        {/* Main Info */}
        <div className="download-main" onClick={() => setExpandedTorrent(isExpanded ? null : torrent.hash)}>
          <div className="download-header">
            <div className="download-status-badge">
              {getStatusIcon(torrent.status)}
              <span>{torrent.status}</span>
            </div>
            <div className="download-name">{torrent.name}</div>
          </div>

          {/* Progress Bar */}
          <div className="download-progress-container">
            <div
              className="download-progress-bar"
              style={{ width: `${torrent.progress}%` }}
            />
            <span className="download-progress-text">{torrent.progress.toFixed(1)}%</span>
          </div>

          {/* Stats Row */}
          <div className="download-stats">
            <div className="stat-item">
              <Download size={14} />
              <span>{formatSpeed(torrent.downloadSpeed)}</span>
            </div>
            <div className="stat-item">
              <Upload size={14} />
              <span>{formatSpeed(torrent.uploadSpeed)}</span>
            </div>
            <div className="stat-item">
              <Users size={14} />
              <span>{torrent.peers} peers</span>
            </div>
            <div className="stat-item">
              <HardDrive size={14} />
              <span>{formatBytes(torrent.downloaded)} / {formatBytes(torrent.totalSize)}</span>
            </div>
            {eta && (
              <div className="stat-item">
                <Clock size={14} />
                <span>ETA: {formatETA(eta)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="download-actions">
          {torrent.status === 'downloading' && (
            <button
              className="btn-action btn-pause"
              onClick={() => onPause(torrent.hash)}
              title="Pause"
            >
              <Pause size={18} />
            </button>
          )}
          {torrent.status === 'paused' && (
            <button
              className="btn-action btn-resume"
              onClick={() => onResume(torrent.hash)}
              title="Resume"
            >
              <Play size={18} />
            </button>
          )}
          <button
            className="btn-action btn-remove"
            onClick={() => {
              openConfirmDialog({
                title: 'Remove torrent',
                message: `Remove "${torrent.name}"? This will stop the download and clear progress.`,
                confirmLabel: 'Remove',
                cancelLabel: 'Keep',
                danger: true,
                onConfirm: () => {
                  onCancel(torrent.hash);
                  setSelectedTorrents((prev) => {
                    if (!prev.has(torrent.hash)) return prev;
                    const next = new Set(prev);
                    next.delete(torrent.hash);
                    return next;
                  });
                }
              });
            }}
            title="Remove"
          >
            <X size={18} />
          </button>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="download-details">
            <div className="detail-row">
              <span className="detail-label">Hash:</span>
              <span className="detail-value">{torrent.hash}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Added:</span>
              <span className="detail-value">{new Date(torrent.dateAdded).toLocaleString()}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Seeders:</span>
              <span className="detail-value">{torrent.seeders || 0}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Leechers:</span>
              <span className="detail-value">{torrent.leechers || 0}</span>
            </div>
            {torrent.ratio && (
              <div className="detail-row">
                <span className="detail-label">Ratio:</span>
                <span className="detail-value">{torrent.ratio.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="download-manager">
      {/* Header */}
      <div className="download-manager-header">
        <h2>
          <Download size={24} />
          Download Manager
        </h2>
        <div className="header-stats">
          <span className="stat-badge">
            {torrents.filter(t => t.status === 'downloading').length} downloading
          </span>
          <span className="stat-badge">
            {torrents.filter(t => t.status === 'completed' || t.status === 'seeding').length} completed
          </span>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="download-controls">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({torrents.length})
          </button>
          <button
            className={`filter-btn ${filter === 'downloading' ? 'active' : ''}`}
            onClick={() => setFilter('downloading')}
          >
            Downloading ({torrents.filter(t => t.status === 'downloading').length})
          </button>
          <button
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({torrents.filter(t => t.status === 'completed' || t.status === 'seeding').length})
          </button>
          <button
            className={`filter-btn ${filter === 'paused' ? 'active' : ''}`}
            onClick={() => setFilter('paused')}
          >
            Paused ({torrents.filter(t => t.status === 'paused').length})
          </button>
        </div>

        <div className="sort-controls">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="dateAdded">Date Added</option>
            <option value="progress">Progress</option>
            <option value="speed">Download Speed</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedTorrents.size > 0 && (
        <div className="batch-actions">
          <span className="selected-count">{selectedTorrents.size} selected</span>
          <button className="btn-batch" onClick={batchPause}>
            <Pause size={16} />
            Pause
          </button>
          <button className="btn-batch" onClick={batchResume}>
            <Play size={16} />
            Resume
          </button>
          <button className="btn-batch btn-danger" onClick={batchRemove}>
            <Trash2 size={16} />
            Remove
          </button>
          <button className="btn-batch" onClick={() => setSelectedTorrents(new Set())}>
            Clear Selection
          </button>
        </div>
      )}

      {/* Select All */}
      {sortedTorrents.length > 0 && (
        <div className="select-all-row">
          <label>
            <input
              type="checkbox"
              checked={selectedTorrents.size === sortedTorrents.length}
              onChange={selectAll}
            />
            Select All
          </label>
        </div>
      )}

      {/* Torrent List */}
      <div className="download-list">
        {sortedTorrents.length === 0 ? (
          <div className="download-empty">
            <Download size={64} />
            <p>No torrents {filter !== 'all' ? `(${filter})` : ''}</p>
            <p className="empty-hint">Add torrents from the Torrents page</p>
          </div>
        ) : (
          sortedTorrents.map(renderTorrentItem)
        )}
      </div>
      {confirmState && (
        <ConfirmDialog
          open={Boolean(confirmState)}
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          cancelLabel={confirmState.cancelLabel}
          onConfirm={confirmState.onConfirm}
          onCancel={confirmState.onCancel}
          danger={confirmState.danger}
          icon={confirmState.icon}
        />
      )}
    </div>
  );
}

export default DownloadManager;
