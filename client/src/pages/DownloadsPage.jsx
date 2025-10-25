/**
 * Downloads Page
 * Netflix-style downloads with enhanced features
 */

import {
  CheckCircle,
  Clock,
  Download,
  Grid,
  HardDrive,
  List,
  MoreVertical,
  Pause,
  Play,
  Search,
  Trash2,
  TrendingUp,
  Users,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

const DownloadsPage = () => {
  const [downloads, setDownloads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadDownloads = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setDownloads([
        {
          id: 1,
          title: 'The Matrix Resurrections',
          year: 2021,
          size: '4.2 GB',
          sizeBytes: 4200000000,
          downloaded: '3.6 GB',
          progress: 85,
          status: 'downloading',
          speed: '2.5 MB/s',
          eta: '15 min',
          peers: 45,
          seeds: 128,
          quality: '4K UHD',
          health: 'excellent',
          addedDate: '2024-01-15',
          image: 'https://image.tmdb.org/t/p/w500/9ix7TUHMGKSrbxyW4FaRdhN6oAG.jpg'
        },
        {
          id: 2,
          title: 'Dune',
          year: 2021,
          size: '3.8 GB',
          sizeBytes: 3800000000,
          downloaded: '3.8 GB',
          progress: 100,
          status: 'completed',
          speed: '0 MB/s',
          eta: 'Completed',
          peers: 0,
          seeds: 256,
          quality: '4K HDR',
          health: 'excellent',
          addedDate: '2024-01-14',
          image: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg'
        },
        {
          id: 3,
          title: 'Spider-Man: No Way Home',
          year: 2021,
          size: '5.1 GB',
          sizeBytes: 5100000000,
          downloaded: '2.3 GB',
          progress: 45,
          status: 'paused',
          speed: '0 MB/s',
          eta: 'Paused',
          peers: 32,
          seeds: 89,
          quality: '1080p BluRay',
          health: 'good',
          addedDate: '2024-01-13',
          image: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg'
        },
        {
          id: 4,
          title: 'Inception',
          year: 2010,
          size: '2.1 GB',
          sizeBytes: 2100000000,
          downloaded: '420 MB',
          progress: 20,
          status: 'downloading',
          speed: '1.2 MB/s',
          eta: '25 min',
          peers: 18,
          seeds: 45,
          quality: '1080p',
          health: 'good',
          addedDate: '2024-01-16',
          image: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg'
        },
        {
          id: 5,
          title: 'Interstellar',
          year: 2014,
          size: '6.8 GB',
          sizeBytes: 6800000000,
          downloaded: '0 MB',
          progress: 0,
          status: 'paused',
          speed: '0 MB/s',
          eta: 'Paused',
          peers: 8,
          seeds: 21,
          quality: '4K REMUX',
          health: 'low',
          addedDate: '2024-01-12',
          image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'
        }
      ]);

      setIsLoading(false);
    };

    loadDownloads();
  }, []);

  const filteredDownloads = downloads.filter((d) => {
    if (filter !== 'all' && d.status !== filter) return false;
    if (searchTerm && !d.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Calculate stats
  const stats = {
    total: downloads.length,
    downloading: downloads.filter((d) => d.status === 'downloading').length,
    completed: downloads.filter((d) => d.status === 'completed').length,
    paused: downloads.filter((d) => d.status === 'paused').length,
    totalSize: downloads.reduce((acc, d) => acc + d.sizeBytes, 0),
    downloaded: downloads.reduce((acc, d) => acc + (d.sizeBytes * d.progress) / 100, 0),
    avgSpeed:
      downloads
        .filter((d) => d.status === 'downloading')
        .reduce((acc, d) => acc + parseFloat(d.speed), 0) /
      Math.max(downloads.filter((d) => d.status === 'downloading').length, 1)
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} className="text-success" />;
      case 'downloading':
        return <Download size={20} className="text-netflix-red" />;
      case 'paused':
        return <Pause size={20} className="text-warning" />;
      default:
        return <XCircle size={20} className="text-muted" />;
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'excellent':
        return '#00ff00';
      case 'good':
        return '#ffaa00';
      case 'low':
        return '#ff4444';
      default:
        return '#666';
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="netflix-loading">
        <div className="netflix-spinner"></div>
      </div>
    );
  }

  return (
    <div className="netflix-page">
      <div className="netflix-page-header">
        <div>
          <h1 className="netflix-page-title">Downloads</h1>
          <p className="netflix-page-subtitle">
            {stats.total} total • {stats.downloading} downloading • {stats.completed} completed
          </p>
        </div>

        {/* Stats Cards */}
        <div className="netflix-stats-row">
          <div className="netflix-stat-mini">
            <Download size={20} />
            <div>
              <span className="stat-value">{formatBytes(stats.downloaded)}</span>
              <span className="stat-label">Downloaded</span>
            </div>
          </div>
          <div className="netflix-stat-mini">
            <HardDrive size={20} />
            <div>
              <span className="stat-value">{formatBytes(stats.totalSize)}</span>
              <span className="stat-label">Total Size</span>
            </div>
          </div>
          <div className="netflix-stat-mini">
            <TrendingUp size={20} />
            <div>
              <span className="stat-value">{stats.avgSpeed.toFixed(1)} MB/s</span>
              <span className="stat-label">Avg Speed</span>
            </div>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="netflix-page-controls">
          {/* Search */}
          <div className="netflix-search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search downloads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Tabs */}
          <div className="netflix-tabs">
            {['all', 'downloading', 'completed', 'paused'].map((status) => (
              <button
                key={status}
                className={`netflix-tab ${filter === status ? 'active' : ''}`}
                onClick={() => setFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className="tab-count">{status === 'all' ? stats.total : stats[status]}</span>
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="netflix-view-toggle">
            <button
              className={`netflix-btn netflix-btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Grid size={20} />
            </button>
            <button
              className={`netflix-btn netflix-btn-icon ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Downloads Grid/List */}
      <div className={`netflix-downloads ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
        {filteredDownloads.map((download) => (
          <div key={download.id} className="netflix-download-card">
            <div className="netflix-download-poster">
              <img
                src={download.image}
                alt={download.title}
                onError={(e) => {
                  e.target.src =
                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect fill="%23333" width="200" height="300"/%3E%3Ctext fill="%23666" font-family="Arial" font-size="16" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                }}
              />
              <div className="netflix-download-overlay">
                {getStatusIcon(download.status)}
                {download.progress < 100 && (
                  <div className="download-progress-badge">{download.progress}%</div>
                )}
              </div>
              {download.status === 'completed' && (
                <div className="download-completed-badge">
                  <CheckCircle size={16} />
                  Complete
                </div>
              )}
            </div>

            <div className="netflix-download-info">
              <h3 className="netflix-download-title">{download.title}</h3>
              <div className="netflix-download-meta">
                <span>{download.year}</span>
                <span>{download.quality}</span>
                <span>{download.size}</span>
              </div>

              {/* Progress Bar */}
              {download.status !== 'completed' && (
                <div className="netflix-progress-bar">
                  <div
                    className="netflix-progress-fill"
                    style={{
                      width: `${download.progress}%`,
                      backgroundColor: download.status === 'paused' ? '#888' : 'var(--netflix-red)'
                    }}
                  />
                  <span className="progress-text">{download.progress}%</span>
                </div>
              )}

              {/* Download Details */}
              <div className="netflix-download-details">
                <div className="detail-item">
                  <Clock size={14} />
                  <span>{download.eta}</span>
                </div>
                {download.status === 'downloading' && (
                  <div className="detail-item">
                    <TrendingUp size={14} />
                    <span>{download.speed}</span>
                  </div>
                )}
                <div className="detail-item">
                  <Users size={14} style={{ color: getHealthColor(download.health) }} />
                  <span>
                    {download.seeds}/{download.peers}
                  </span>
                </div>
              </div>

              {/* Status Info */}
              <div className="netflix-download-status">
                <span className="status-text">
                  {download.downloaded} / {download.size}
                </span>
                {download.status === 'downloading' && (
                  <span className="health-badge" style={{ color: getHealthColor(download.health) }}>
                    {download.health}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="netflix-download-actions">
                {download.status === 'downloading' && (
                  <button className="netflix-btn netflix-btn-icon" title="Pause">
                    <Pause size={16} />
                  </button>
                )}
                {download.status === 'paused' && (
                  <button className="netflix-btn netflix-btn-icon" title="Resume">
                    <Play size={16} />
                  </button>
                )}
                {download.status === 'completed' && (
                  <button className="netflix-btn netflix-btn-primary netflix-btn-sm">
                    <Play size={16} />
                    <span>Watch</span>
                  </button>
                )}
                <button className="netflix-btn netflix-btn-icon" title="Delete">
                  <Trash2 size={16} />
                </button>
                <button className="netflix-btn netflix-btn-icon" title="More options">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDownloads.length === 0 && (
        <div className="netflix-empty-state">
          <Download size={64} />
          <h2>{downloads.length === 0 ? 'No downloads yet' : 'No downloads found'}</h2>
          <p>
            {downloads.length === 0
              ? 'Start downloading movies and shows to watch them offline'
              : 'Try adjusting your filters or search term'}
          </p>
          {downloads.length === 0 && (
            <button
              className="netflix-btn netflix-btn-primary"
              onClick={() => (window.location.href = '/torrents')}
            >
              <Search size={20} />
              Browse Torrents
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DownloadsPage;
