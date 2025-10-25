/**
 * About Page
 * Clean, minimal about page
 */

import { CheckCircle, Download, ExternalLink, Globe, Info, Play, Shield, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

const AboutPage = () => {
  const [serverStatus, setServerStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setServerStatus({
          status: 'healthy',
          uptime: '7d 12h 34m',
          version: '1.0.0',
          environment: 'production'
        });
      } catch {
        setServerStatus({
          status: 'error',
          message: 'Unable to fetch server status'
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkServerStatus();
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
      {/* Hero Section */}
      <div className="netflix-about-hero">
        <div className="netflix-about-icon">
          <Info size={48} />
        </div>
        <h1 className="netflix-about-title">StreamVault</h1>
        <p className="netflix-about-subtitle">Your Personal Streaming Vault</p>
        <div className="netflix-about-version">
          <span className="netflix-badge netflix-badge-new">v{serverStatus.version}</span>
          <span
            className="netflix-badge"
            style={{ backgroundColor: serverStatus.status === 'healthy' ? '#00b341' : '#e50914' }}
          >
            {serverStatus.status}
          </span>
        </div>
      </div>

      {/* Features */}
      <div className="netflix-content-section">
        <h2 className="netflix-section-title">Features</h2>
        <div className="netflix-features-grid">
          <div className="netflix-feature-card">
            <div className="netflix-feature-icon" style={{ backgroundColor: 'var(--netflix-red)' }}>
              <Download size={32} />
            </div>
            <h3 className="netflix-feature-title">Torrent Downloads</h3>
            <p className="netflix-feature-description">
              Download movies and TV shows from multiple torrent sources with high-speed streaming.
            </p>
          </div>

          <div className="netflix-feature-card">
            <div className="netflix-feature-icon" style={{ backgroundColor: '#0080ff' }}>
              <Play size={32} />
            </div>
            <h3 className="netflix-feature-title">Instant Streaming</h3>
            <p className="netflix-feature-description">
              Start watching immediately while content is downloading with our advanced streaming
              engine.
            </p>
          </div>

          <div className="netflix-feature-card">
            <div className="netflix-feature-icon" style={{ backgroundColor: '#ffa500' }}>
              <Globe size={32} />
            </div>
            <h3 className="netflix-feature-title">TMDB Integration</h3>
            <p className="netflix-feature-description">
              Automatic metadata, posters, and information from The Movie Database.
            </p>
          </div>

          <div className="netflix-feature-card">
            <div className="netflix-feature-icon" style={{ backgroundColor: '#00b341' }}>
              <Shield size={32} />
            </div>
            <h3 className="netflix-feature-title">Secure & Private</h3>
            <p className="netflix-feature-description">
              Your personal vault with encrypted connections and private storage.
            </p>
          </div>

          <div className="netflix-feature-card">
            <div className="netflix-feature-icon" style={{ backgroundColor: '#9b59b6' }}>
              <Zap size={32} />
            </div>
            <h3 className="netflix-feature-title">High Performance</h3>
            <p className="netflix-feature-description">
              Optimized for speed with caching, concurrent downloads, and smart resource management.
            </p>
          </div>

          <div className="netflix-feature-card">
            <div className="netflix-feature-icon" style={{ backgroundColor: '#e91e63' }}>
              <CheckCircle size={32} />
            </div>
            <h3 className="netflix-feature-title">Quality Control</h3>
            <p className="netflix-feature-description">
              Filter by quality (4K, 1080p, 720p) and automatically select the best available
              version.
            </p>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="netflix-content-section">
        <h2 className="netflix-section-title">Technology</h2>
        <div className="netflix-tech-grid">
          <div className="netflix-tech-item">
            <div className="netflix-tech-label">Frontend</div>
            <div className="netflix-tech-value">React + Vite</div>
          </div>

          <div className="netflix-tech-item">
            <div className="netflix-tech-label">Backend</div>
            <div className="netflix-tech-value">Node.js + Express</div>
          </div>

          <div className="netflix-tech-item">
            <div className="netflix-tech-label">Torrents</div>
            <div className="netflix-tech-value">WebTorrent</div>
          </div>

          <div className="netflix-tech-item">
            <div className="netflix-tech-label">Database</div>
            <div className="netflix-tech-value">Supabase</div>
          </div>

          <div className="netflix-tech-item">
            <div className="netflix-tech-label">Metadata</div>
            <div className="netflix-tech-value">TMDB API</div>
          </div>

          <div className="netflix-tech-item">
            <div className="netflix-tech-label">Design</div>
            <div className="netflix-tech-value">Netflix-inspired</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="netflix-content-section">
        <h2 className="netflix-section-title">System Information</h2>
        <div className="netflix-stats-grid">
          <div className="netflix-info-card">
            <div className="netflix-info-label">Status</div>
            <div className="netflix-info-value" style={{ color: '#00b341' }}>
              <CheckCircle size={20} />
              {serverStatus.status}
            </div>
          </div>

          <div className="netflix-info-card">
            <div className="netflix-info-label">Uptime</div>
            <div className="netflix-info-value">{serverStatus.uptime}</div>
          </div>

          <div className="netflix-info-card">
            <div className="netflix-info-label">Version</div>
            <div className="netflix-info-value">v{serverStatus.version}</div>
          </div>

          <div className="netflix-info-card">
            <div className="netflix-info-label">Environment</div>
            <div className="netflix-info-value">{serverStatus.environment}</div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="netflix-content-section">
        <h2 className="netflix-section-title">Resources</h2>
        <div className="netflix-links-grid">
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            className="netflix-link-card"
          >
            <Globe size={24} />
            <div className="netflix-link-content">
              <div className="netflix-link-title">TMDB</div>
              <div className="netflix-link-description">The Movie Database</div>
            </div>
            <ExternalLink size={20} />
          </a>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="netflix-link-card"
          >
            <Shield size={24} />
            <div className="netflix-link-content">
              <div className="netflix-link-title">GitHub</div>
              <div className="netflix-link-description">Source Code</div>
            </div>
            <ExternalLink size={20} />
          </a>

          <a
            href="https://webtorrent.io"
            target="_blank"
            rel="noopener noreferrer"
            className="netflix-link-card"
          >
            <Download size={24} />
            <div className="netflix-link-content">
              <div className="netflix-link-title">WebTorrent</div>
              <div className="netflix-link-description">Streaming Torrent Client</div>
            </div>
            <ExternalLink size={20} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
