import { Minimize2 } from 'lucide-react';

const DeviceStatsOverlay = ({ statsRef, torrentStats, networkQuality, onClose }) => (
  <div className="stats-overlay" data-testid="torrent-stats-overlay" ref={statsRef}>
    <div className="stats-content">
      <div className="stats-header">
        <h3>Statistics</h3>
        <button className="stats-minimize" data-testid="torrent-stats-minimize" onClick={onClose}>
          <Minimize2 size={16} />
        </button>
      </div>

      {torrentStats && (
        <div className="stats-body">
          <div className="stat-item">
            <span>Network Quality:</span>
            <span className={`network-quality-indicator network-quality-${networkQuality}`}>
              {networkQuality}
            </span>
          </div>
          <div className="stat-item">
            <span>Download Speed:</span>
            <span>{(torrentStats.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s</span>
          </div>
          <div className="stat-item">
            <span>Upload Speed:</span>
            <span>{(torrentStats.uploadSpeed / 1024 / 1024).toFixed(2)} MB/s</span>
          </div>
          <div className="stat-item">
            <span>Peers:</span>
            <span>{torrentStats.peers}</span>
          </div>
          <div className="stat-item">
            <span>Seeds:</span>
            <span>{torrentStats.seeds}</span>
          </div>
          <div className="stat-item">
            <span>Progress:</span>
            <span>{torrentStats.progress.toFixed(1)}%</span>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default DeviceStatsOverlay;
