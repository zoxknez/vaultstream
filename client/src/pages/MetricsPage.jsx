/**
 * Metrics Page
 * Server metrics and performance dashboard
 */

import {
  Activity,
  Cpu,
  HardDrive,
  RefreshCw,
  Server,
  TrendingUp,
  Upload,
  Wifi,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';

const MetricsPage = () => {
  const [metrics, setMetrics] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const loadMetrics = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setMetrics({
        server: {
          status: 'healthy',
          uptime: '7d 12h 34m',
          version: '1.0.0',
          environment: 'production'
        },
        performance: {
          cpu: 45,
          memory: 68,
          disk: 23,
          network: 12
        },
        torrents: {
          active: 3,
          completed: 127,
          totalSize: '2.3 TB',
          averageSpeed: '2.5 MB/s'
        },
        network: {
          downloadSpeed: '2.5 MB/s',
          uploadSpeed: '1.2 MB/s',
          totalDownloaded: '127.3 GB',
          totalUploaded: '89.7 GB'
        }
      });

      setLastUpdated(new Date());
      setIsLoading(false);
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

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
        <h1 className="netflix-page-title">System Metrics</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
            Last updated: {lastUpdated?.toLocaleTimeString()}
          </span>
          <button className="netflix-btn netflix-btn-icon" onClick={() => window.location.reload()}>
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Server Status */}
      <div className="netflix-stats-grid">
        <div className="netflix-stat-card">
          <div className="netflix-stat-icon" style={{ backgroundColor: '#00b341' }}>
            <Server size={24} />
          </div>
          <div className="netflix-stat-content">
            <div className="netflix-stat-value">{metrics.server.status}</div>
            <div className="netflix-stat-label">Server Status</div>
          </div>
        </div>

        <div className="netflix-stat-card">
          <div className="netflix-stat-icon" style={{ backgroundColor: 'var(--netflix-red)' }}>
            <Zap size={24} />
          </div>
          <div className="netflix-stat-content">
            <div className="netflix-stat-value">{metrics.server.uptime}</div>
            <div className="netflix-stat-label">Uptime</div>
          </div>
        </div>

        <div className="netflix-stat-card">
          <div className="netflix-stat-icon" style={{ backgroundColor: '#0080ff' }}>
            <Activity size={24} />
          </div>
          <div className="netflix-stat-content">
            <div className="netflix-stat-value">{metrics.server.version}</div>
            <div className="netflix-stat-label">Version</div>
          </div>
        </div>

        <div className="netflix-stat-card">
          <div className="netflix-stat-icon" style={{ backgroundColor: '#ffa500' }}>
            <Server size={24} />
          </div>
          <div className="netflix-stat-content">
            <div className="netflix-stat-value">{metrics.server.environment}</div>
            <div className="netflix-stat-label">Environment</div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="netflix-content-section">
        <h2 className="netflix-section-title">Performance</h2>
        <div className="netflix-stats-grid">
          <div className="netflix-metric-gauge">
            <div className="metric-header">
              <Cpu size={24} />
              <span>CPU Usage</span>
            </div>
            <div className="metric-progress">
              <div
                className="metric-progress-fill"
                style={{
                  width: `${metrics.performance.cpu}%`,
                  backgroundColor:
                    metrics.performance.cpu > 80
                      ? '#e50914'
                      : metrics.performance.cpu > 60
                      ? '#ffa500'
                      : '#00b341'
                }}
              />
            </div>
            <div className="metric-value">{metrics.performance.cpu}%</div>
          </div>

          <div className="netflix-metric-gauge">
            <div className="metric-header">
              <Activity size={24} />
              <span>Memory Usage</span>
            </div>
            <div className="metric-progress">
              <div
                className="metric-progress-fill"
                style={{
                  width: `${metrics.performance.memory}%`,
                  backgroundColor:
                    metrics.performance.memory > 80
                      ? '#e50914'
                      : metrics.performance.memory > 60
                      ? '#ffa500'
                      : '#00b341'
                }}
              />
            </div>
            <div className="metric-value">{metrics.performance.memory}%</div>
          </div>

          <div className="netflix-metric-gauge">
            <div className="metric-header">
              <HardDrive size={24} />
              <span>Disk Usage</span>
            </div>
            <div className="metric-progress">
              <div
                className="metric-progress-fill"
                style={{
                  width: `${metrics.performance.disk}%`,
                  backgroundColor:
                    metrics.performance.disk > 80
                      ? '#e50914'
                      : metrics.performance.disk > 60
                      ? '#ffa500'
                      : '#00b341'
                }}
              />
            </div>
            <div className="metric-value">{metrics.performance.disk}%</div>
          </div>

          <div className="netflix-metric-gauge">
            <div className="metric-header">
              <Wifi size={24} />
              <span>Network Usage</span>
            </div>
            <div className="metric-progress">
              <div
                className="metric-progress-fill"
                style={{
                  width: `${metrics.performance.network}%`,
                  backgroundColor: '#0080ff'
                }}
              />
            </div>
            <div className="metric-value">{metrics.performance.network}%</div>
          </div>
        </div>
      </div>

      {/* Torrent Stats */}
      <div className="netflix-content-section">
        <h2 className="netflix-section-title">Torrents</h2>
        <div className="netflix-stats-grid">
          <div className="netflix-info-card">
            <div className="netflix-info-label">Active Downloads</div>
            <div className="netflix-info-value">{metrics.torrents.active}</div>
          </div>

          <div className="netflix-info-card">
            <div className="netflix-info-label">Completed</div>
            <div className="netflix-info-value">{metrics.torrents.completed}</div>
          </div>

          <div className="netflix-info-card">
            <div className="netflix-info-label">Total Size</div>
            <div className="netflix-info-value">{metrics.torrents.totalSize}</div>
          </div>

          <div className="netflix-info-card">
            <div className="netflix-info-label">Avg Speed</div>
            <div className="netflix-info-value">
              <TrendingUp size={20} style={{ color: 'var(--netflix-red)' }} />
              {metrics.torrents.averageSpeed}
            </div>
          </div>
        </div>
      </div>

      {/* Network Stats */}
      <div className="netflix-content-section">
        <h2 className="netflix-section-title">Network</h2>
        <div className="netflix-stats-grid">
          <div className="netflix-info-card">
            <div className="netflix-info-label">Download Speed</div>
            <div className="netflix-info-value" style={{ color: '#00b341' }}>
              {metrics.network.downloadSpeed}
            </div>
          </div>

          <div className="netflix-info-card">
            <div className="netflix-info-label">Upload Speed</div>
            <div className="netflix-info-value" style={{ color: '#0080ff' }}>
              <Upload size={20} />
              {metrics.network.uploadSpeed}
            </div>
          </div>

          <div className="netflix-info-card">
            <div className="netflix-info-label">Total Downloaded</div>
            <div className="netflix-info-value">{metrics.network.totalDownloaded}</div>
          </div>

          <div className="netflix-info-card">
            <div className="netflix-info-label">Total Uploaded</div>
            <div className="netflix-info-value">{metrics.network.totalUploaded}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPage;
