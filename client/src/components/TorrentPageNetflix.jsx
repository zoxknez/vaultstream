import { ArrowLeft, Download, MoreVertical, Play, Plus, Share, Star, ThumbsUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { config } from '../config/environment';
import { useServerSession } from '../contexts/ServerSessionContext.jsx';
import { getImdbData, getTorrentDetails } from '../services/api';
import progressService from '../services/progressService';
import { markServerSessionInvalid } from '../services/serverAuthService';
import ApiError from '../utils/ApiError';
import BatchActionsToolbar from './BatchActionsToolbar';
import EpisodeContextMenu from './EpisodeContextMenu';
import ServerSessionStatus from './ServerSessionStatus';
import { useToast } from './Toast';
import './TorrentPageNetflix.css';
import VideoPlayer from './VideoPlayer';
// 🚀 OPTIMIZATION: Import concurrent hooks for smooth file list rendering
import { useDeferredList } from '../hooks/useConcurrent';

const TorrentPageNetflix = () => {
  const { torrentHash } = useParams();
  const navigate = useNavigate();
  const { session } = useServerSession();
  const toast = useToast();
  const [torrent, setTorrent] = useState(null);
  const [files, setFiles] = useState([]);

  // 🚀 OPTIMIZATION: Use deferred list for smooth file list rendering (especially for large torrents)
  const { deferredItems: deferredFiles } = useDeferredList(files);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [recentProgress, setRecentProgress] = useState({});
  const [imdbData, setImdbData] = useState(null);
  const [seriesData, setSeriesData] = useState(null);
  const [activeSeason, setActiveSeason] = useState(null);
  const [authError, setAuthError] = useState(null);

  const handleUnauthorized = useCallback(
    (message) => {
      const resolvedMessage = message || 'Potrebna je administratorska prijava.';
      markServerSessionInvalid();
      setAuthError((prev) => {
        if (prev !== resolvedMessage) {
          toast.error(resolvedMessage);
        }
        return resolvedMessage;
      });
      setError(resolvedMessage);
      setLoading(false);
    },
    [toast]
  );

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);

  // Batch actions state
  const [showBatchActions, setShowBatchActions] = useState(false);

  const heroBackgroundImage = useMemo(() => {
    if (imdbData?.Backdrop) return imdbData.Backdrop;
    if (imdbData?.Poster && imdbData.Poster !== 'N/A') return imdbData.Poster;
    return null;
  }, [imdbData]);

  const heroStyle = useMemo(
    () => (heroBackgroundImage ? { '--hero-image': `url(${heroBackgroundImage})` } : {}),
    [heroBackgroundImage]
  );

  const heroClassName = useMemo(
    () => `netflix-hero${heroBackgroundImage ? ' has-image' : ''}`,
    [heroBackgroundImage]
  );

  const fetchIMDBData = useCallback(async () => {
    if (!session.authenticated) return;

    try {
      const data = await getImdbData(torrentHash);

      if (data?.success && data?.imdb) {
        setImdbData(data.imdb);
      } else {
        setImdbData(null);
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        handleUnauthorized('Administratorska prijava je potrebna za IMDB podatke.');
      } else {
        console.error('Error fetching IMDB data:', err);
        setImdbData(null);
      }
    }
  }, [session.authenticated, torrentHash, handleUnauthorized]);

  const fetchTorrentDetails = useCallback(async () => {
    if (!session.authenticated) return;

    try {
      setLoading(true);
      const data = await getTorrentDetails(torrentHash);

      if (!data?.torrent) {
        throw new Error('Podaci o torentu nisu dostupni.');
      }

      setTorrent(data.torrent);
      setFiles(data.files || []);
      setSeriesData(data.series || null);
      if (data.series?.isSeries && data.series?.seasons?.length) {
        const defaultSeason = data.series.defaultSeason || data.series.seasons[0].season;
        setActiveSeason((current) => (current != null ? current : defaultSeason));
      } else {
        setActiveSeason(null);
      }
      setAuthError(null);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        handleUnauthorized('Administratorska prijava je potrebna za pregled detalja torenta.');
      } else {
        console.error('Error fetching torrent details:', err);
        const message = err.message || 'Učitavanje torenta nije uspelo.';
        setError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }, [session.authenticated, torrentHash, handleUnauthorized, toast]);

  const formatFileSize = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    if (isNaN(i) || i < 0) return '0 B';
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond) => {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const fetchTorrentProgress = useCallback(async () => {
    if (!session.authenticated) return;

    try {
      const data = await getTorrentDetails(torrentHash);
      if (data?.torrent) {
        setTorrent((prev) => ({ ...prev, ...data.torrent }));
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        handleUnauthorized('Sesija je istekla. Prijavi se ponovo da nastaviš praćenje torenta.');
      } else {
        console.error('Error fetching progress:', err);
      }
    }
  }, [session.authenticated, torrentHash, handleUnauthorized]);

  const loadProgress = useCallback(() => {
    if (!torrentHash) return;

    const allProgress = progressService.getAllProgress();
    const torrentProgress = {};

    Object.values(allProgress).forEach((progress) => {
      if (progress?.torrentHash === torrentHash) {
        torrentProgress[progress.fileIndex] = progress;
      }
    });

    setRecentProgress(torrentProgress);
  }, [torrentHash]);

  const handleDownload = (fileIndex) => {
    const downloadUrl = config.getDownloadUrl(torrentHash, fileIndex);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = files[fileIndex]?.name || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const videoExtensionRegex = useMemo(() => /\.(mp4|avi|mkv|mov|wmv|flv|webm|m4v)$/i, []);

  const fileIndexMap = useMemo(() => {
    const map = new Map();
    files.forEach((file) => {
      map.set(file.index, file);
    });
    return map;
  }, [files]);

  const isSeries = useMemo(
    () => Boolean(seriesData?.isSeries && seriesData?.seasons?.length),
    [seriesData]
  );

  const seasonOptions = useMemo(
    () =>
      seriesData?.seasons?.map((season) => ({
        value: season.season,
        label: season.label || `Sezona ${season.season}`,
        episodeCount: season.episodeCount || season.episodes?.length || 0
      })) || [],
    [seriesData]
  );

  const activeSeasonData = useMemo(() => {
    if (!isSeries) return null;
    if (!seasonOptions.length) return null;
    const seasonValue = activeSeason ?? seasonOptions[0].value;
    return (
      seriesData.seasons.find((season) => season.season === seasonValue) || seriesData.seasons[0]
    );
  }, [isSeries, seasonOptions, activeSeason, seriesData]);

  const activeEpisodes = useMemo(() => activeSeasonData?.episodes || [], [activeSeasonData]);

  const extras = useMemo(() => (isSeries ? seriesData?.extras || [] : []), [isSeries, seriesData]);

  // 🚀 OPTIMIZATION: Use deferred files for smooth rendering, especially for large torrents
  const allVideoFiles = useMemo(
    () => deferredFiles.filter((file) => videoExtensionRegex.test(file.name)),
    [deferredFiles, videoExtensionRegex]
  );

  const nonVideoFiles = useMemo(
    () => deferredFiles.filter((file) => !videoExtensionRegex.test(file.name)),
    [deferredFiles, videoExtensionRegex]
  );

  const mainVideoFile = useMemo(() => {
    if (isSeries && activeEpisodes.length) {
      const firstEpisode = activeEpisodes[0];
      return fileIndexMap.get(firstEpisode.fileIndex) || null;
    }
    return allVideoFiles[0] || null;
  }, [isSeries, activeEpisodes, fileIndexMap, allVideoFiles]);

  const otherFiles = useMemo(() => {
    if (isSeries) {
      const extraIndexSet = new Set(extras.map((extra) => extra.fileIndex));
      return nonVideoFiles.filter((file) => !extraIndexSet.has(file.index));
    }
    // 🚀 OPTIMIZATION: Use deferredFiles for smooth rendering
    return deferredFiles.filter((file) => !videoExtensionRegex.test(file.name));
  }, [isSeries, nonVideoFiles, extras, deferredFiles, videoExtensionRegex]);

  const getProgressForFile = useCallback(
    (fileIndex) => {
      return recentProgress[fileIndex];
    },
    [recentProgress]
  );

  // Get last watched episode (most recent progress)
  const getLastWatchedEpisode = useCallback(() => {
    if (!isSeries || !activeEpisodes.length) return null;

    let lastWatched = null;
    let latestTimestamp = 0;

    activeEpisodes.forEach((episode) => {
      const progress = recentProgress[episode.fileIndex];
      if (progress && progress.lastWatched) {
        const timestamp = new Date(progress.lastWatched).getTime();
        if (timestamp > latestTimestamp) {
          latestTimestamp = timestamp;
          lastWatched = episode.fileIndex;
        }
      }
    });

    return lastWatched;
  }, [isSeries, activeEpisodes, recentProgress]);

  // Check if episode is in progress (watched but not completed)
  const isEpisodeInProgress = useCallback(
    (fileIndex) => {
      const progress = recentProgress[fileIndex];
      if (!progress) return false;

      // Consider in progress if watched more than 30s but less than 95%
      const watchedPercentage = (progress.currentTime / progress.duration) * 100;
      return progress.currentTime > 30 && watchedPercentage < 95;
    },
    [recentProgress]
  );

  const openEpisode = useCallback(
    (episode, fromBeginning = false) => {
      if (!episode) return;
      const file = fileIndexMap.get(episode.fileIndex);
      if (file) {
        // Clear progress if watching from beginning
        if (fromBeginning && torrentHash) {
          progressService.saveProgress(torrentHash, episode.fileIndex, 0, 0, file.name);
        }
        setSelectedVideo(file);
      }
    },
    [fileIndexMap, torrentHash]
  );

  // Context menu handlers
  const handleContextMenu = useCallback((event, episode) => {
    event.preventDefault();
    event.stopPropagation();

    setContextMenu({
      episode,
      position: { x: event.clientX, y: event.clientY }
    });
  }, []);

  const handleMarkAsWatched = useCallback(
    (episode) => {
      const file = fileIndexMap.get(episode.fileIndex);
      if (file && torrentHash) {
        progressService.markAsWatched(torrentHash, episode.fileIndex, file.name, 0);
        loadProgress();
      }
    },
    [fileIndexMap, torrentHash, loadProgress]
  );

  const handleMarkAsUnwatched = useCallback(
    (episode) => {
      if (torrentHash) {
        progressService.markAsUnwatched(torrentHash, episode.fileIndex);
        loadProgress();
      }
    },
    [torrentHash, loadProgress]
  );

  const handleResetProgress = useCallback(
    (episode) => {
      if (torrentHash) {
        progressService.removeProgress(torrentHash, episode.fileIndex);
        loadProgress();
      }
    },
    [torrentHash, loadProgress]
  );

  // Batch action handlers
  const handleMarkAllAsWatched = useCallback(() => {
    if (!torrentHash || !files.length) return;

    const episodesToMark = files.map((file) => ({
      torrentHash,
      fileIndex: file.index,
      fileName: file.name,
      duration: 0
    }));

    progressService.markMultipleAsWatched(episodesToMark);
    loadProgress();
  }, [torrentHash, files, loadProgress]);

  const handleMarkSeasonAsWatched = useCallback(
    (seasonNumber) => {
      if (!torrentHash || !seriesData) return;

      const season = seriesData.seasons.find(
        (s) => s.seasonNumber === seasonNumber || s.season === seasonNumber
      );
      if (!season) return;

      const episodesToMark = season.episodes.map((episode) => ({
        torrentHash,
        fileIndex: episode.fileIndex,
        fileName: episode.fileName || `Episode ${episode.episodeNumber}`,
        duration: 0
      }));

      progressService.markMultipleAsWatched(episodesToMark);
      loadProgress();
    },
    [torrentHash, seriesData, loadProgress]
  );

  const handleClearAllProgress = useCallback(() => {
    if (!torrentHash || !files.length) return;

    files.forEach((file) => {
      progressService.removeProgress(torrentHash, file.index);
    });

    loadProgress();
  }, [torrentHash, files, loadProgress]);

  // Get next episode for auto-play
  const getNextEpisode = useCallback(
    (currentFileIndex) => {
      if (!isSeries || currentFileIndex == null) return null;

      // Find current episode in activeEpisodes
      const currentIndex = activeEpisodes.findIndex((ep) => ep.fileIndex === currentFileIndex);

      if (currentIndex === -1) {
        // Not found in active episodes, return first episode of active season
        return activeEpisodes[0] || null;
      }

      // Check if there's a next episode in current season
      if (currentIndex < activeEpisodes.length - 1) {
        return activeEpisodes[currentIndex + 1];
      }

      // Check if there's a next season
      if (seriesData && seriesData.seasons) {
        const currentSeasonNum = activeEpisodes[currentIndex]?.seasonNumber;
        const nextSeasonNum = currentSeasonNum + 1;
        const nextSeason = seriesData.seasons.find((s) => s.seasonNumber === nextSeasonNum);

        if (nextSeason && nextSeason.episodes && nextSeason.episodes.length > 0) {
          // Switch to next season and return first episode
          return nextSeason.episodes[0];
        }
      }

      // No next episode available
      return null;
    },
    [isSeries, activeEpisodes, seriesData]
  );

  // Check if current episode is the last one
  const isLastEpisode = useCallback(
    (currentFileIndex) => {
      const nextEp = getNextEpisode(currentFileIndex);
      return nextEp === null;
    },
    [getNextEpisode]
  );

  useEffect(() => {
    if (!torrentHash) return undefined;

    if (!session.authenticated) {
      setLoading(false);
      return undefined;
    }

    fetchTorrentDetails();
    fetchIMDBData();
    loadProgress();

    const progressInterval = setInterval(() => {
      if (!selectedVideo) {
        fetchTorrentProgress();
        loadProgress();
      }
    }, 4000);

    return () => clearInterval(progressInterval);
  }, [
    torrentHash,
    session.authenticated,
    fetchTorrentDetails,
    fetchIMDBData,
    fetchTorrentProgress,
    loadProgress,
    selectedVideo
  ]);

  // Auto-scroll to last watched episode
  useEffect(() => {
    if (!isSeries || !activeEpisodes.length || selectedVideo) return;

    const lastWatchedIndex = getLastWatchedEpisode();
    if (lastWatchedIndex !== null) {
      // Wait for DOM to be ready
      setTimeout(() => {
        const episodeElement = document.querySelector(`[data-episode-index="${lastWatchedIndex}"]`);
        if (episodeElement) {
          episodeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 500);
    }
  }, [isSeries, activeEpisodes, selectedVideo, getLastWatchedEpisode, activeSeason]);

  if (!session.authenticated) {
    return (
      <div className="torrents-page-v2 torrents-page-guard-wrapper">
        <ServerSessionStatus />
        <div className="torrents-guard">
          <ServerSessionStatus.Alert />
          {authError && <div className="torrents-alert">{authError}</div>}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="netflix-page">
        <ServerSessionStatus compact />
        <div className="netflix-loading">
          <div className="netflix-spinner"></div>
          <p>Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="netflix-page">
        <ServerSessionStatus compact />
        <div className="netflix-error">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button
            className="netflix-retry-btn"
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchTorrentDetails();
              fetchIMDBData();
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (selectedVideo) {
    const videoKey = `${torrentHash}-${selectedVideo.index}-${selectedVideo.name}`;

    // Try multiple methods to get progress
    const progressFromState = recentProgress[selectedVideo.index]?.currentTime || 0;
    const progressFromService = progressService.getProgress(torrentHash, selectedVideo.index);
    const directServiceTime = progressFromService?.currentTime || 0;

    // Use the direct service method as primary
    const initialProgress = directServiceTime || progressFromState;

    return (
      <div className="video-overlay">
        <VideoPlayer
          key={videoKey}
          src={`${config.apiBaseUrl}/api/torrents/${torrentHash}/files/${selectedVideo.index}/stream`}
          title={selectedVideo.name}
          onClose={() => setSelectedVideo(null)}
          onTimeUpdate={() => {
            // The VideoPlayer itself handles saving progress with correct duration
            // We don't need to save it here since VideoPlayer saves every 5 seconds
          }}
          initialTime={initialProgress}
          torrentHash={torrentHash}
          fileIndex={selectedVideo.index}
          getNextEpisode={() => getNextEpisode(selectedVideo.index)}
          isLastEpisode={isLastEpisode(selectedVideo.index)}
          onPlayNextEpisode={(nextEpisode) => {
            if (nextEpisode) {
              // Switch season if needed
              if (nextEpisode.seasonNumber !== activeSeason) {
                setActiveSeason(nextEpisode.seasonNumber);
              }
              openEpisode(nextEpisode);
            }
          }}
        />
      </div>
    );
  }
  const renderEpisodeCard = (episode) => {
    const progress = getProgressForFile(episode.fileIndex);
    const progressPercentage = progress ? (progress.currentTime / progress.duration) * 100 : 0;
    const displayTitle =
      episode.displayTitle ||
      episode.title ||
      episode.fileName ||
      `Epizoda ${episode.episodeNumber}`;
    const subtitle =
      episode.title && episode.title !== displayTitle ? episode.title : episode.subtitle;
    const qualityLabel = episode.quality || episode.resolution || 'Standard';

    const isLastWatched = getLastWatchedEpisode() === episode.fileIndex;
    const inProgress = isEpisodeInProgress(episode.fileIndex);

    return (
      <div
        key={`${episode.season}-${episode.episodeNumber}-${episode.fileIndex}`}
        className={`netflix-episode ${isLastWatched ? 'last-watched' : ''} ${
          inProgress ? 'in-progress' : ''
        }`}
        onClick={() => openEpisode(episode)}
        onContextMenu={(e) => handleContextMenu(e, episode)}
        data-episode-index={episode.fileIndex}
      >
        <div className="netflix-episode-thumbnail">
          <button
            className="netflix-episode-play"
            onClick={(event) => {
              event.stopPropagation();
              openEpisode(episode);
            }}
            title="Pusti epizodu"
          >
            <Play size={16} />
          </button>
          <div className="netflix-episode-badge">Ep {episode.episodeNumber}</div>

          {isLastWatched && (
            <div className="netflix-last-watched-indicator">
              <Play size={24} fill="white" />
            </div>
          )}

          {inProgress && <div className="netflix-continue-badge">Continue</div>}

          {progress && (
            <div className="netflix-progress-bar">
              <div className="netflix-progress-fill" style={{ width: `${progressPercentage}%` }} />
            </div>
          )}
        </div>

        <div className="netflix-episode-info">
          <div className="netflix-episode-header">
            <h4>{displayTitle}</h4>
            <span className="netflix-episode-duration">{formatFileSize(episode.size)}</span>
          </div>
          {subtitle && <p className="netflix-episode-title">{subtitle}</p>}
          <div className="netflix-episode-meta">
            <span className="netflix-episode-quality">{qualityLabel}</span>
            {progress && progress.currentTime != null && progress.duration != null && (
              <span className="netflix-episode-progress">
                {progressService.formatTime(progress.currentTime)} /{' '}
                {progressService.formatTime(progress.duration)}
              </span>
            )}
          </div>
        </div>

        <div className="netflix-episode-actions">
          {inProgress && (
            <button
              className="netflix-episode-restart"
              onClick={(event) => {
                event.stopPropagation();
                openEpisode(episode, true);
              }}
              title="Watch from beginning"
            >
              <Play size={16} />
              Restart
            </button>
          )}
          <button
            className="netflix-episode-download"
            onClick={(event) => {
              event.stopPropagation();
              handleDownload(episode.fileIndex);
            }}
            title="Preuzmi epizodu"
          >
            <Download size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderExtraCard = (extra) => (
    <div
      key={`extra-${extra.fileIndex}`}
      className="netflix-extra"
      onClick={() => openEpisode(extra)}
    >
      <div className="netflix-extra-icon">
        <Play size={18} />
      </div>
      <div className="netflix-extra-info">
        <p className="netflix-extra-title">{extra.displayTitle || extra.title || extra.fileName}</p>
        <span className="netflix-extra-meta">
          {extra.quality ? `${extra.quality} • ` : ''}
          {formatFileSize(extra.size)}
        </span>
      </div>
      <button
        className="netflix-extra-download"
        onClick={(event) => {
          event.stopPropagation();
          handleDownload(extra.fileIndex);
        }}
        title="Download bonus content"
      >
        <Download size={16} />
      </button>
    </div>
  );

  return (
    <div className="netflix-page">
      {/* Hero Section */}
      <div className={heroClassName} style={heroBackgroundImage ? heroStyle : undefined}>
        <div className="netflix-hero-content">
          <button className="netflix-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            Back
          </button>

          <div className="netflix-title-section">
            <h1 className="netflix-title">{imdbData?.Title || torrent?.name || 'Unknown Title'}</h1>

            {imdbData && (
              <div className="netflix-meta">
                <div className="netflix-rating">
                  <Star size={16} className="star-icon" />
                  <span>{imdbData.imdbRating}/10</span>
                  <span className="netflix-votes">({imdbData.imdbVotes} votes)</span>
                </div>

                <div className="netflix-info-row">
                  <span className="netflix-year">{imdbData.Year}</span>
                  <span className="netflix-rated">{imdbData.Rated}</span>
                  <span className="netflix-runtime">{imdbData.Runtime}</span>
                  <span className="netflix-genre">{imdbData.Genre}</span>
                </div>
              </div>
            )}

            <div className="netflix-action-buttons">
              {mainVideoFile && (
                <button
                  className="netflix-play-btn"
                  onClick={() => setSelectedVideo(mainVideoFile)}
                >
                  <Play size={20} />
                  {recentProgress[mainVideoFile.index] ? 'Resume' : 'Play'}
                </button>
              )}

              {mainVideoFile && (
                <button
                  className="netflix-secondary-btn"
                  onClick={() => handleDownload(mainVideoFile.index)}
                  title="Download video"
                >
                  <Download size={20} />
                  Download
                </button>
              )}

              <button className="netflix-secondary-btn">
                <Plus size={20} />
                My List
              </button>

              <button className="netflix-secondary-btn">
                <ThumbsUp size={20} />
                Rate
              </button>

              <button className="netflix-secondary-btn">
                <Share size={20} />
                Share
              </button>
            </div>

            {imdbData?.Plot && <p className="netflix-description">{imdbData.Plot}</p>}
          </div>

          {imdbData?.Poster && imdbData.Poster !== 'N/A' && (
            <div className="netflix-poster">
              <img src={imdbData.Poster} alt={imdbData.Title} />
            </div>
          )}
        </div>
      </div>

      {/* Content Details */}
      <div className="netflix-content">
        <div className="netflix-main-content">
          {/* Episodes/Files Section */}
          <div className="netflix-section">
            <div className="netflix-section-header">
              <h2>{isSeries ? 'Epizode' : 'Video fajlovi'}</h2>
              <div className="netflix-section-header-actions">
                {isSeries && seasonOptions.length > 1 && (
                  <div className="netflix-season-selector">
                    {seasonOptions.map((season) => (
                      <button
                        key={season.value}
                        className={`netflix-season-btn ${
                          season.value === (activeSeason ?? seasonOptions[0].value) ? 'active' : ''
                        }`}
                        onClick={() => setActiveSeason(season.value)}
                      >
                        {season.label}
                        <span className="netflix-season-count">{season.episodeCount} ep</span>
                      </button>
                    ))}
                  </div>
                )}
                {isSeries && files.length > 0 && (
                  <button
                    className="batch-actions-trigger"
                    onClick={() => setShowBatchActions(!showBatchActions)}
                    title="Batch actions"
                  >
                    <MoreVertical size={20} />
                  </button>
                )}
              </div>
            </div>

            {isSeries ? (
              activeEpisodes.length ? (
                <div className="netflix-episodes">
                  {activeEpisodes.map((episode) => renderEpisodeCard(episode))}
                </div>
              ) : (
                <div className="netflix-empty-state">
                  <p>Epizode za ovu sezonu trenutno nisu dostupne.</p>
                </div>
              )
            ) : (
              <div className="netflix-episodes">
                {/* 🚀 OPTIMIZATION: Smooth rendering with deferred files */}
                {allVideoFiles.map((file, index) => {
                  const progress = getProgressForFile(file.index);
                  const progressPercentage = progress
                    ? (progress.currentTime / progress.duration) * 100
                    : 0;

                  return (
                    <div
                      key={file.index}
                      className="netflix-episode"
                      onClick={() => setSelectedVideo(file)}
                    >
                      <div className="netflix-episode-thumbnail">
                        <button
                          className="netflix-episode-play"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedVideo(file);
                          }}
                          title="Pusti video"
                        >
                          <Play size={16} />
                        </button>
                        {progress && (
                          <div className="netflix-progress-bar">
                            <div
                              className="netflix-progress-fill"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="netflix-episode-info">
                        <div className="netflix-episode-header">
                          <h4>{`Video ${index + 1}`}</h4>
                          <span className="netflix-episode-duration">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <p className="netflix-episode-title">{file.name}</p>
                        {progress && progress.currentTime != null && progress.duration != null && (
                          <div className="netflix-episode-meta">
                            <span className="netflix-episode-progress">
                              {progressService.formatTime(progress.currentTime)} /{' '}
                              {progressService.formatTime(progress.duration)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="netflix-episode-actions">
                        <button
                          className="netflix-episode-download"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDownload(file.index);
                          }}
                          title="Preuzmi video"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {extras.length > 0 && (
              <div className="netflix-extras">
                <h3>Bonus content</h3>
                <div className="netflix-extras-list">
                  {extras.map((extra) => renderExtraCard(extra))}
                </div>
              </div>
            )}
          </div>

          {/* Additional Files */}
          {otherFiles.length > 0 && (
            <div className="netflix-section">
              <h2>Dodatni fajlovi</h2>
              <div className="netflix-files">
                {otherFiles.map((file) => (
                  <div key={file.index} className="netflix-file">
                    <div
                      className="netflix-file-icon"
                      onClick={() => handleDownload(file.index)}
                      style={{ cursor: 'pointer' }}
                      title="Download file"
                    >
                      <Download size={16} />
                    </div>
                    <div className="netflix-file-info">
                      <span className="netflix-file-name">{file.name}</span>
                      <span className="netflix-file-size">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="netflix-sidebar">
          {imdbData && (
            <>
              <div className="netflix-info-card">
                <h3>Cast</h3>
                <p>{imdbData.Actors}</p>
              </div>

              <div className="netflix-info-card">
                <h3>Director</h3>
                <p>{imdbData.Director}</p>
              </div>

              <div className="netflix-info-card">
                <h3>Writer</h3>
                <p>{imdbData.Writer}</p>
              </div>

              {imdbData.Awards && imdbData.Awards !== 'N/A' && (
                <div className="netflix-info-card">
                  <h3>Awards</h3>
                  <p>{imdbData.Awards}</p>
                </div>
              )}

              <div className="netflix-info-card">
                <h3>Ratings</h3>
                <div className="netflix-ratings">
                  <div className="netflix-rating-item">
                    <span>IMDB</span>
                    <span>{imdbData.imdbRating}/10</span>
                  </div>
                  {imdbData.rottenTomatosRating !== 'N/A' && (
                    <div className="netflix-rating-item">
                      <span>Rotten Tomatoes</span>
                      <span>{imdbData.rottenTomatosRating}</span>
                    </div>
                  )}
                  {imdbData.metacriticRating !== 'N/A' && (
                    <div className="netflix-rating-item">
                      <span>Metacritic</span>
                      <span>{imdbData.metacriticRating}/100</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Torrent Stats */}
          <div className="netflix-info-card">
            <h3>Download Info</h3>
            <div className="netflix-torrent-stats">
              <div className="netflix-stat">
                <span>Size</span>
                <span>{formatFileSize(torrent?.size || 0)}</span>
              </div>
              <div className="netflix-stat">
                <span>Progress</span>
                <span>{Math.round(torrent?.progress * 100 || 0)}%</span>
              </div>
              <div className="netflix-stat">
                <span>Speed</span>
                <span>{formatSpeed(torrent?.downloadSpeed || 0)}</span>
              </div>
              <div className="netflix-stat">
                <span>Peers</span>
                <span>{torrent?.peers || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Episode Context Menu */}
      {contextMenu && (
        <EpisodeContextMenu
          episode={contextMenu.episode}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onMarkAsWatched={() => handleMarkAsWatched(contextMenu.episode)}
          onMarkAsUnwatched={() => handleMarkAsUnwatched(contextMenu.episode)}
          onPlayNext={() => openEpisode(contextMenu.episode)}
          onResetProgress={() => handleResetProgress(contextMenu.episode)}
          onDownload={() => handleDownload(contextMenu.episode.fileIndex)}
          onGetInfo={() => {
            // Future: Show episode details modal
          }}
          isWatched={progressService.isWatched(torrentHash, contextMenu.episode.fileIndex)}
          hasProgress={!!recentProgress[contextMenu.episode.fileIndex]}
        />
      )}

      {/* Batch Actions Toolbar */}
      {showBatchActions && isSeries && (
        <BatchActionsToolbar
          activeSeason={activeSeason}
          onMarkAllAsWatched={handleMarkAllAsWatched}
          onMarkSeasonAsWatched={handleMarkSeasonAsWatched}
          onClearAllProgress={handleClearAllProgress}
          onClose={() => setShowBatchActions(false)}
        />
      )}
    </div>
  );
};

export default TorrentPageNetflix;
