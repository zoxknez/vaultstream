import {
  CheckCircle2,
  Clock,
  Film,
  ListVideo,
  Play,
  PlayCircle,
  Timer,
  Trash2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useConfirmDialog from '../hooks/useConfirmDialog';
import progressService from '../services/progressService';
import Footer from './Footer';
import './RecentPage.css';
import VideoModal from './VideoModal';

const RecentPage = () => {
  const navigate = useNavigate();
  const [recentVideos, setRecentVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [stats, setStats] = useState({});
  const [requestConfirm, confirmDialog] = useConfirmDialog();

  const hasStats = Boolean(stats && Object.keys(stats).length > 0);

  useEffect(() => {
    loadRecentVideos();
    loadStats();
  }, []);

  const loadRecentVideos = () => {
    const videos = progressService.getRecentVideos(20);
    setRecentVideos(videos);
  };

  const loadStats = () => {
    const statistics = progressService.getStats();
    setStats(statistics);
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo({
      src: `/api/video/${video.torrentHash}/${video.fileIndex}`,
      title: video.fileName,
      torrentHash: video.torrentHash,
      fileIndex: video.fileIndex
    });
  };

  const handleRemoveProgress = async (video) => {
    const confirmed = await requestConfirm({
      title: 'Remove from recent',
      message: `Remove "${video.fileName}" from your recent sessions?`,
      confirmLabel: 'Remove',
      cancelLabel: 'Keep',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    progressService.removeProgress(video.torrentHash, video.fileIndex);
    loadRecentVideos();
    loadStats();
  };

  const handleClearAll = async () => {
    const confirmed = await requestConfirm({
      title: 'Clear recent sessions',
      message: 'Clear all video progress? This cannot be undone.',
      confirmLabel: 'Clear All',
      cancelLabel: 'Cancel',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    progressService.clearAllProgress();
    loadRecentVideos();
    loadStats();
  };

  const goToTorrent = (torrentHash) => {
    navigate(`/torrent/${torrentHash}`);
  };

  return (
    <div className="page-shell recent-page">
      <div className="page-shell-content">
        <div className="page-hero recent-hero">
          <div className="recent-header">
            <div className="recent-icon-box">
              <Clock size={28} />
            </div>
            <div className="recent-title-box">
              <h1>Recent Sessions</h1>
              <p>Pick up exactly where you left off with synced progress</p>
            </div>
          </div>

          {recentVideos.length > 0 && (
            <button type="button" onClick={handleClearAll} className="clear-all-btn">
              <Trash2 size={18} />
              <span>Clear All</span>
            </button>
          )}
        </div>

        <div className="page-main">
          {hasStats && (
            <div className="page-panels recent-stats-section">
              <div className="page-panel recent-stats-panel">
                <div className="recent-stats-bar">
                  <div className="recent-stat-card page-card">
                    <div className="stat-icon">
                      <ListVideo size={20} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{stats.totalVideos ?? 0}</div>
                      <div className="stat-label">Total Sessions</div>
                    </div>
                  </div>

                  <div className="recent-stat-card page-card">
                    <div className="stat-icon">
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{stats.completed ?? 0}</div>
                      <div className="stat-label">Completed</div>
                    </div>
                  </div>

                  <div className="recent-stat-card page-card">
                    <div className="stat-icon">
                      <PlayCircle size={20} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{stats.inProgress ?? 0}</div>
                      <div className="stat-label">In Progress</div>
                    </div>
                  </div>

                  <div className="recent-stat-card page-card">
                    <div className="stat-icon">
                      <Timer size={20} />
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{stats.totalWatchTime ?? '0:00'}</div>
                      <div className="stat-label">Watch Time</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="page-panels recent-videos-section">
            <div className="page-panel recent-videos-panel">
              {recentVideos.length === 0 ? (
                <div className="recent-empty page-empty-state">
                  <Film size={48} />
                  <h3>No recent videos</h3>
                  <p>Start streaming to build your watch history</p>
                  <button type="button" onClick={() => navigate('/')} className="browse-btn">
                    Browse Library
                  </button>
                </div>
              ) : (
                <>
                  <div className="videos-header">
                    <h2>Continue Watching</h2>
                    <p>{recentVideos.length} videos in your queue</p>
                  </div>

                  <div className="recent-videos-grid">
                    {recentVideos.map((video) => (
                      <div
                        key={`${video.torrentHash}-${video.fileIndex}`}
                        className="recent-video-card"
                        onClick={() => handleVideoSelect(video)}
                      >
                        <div className="video-thumbnail">
                          <div className="thumbnail-overlay">
                            <div className="play-icon-circle">
                              <Play size={32} />
                            </div>
                          </div>

                          <div className="video-duration">
                            {progressService.formatTime(video.currentTime)} /{' '}
                            {progressService.formatTime(video.duration)}
                          </div>

                          <div
                            className={`video-status-badge ${
                              video.isCompleted ? 'completed' : 'in-progress'
                            }`}
                          >
                            {video.isCompleted ? 'Completed' : `${Math.round(video.percentage)}%`}
                          </div>
                        </div>

                        <div className="video-progress-bar">
                          <div
                            className="video-progress-fill"
                            style={{ width: `${Math.min(video.percentage, 100)}%` }}
                          />
                        </div>

                        <div className="video-info">
                          <h3 className="video-title" title={video.fileName}>
                            {video.fileName}
                          </h3>

                          <p className="video-timestamp">
                            {progressService.formatRelativeTime(video.lastWatched)}
                          </p>
                        </div>

                        <div className="video-actions">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVideoSelect(video);
                            }}
                            className="video-action-btn primary"
                            title="Continue watching"
                          >
                            <Play size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              goToTorrent(video.torrentHash);
                            }}
                            className="video-action-btn secondary"
                            title="View torrent"
                          >
                            <Film size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveProgress(video);
                            }}
                            className="video-action-btn danger"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {selectedVideo && (
          <VideoModal
            isOpen
            onClose={() => setSelectedVideo(null)}
            src={selectedVideo.src}
            title={selectedVideo.title}
            torrentHash={selectedVideo.torrentHash}
            fileIndex={selectedVideo.fileIndex}
          />
        )}

        <Footer />
        {confirmDialog}
      </div>
    </div>
  );
};

export default RecentPage;
