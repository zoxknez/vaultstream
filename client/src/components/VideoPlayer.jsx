import {
  Activity,
  Download,
  Keyboard,
  Loader2,
  Maximize,
  Minimize2,
  Pause,
  PictureInPicture,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  TrendingDown,
  TrendingUp,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useServerSession } from '../contexts/ServerSessionContext.jsx';
import useConfirmDialog from '../hooks/useConfirmDialog';
import { useDesktopNotifications } from '../hooks/useDesktopNotifications';
import useElectronFullscreen, { useVideoKeyboardShortcuts } from '../hooks/useElectronFullscreen';
import { updateMediaSessionPlaybackState, useMediaSession } from '../hooks/useMediaSession';
import { useSubtitleManager } from '../hooks/useSubtitleManager';
import { getTorrentStats } from '../services/api';
import progressService from '../services/progressService';
import { markServerSessionInvalid } from '../services/serverAuthService';
import ApiError from '../utils/ApiError';
import { getSkipToTime, shouldShowSkipIntro } from '../utils/introDetection';
import { logger } from '../utils/logger';
import SkipIntroButton from './SkipIntroButton';
import SubtitleMenu from './SubtitleMenu';
import { useToast } from './Toast';
import UpNextOverlay from './UpNextOverlay';
import './VideoPlayer.css';

const VideoPlayer = ({
  src,
  title,
  onTimeUpdate,
  onProgress,
  initialTime = 0,
  torrentHash = null,
  fileIndex = null,
  onClose = null,
  getNextEpisode = null,
  isLastEpisode = false,
  onPlayNextEpisode = null
}) => {
  const videoRef = useRef(null);
  const toast = useToast();
  const { session } = useServerSession();
  const unauthorizedNotifiedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const instantPlayEnabled = true;
  const [bufferVisualization, setBufferVisualization] = useState({
    ahead: 0,
    behind: 0,
    total: 0,
    percentage: 0
  });
  const [requestConfirm, confirmDialog] = useConfirmDialog();
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Progress tracking states
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [hasShownResumeDialog, setHasShownResumeDialog] = useState(false);
  const [hasAppliedInitialTime, setHasAppliedInitialTime] = useState(false);

  // Up Next / Auto-play states
  const [showUpNext, setShowUpNext] = useState(false);
  const [nextEpisode, setNextEpisode] = useState(null);
  const [upNextTriggered, setUpNextTriggered] = useState(false);

  // Skip Intro states
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [hasSkippedIntro, setHasSkippedIntro] = useState(false);

  // Subtitle/CC support
  const subtitleFileInputRef = useRef(null);

  const {
    state: {
      localSubtitles,
      torrentSubtitles,
      onlineSubtitles,
      currentSubtitle,
      showSubtitleMenu,
      subtitlesEnabled,
      isSearchingOnline,
      isUploadingSubtitle,
      subtitleUploadError,
      subtitleDeletingId,
      subtitleDeleteError,
      subtitleOffset
    },
    actions: {
      setShowSubtitleMenu,
      loadSubtitle,
      uploadSubtitle,
      deleteSubtitle,
      searchOnlineSubtitles,
      loadOnlineSubtitle,
      toggleSubtitles,
      setSubtitleUploadError,
      adjustSubtitleOffset
    }
  } = useSubtitleManager({
    torrentHash,
    mediaTitle: title,
    videoRef,
    fileIndex: fileIndex !== null ? fileIndex : 0
  });

  // 🖥️ DESKTOP OPTIMIZATION HOOKS
  // Electron fullscreen (better than HTML5 on desktop)
  const {
    isFullscreen: _electronFullscreen, // Not used directly, managed by state
    toggleFullscreen: toggleElectronFullscreen,
    supportsElectronFullscreen
  } = useElectronFullscreen();

  // Desktop notifications for playback events
  const {
    notifyPlay: _notifyPlay, // Reserved for future use
    notifyPause: _notifyPause, // Reserved for future use
    notifyEnd,
    notifyError
  } = useDesktopNotifications({
    enabled: true,
    notifyOnPlay: false,
    notifyOnPause: false,
    notifyOnEnd: true,
    notifyOnError: true
  });

  // Media Session API for system media controls
  const [updatePositionState, setUpdatePositionState] = useState(null);
  useMediaSession({
    title: title || 'StreamVault',
    artist: '',
    album: '',
    artwork: '/leaf.svg',
    onPlay: useCallback(() => {
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }, []),
    onPause: useCallback(() => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }, []),
    onSeekBackward: useCallback(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      }
    }, []),
    onSeekForward: useCallback(() => {
      if (videoRef.current && videoRef.current.duration) {
        videoRef.current.currentTime = Math.min(
          videoRef.current.duration,
          videoRef.current.currentTime + 10
        );
      }
    }, []),
    onPositionStateChange: setUpdatePositionState
  });

  // Enhanced torrent/streaming states
  const [torrentStats, setTorrentStats] = useState({
    peers: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    progress: 0,
    downloaded: 0,
    total: 0,
    isConnected: false
  });
  const [bufferHealth, setBufferHealth] = useState(0);
  const [networkStatus, setNetworkStatus] = useState('connecting');
  const [showTorrentStats, setShowTorrentStats] = useState(true);

  const controlsTimeoutRef = useRef(null);
  const statsIntervalRef = useRef(null);
  const lastTapTimeRef = useRef(0);
  const tapCountRef = useRef(0);

  useEffect(() => {
    if (session.authenticated) {
      unauthorizedNotifiedRef.current = false;
    }
  }, [session.authenticated]);

  // Fetch real-time torrent statistics
  const fetchTorrentStats = useCallback(async () => {
    if (!torrentHash || !session.authenticated) return;

    try {
      const stats = await getTorrentStats(torrentHash);
      if (stats) {
        setTorrentStats(stats);
        setNetworkStatus(stats.peers > 0 ? 'connected' : 'seeking');

        // Calculate buffer health based on download speed vs playback
        if (videoRef.current && stats.downloadSpeed > 0) {
          const currentBitrate = videoRef.current.playbackRate * 1024 * 1024; // Estimate
          const health = Math.min(100, (stats.downloadSpeed / currentBitrate) * 100);
          setBufferHealth(health);
        }
      }
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        if (!unauthorizedNotifiedRef.current) {
          unauthorizedNotifiedRef.current = true;
          markServerSessionInvalid();
          const message =
            'Sesija je istekla. Prijavi se ponovo da bi pratio statistiku strimovanja.';
          toast.error(message);
          if (typeof onClose === 'function') {
            onClose();
          }
        }
      } else {
        console.warn('Failed to fetch torrent stats:', error);
        setNetworkStatus('disconnected');
      }
    }
  }, [torrentHash, session.authenticated, toast, onClose]);

  // Enhanced buffer monitoring for instant streaming
  const updateBufferedProgress = useCallback(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const buffered = video.buffered;
    const currentTime = video.currentTime;
    const duration = video.duration;

    if (buffered.length > 0 && duration) {
      let bufferedEnd = 0;
      let bufferAhead = 0;
      let bufferBehind = 0;

      // Calculate all buffered ranges
      for (let i = 0; i < buffered.length; i++) {
        const start = buffered.start(i);
        const end = buffered.end(i);

        // Find buffer ahead of current position
        if (start <= currentTime && end > currentTime) {
          bufferAhead = end - currentTime;
          bufferedEnd = end;
        }

        // Find buffer behind current position
        if (end <= currentTime) {
          bufferBehind += end - start;
        }

        // Track maximum buffered position
        if (end > bufferedEnd) {
          bufferedEnd = end;
        }
      }

      const bufferedPercent = (bufferedEnd / duration) * 100;
      const totalBuffered = bufferAhead + bufferBehind;

      setBuffered(bufferedPercent);
      setBufferVisualization({
        ahead: bufferAhead,
        behind: bufferBehind,
        total: totalBuffered,
        percentage: Math.round((totalBuffered / duration) * 100)
      });

      // Calculate buffer health for instant play decisions
      const minBufferForPlay = 3; // 3 seconds minimum
      const healthScore = Math.min(100, (bufferAhead / minBufferForPlay) * 100);
      setBufferHealth(healthScore);
    }
  }, []);

  // Initialize stats polling when torrent hash is available
  useEffect(() => {
    if (torrentHash && session.authenticated && !statsIntervalRef.current) {
      fetchTorrentStats(); // Initial fetch
      statsIntervalRef.current = setInterval(fetchTorrentStats, 2000); // Update every 2s
    }

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    };
  }, [torrentHash, session.authenticated, fetchTorrentStats]);
  const triggerSubtitleUpload = useCallback(() => {
    setSubtitleUploadError(null);
    if (subtitleFileInputRef.current) {
      subtitleFileInputRef.current.value = '';
      subtitleFileInputRef.current.click();
    }
  }, [setSubtitleUploadError]);

  const handleSubtitleUpload = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      try {
        await uploadSubtitle(file);
      } finally {
        if (event.target) {
          event.target.value = '';
        }
      }
    },
    [uploadSubtitle]
  );

  const handleSubtitleDelete = useCallback(
    async (event, subtitle) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();

      if (!subtitle) {
        return;
      }

      const confirmed = await requestConfirm({
        title: 'Remove subtitle',
        message: `Delete subtitle "${subtitle.label || subtitle.name}"? This cannot be undone.`,
        confirmLabel: 'Delete Subtitle',
        cancelLabel: 'Cancel',
        danger: true
      });

      if (!confirmed) {
        return;
      }

      await deleteSubtitle(subtitle);
    },
    [deleteSubtitle, requestConfirm]
  );

  // Reset Skip Intro state when video source or episode changes
  useEffect(() => {
    setHasSkippedIntro(false);
    setShowSkipIntro(false);
  }, [src, fileIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);

      // Set initial time after metadata is loaded
      if (initialTime > 0 && !hasAppliedInitialTime) {
        console.log('⏰ Resuming video at:', initialTime + 's');
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
        setHasAppliedInitialTime(true);
      }

      // Check for saved progress and show resume dialog
      // Only show dialog if no initialTime was provided (auto-resume)
      if (torrentHash && fileIndex !== null && !hasShownResumeDialog && initialTime === 0) {
        const resumeInfo = progressService.shouldResumeVideo(torrentHash, fileIndex);
        if (resumeInfo) {
          console.log('📋 Showing resume dialog for:', resumeInfo);
          setResumeData(resumeInfo);
          setShowResumeDialog(true);
        }
        setHasShownResumeDialog(true);
      }
    };

    const handleTimeUpdate = () => {
      const newTime = video.currentTime;
      setCurrentTime(newTime);
      updateBufferedProgress();
      onTimeUpdate?.(newTime);

      // Update Media Session API position
      if (updatePositionState && video.duration) {
        updatePositionState(newTime, video.duration, video.playbackRate);
      }

      // Save progress every 5 seconds
      if (torrentHash && fileIndex !== null && video.duration > 0) {
        const now = Date.now();
        if (!video.progressSaveTimer || now - video.progressSaveTimer > 5000) {
          progressService.saveProgress(torrentHash, fileIndex, newTime, video.duration, title);
          video.progressSaveTimer = now;
        }
      }

      // Skip Intro detection - only show for series (has fileIndex)
      if (!hasSkippedIntro && fileIndex !== null && video.duration > 0) {
        const isSeries = true; // If fileIndex exists, it's part of a series
        const shouldShow = shouldShowSkipIntro(newTime, video.duration, isSeries);
        setShowSkipIntro(shouldShow);
      }
    };

    const handleProgress = () => {
      updateBufferedProgress();
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferedPercent = (bufferedEnd / video.duration) * 100;
        onProgress?.(bufferedPercent);
      }
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => {
      setIsLoading(false);
      // Only try setting initial time when the video can play if we haven't done it yet
      if (
        initialTime > 0 &&
        !hasAppliedInitialTime &&
        Math.abs(video.currentTime - initialTime) > 1
      ) {
        logger.debug('CanPlay: Resuming video at:', initialTime + 's');
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
        setHasAppliedInitialTime(true);
      }
    };
    const handleCanPlayThrough = () => setIsLoading(false);

    const handleEnded = () => {
      logger.debug('Video ended');

      // Update Media Session API
      updateMediaSessionPlaybackState('none');

      // Mark as completed in progress
      if (torrentHash && fileIndex !== null) {
        progressService.saveProgress(torrentHash, fileIndex, video.duration, video.duration, title);
      }

      // Desktop notification
      notifyEnd(title || 'Video playback complete');

      // Check for next episode auto-play
      if (getNextEpisode && onPlayNextEpisode && !upNextTriggered) {
        const nextEp = getNextEpisode();
        if (nextEp) {
          setNextEpisode(nextEp);
          setShowUpNext(true);
        } else if (isLastEpisode) {
          // Show end of season overlay
          setShowUpNext(true);
          setNextEpisode(null);
        }
        setUpNextTriggered(true);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('ended', handleEnded);
    };
  }, [
    src,
    initialTime,
    onTimeUpdate,
    onProgress,
    updateBufferedProgress,
    torrentHash,
    fileIndex,
    title,
    hasShownResumeDialog,
    hasAppliedInitialTime,
    hasSkippedIntro,
    getNextEpisode,
    onPlayNextEpisode,
    isLastEpisode,
    upNextTriggered,
    updatePositionState,
    notifyEnd
  ]);

  // Mobile video initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    if (isMobile) {
      // Mobile-specific video event handlers
      const handleLoadStart = () => {
        console.log('📱 Mobile: Video load started');
        setIsLoading(true);
      };

      const handleCanPlay = () => {
        console.log('📱 Mobile: Video can play');
        setIsLoading(false);
      };

      const handleWaiting = () => {
        console.log('📱 Mobile: Video waiting for data');
        setIsLoading(true);
      };

      const handleStalled = () => {
        console.log('📱 Mobile: Video stalled, retrying...');
        setIsLoading(true);
        // On mobile, try to reload the video source if it stalls
        setTimeout(() => {
          if (video.paused && !isPlaying) {
            video.load();
          }
        }, 2000);
      };

      const handleError = (e) => {
        console.error('📱 Mobile video error:', e);
        setIsLoading(false);
        // Try to recover from error
        setTimeout(() => {
          video.load();
        }, 1000);
      };

      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('stalled', handleStalled);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('stalled', handleStalled);
        video.removeEventListener('error', handleError);
      };
    }
  }, [src, isPlaying]);

  // Fullscreen event listeners for mobile compatibility
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    // Add event listeners for all browser prefixes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // iOS Safari specific
    const video = videoRef.current;
    if (video) {
      video.addEventListener('webkitbeginfullscreen', () => setIsFullscreen(true));
      video.addEventListener('webkitendfullscreen', () => setIsFullscreen(false));
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);

      if (video) {
        video.removeEventListener('webkitbeginfullscreen', () => setIsFullscreen(true));
        video.removeEventListener('webkitendfullscreen', () => setIsFullscreen(false));
      }
    };
  }, []);

  // Mobile viewport optimization for fullscreen
  useEffect(() => {
    const optimizeMobileViewport = () => {
      // Ensure viewport meta tag allows user scaling for fullscreen
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        document.head.appendChild(viewportMeta);
      }

      if (isFullscreen) {
        // Optimize for fullscreen - allow zooming and remove address bar
        viewportMeta.content =
          'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, minimal-ui, viewport-fit=cover';

        // Additional mobile Safari optimizations
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          // Force viewport recalculation
          window.scrollTo(0, 1);
          setTimeout(() => {
            window.scrollTo(0, 0);
            // Trigger a resize to ensure fullscreen
            window.dispatchEvent(new Event('resize'));
          }, 100);
        }
      } else {
        // Reset viewport for normal viewing
        viewportMeta.content =
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
      }
    };

    optimizeMobileViewport();
  }, [isFullscreen]);

  // Optimized play/pause for mobile and instant streaming
  const togglePlay = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        // Update Media Session API
        updateMediaSessionPlaybackState('paused');
      } else {
        const video = videoRef.current;

        // Mobile-specific optimizations
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

        if (isMobile) {
          // For mobile devices, ensure we have user interaction before playing
          try {
            // Start loading the video if not already loaded
            if (video.readyState < 2) {
              // HAVE_CURRENT_DATA
              video.load();
              setIsLoading(true);

              // Wait for enough data to start playing
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);

                const onCanPlay = () => {
                  clearTimeout(timeout);
                  video.removeEventListener('canplay', onCanPlay);
                  video.removeEventListener('error', onError);
                  setIsLoading(false);
                  resolve();
                };

                const onError = (e) => {
                  clearTimeout(timeout);
                  video.removeEventListener('canplay', onCanPlay);
                  video.removeEventListener('error', onError);
                  setIsLoading(false);
                  reject(e);
                };

                video.addEventListener('canplay', onCanPlay);
                video.addEventListener('error', onError);
              });
            }

            // Play with mobile-specific handling
            const playPromise = video.play();
            if (playPromise !== undefined) {
              await playPromise;
              setIsPlaying(true);
              updateMediaSessionPlaybackState('playing');
            }
          } catch (error) {
            console.warn('Mobile playback failed, trying fallback:', error);
            setIsLoading(false);

            // Fallback: simple play attempt
            try {
              await video.play();
              setIsPlaying(true);
              updateMediaSessionPlaybackState('playing');
            } catch (fallbackError) {
              console.error('Video playback failed:', fallbackError);
              setIsLoading(false);
              notifyError('Playback failed: ' + fallbackError.message);
            }
          }
        } else {
          // Desktop playback with buffering check
          const buffered = video.buffered;
          const currentTime = video.currentTime;

          // Check for instant play capability
          let canPlayInstantly = false;

          if (buffered.length > 0) {
            for (let i = 0; i < buffered.length; i++) {
              const start = buffered.start(i);
              const end = buffered.end(i);

              // Check if current position has any buffered data
              if (start <= currentTime && end > currentTime) {
                // For instant streaming, require minimal buffer (1 second)
                if (end - currentTime >= 1) {
                  canPlayInstantly = true;
                  break;
                }
              }
            }
          }

          // Desktop instant play logic
          if (canPlayInstantly || bufferHealth > 30 || instantPlayEnabled) {
            try {
              await video.play();
              setIsPlaying(true);
              setIsLoading(false);
              updateMediaSessionPlaybackState('playing');
            } catch (playError) {
              console.log('Instant play failed, buffering...', playError);
              setIsLoading(true);
              // Retry after a short buffer
              setTimeout(async () => {
                try {
                  await video.play();
                  setIsPlaying(true);
                  setIsLoading(false);
                  updateMediaSessionPlaybackState('playing');
                } catch (retryError) {
                  console.log('Retry play failed:', retryError);
                  setIsLoading(false);
                  notifyError('Playback failed: ' + retryError.message);
                }
              }, 1000);
            }
          } else {
            // Show loading state while building initial buffer
            setIsLoading(true);
            console.log('Building buffer for smooth playback...');

            // Try to play after minimal buffer is ready
            setTimeout(() => {
              if (videoRef.current && !isPlaying) {
                videoRef.current
                  .play()
                  .then(() => {
                    setIsPlaying(true);
                    setIsLoading(false);
                    updateMediaSessionPlaybackState('playing');
                  })
                  .catch(() => {
                    setIsLoading(false);
                  });
              }
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error('Toggle play error:', error);
      setIsLoading(false);
    }
  }, [bufferHealth, instantPlayEnabled, isPlaying, notifyError]);

  // Resume dialog functions
  const handleResumeVideo = () => {
    if (resumeData && videoRef.current) {
      videoRef.current.currentTime = resumeData.currentTime;
      setShowResumeDialog(false);
      setResumeData(null);
    }
  };

  const handleStartFromBeginning = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setShowResumeDialog(false);
      setResumeData(null);
    }
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    video.currentTime = newTime;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (!document.pictureInPictureElement) {
        await videoRef.current.requestPictureInPicture();
        setIsPiP(true);
      } else {
        await document.exitPictureInPicture();
        setIsPiP(false);
      }
    } catch (error) {
      console.error('PiP error:', error);
      toast.error('Picture-in-Picture nije podržan u ovom pregledaču');
    }
  }, [toast]);

  // 🖥️ DESKTOP FULLSCREEN (Electron-optimized)
  const toggleFullscreen = useCallback(() => {
    if (supportsElectronFullscreen) {
      // Use Electron native fullscreen (better performance)
      toggleElectronFullscreen();
      // Sync state
      setIsFullscreen((prev) => !prev);
    } else {
      // Fallback to HTML5 fullscreen (web/mobile)
      const container = videoRef.current?.parentElement;
      const video = videoRef.current;

      if (!container || !video) return;

      // Detect mobile devices
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0;

      if (!isFullscreen) {
        // Try to enter fullscreen
        if (isMobile) {
          // For mobile devices, especially iOS Safari
          if (video.webkitEnterFullscreen) {
            // iOS Safari - use video element fullscreen (hides address bar)
            video.webkitEnterFullscreen();
          } else if (video.requestFullscreen) {
            // Android Chrome/Firefox
            video.requestFullscreen();
          } else if (container.webkitRequestFullscreen) {
            // Fallback for mobile Safari
            container.webkitRequestFullscreen();
          } else {
            // Fallback: simulate fullscreen with CSS
            setIsFullscreen(true);
            // Trigger viewport change to hide address bar
            window.scrollTo(0, 1);
            setTimeout(() => window.scrollTo(0, 0), 100);
          }
        } else {
          // Desktop fullscreen
          if (container.requestFullscreen) {
            container.requestFullscreen();
          } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
          } else if (container.mozRequestFullScreen) {
            container.mozRequestFullScreen();
          } else if (container.msRequestFullscreen) {
            container.msRequestFullscreen();
          }
        }

        if (!isMobile || !video.webkitEnterFullscreen) {
          setIsFullscreen(true);
        }
      } else {
        // Try to exit fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        } else if (video.webkitExitFullscreen) {
          // iOS Safari
          video.webkitExitFullscreen();
        } else {
          // CSS fullscreen fallback
          setIsFullscreen(false);
        }

        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          setIsFullscreen(false);
        }
      }
    }
  }, [isFullscreen, supportsElectronFullscreen, toggleElectronFullscreen]);

  const skip = useCallback(
    (seconds) => {
      const video = videoRef.current;
      video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
    },
    [duration]
  );

  const handleSkipIntro = () => {
    if (!videoRef.current) return;

    const skipToTime = getSkipToTime();
    videoRef.current.currentTime = skipToTime;
    setCurrentTime(skipToTime);
    setHasSkippedIntro(true);
    setShowSkipIntro(false);

    console.log('⏭️ Skipped intro to:', skipToTime + 's');
  };

  const changePlaybackRate = (rate) => {
    const video = videoRef.current;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  // 🎮 DESKTOP KEYBOARD SHORTCUTS (Enhanced for desktop)
  useVideoKeyboardShortcuts({
    onPlayPause: togglePlay,
    onSeekForward: useCallback((seconds) => {
      if (videoRef.current && videoRef.current.duration) {
        videoRef.current.currentTime = Math.min(
          videoRef.current.duration,
          videoRef.current.currentTime + seconds
        );
      }
    }, []),
    onSeekBackward: useCallback((seconds) => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - seconds);
      }
    }, []),
    onVolumeUp: useCallback((amount) => {
      setVolume((prev) => Math.min(1, prev + amount));
      setIsMuted(false);
    }, []),
    onVolumeDown: useCallback((amount) => {
      setVolume((prev) => Math.max(0, prev - amount));
    }, []),
    onToggleMute: useCallback(() => {
      setIsMuted((prev) => !prev);
    }, []),
    onToggleFullscreen: toggleFullscreen,
    onToggleSubtitles: useCallback(() => {
      toggleSubtitles();
    }, [toggleSubtitles]),
    onSpeedUp: useCallback(() => {
      setPlaybackRate((prev) => Math.min(2, prev + 0.25));
      if (videoRef.current) {
        videoRef.current.playbackRate = Math.min(2, playbackRate + 0.25);
      }
    }, [playbackRate]),
    onSpeedDown: useCallback(() => {
      setPlaybackRate((prev) => Math.max(0.25, prev - 0.25));
      if (videoRef.current) {
        videoRef.current.playbackRate = Math.max(0.25, playbackRate - 0.25);
      }
    }, [playbackRate])
  });

  // Legacy keyboard shortcuts (keep for compatibility)
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 'p':
          e.preventDefault();
          togglePiP();
          break;
        case 's':
          e.preventDefault();
          setShowSubtitleMenu(!showSubtitleMenu);
          break;
        case '?':
          e.preventDefault();
          setShowKeyboardShortcuts(!showKeyboardShortcuts);
          break;
        case 'escape':
          if (showKeyboardShortcuts) {
            setShowKeyboardShortcuts(false);
          } else if (showSettings) {
            setShowSettings(false);
          }
          break;
        default:
          // Numbers 0-9 for seeking to percentage
          if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            const percentage = e.key === '0' ? 1 : parseInt(e.key) / 10;
            if (videoRef.current && duration) {
              videoRef.current.currentTime = duration * percentage;
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    showKeyboardShortcuts,
    showSettings,
    showSubtitleMenu,
    duration,
    togglePiP,
    setShowSubtitleMenu
  ]);

  // Double-tap handler for mobile devices
  const handleVideoTap = () => {
    const now = Date.now();
    const tapInterval = 300; // milliseconds

    if (now - lastTapTimeRef.current < tapInterval) {
      // Double-tap detected
      tapCountRef.current++;
      if (tapCountRef.current === 2) {
        // On mobile, double-tap toggles fullscreen
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
          toggleFullscreen();
        } else {
          // On desktop, double-click toggles fullscreen
          toggleFullscreen();
        }
        tapCountRef.current = 0;
      }
    } else {
      // Single tap
      tapCountRef.current = 1;
      setTimeout(() => {
        if (tapCountRef.current === 1) {
          // Single tap action - toggle play/pause
          togglePlay();
        }
        tapCountRef.current = 0;
      }, tapInterval);
    }

    lastTapTimeRef.current = now;
  };

  // Simple toggle function for torrent stats overlay
  const toggleTorrentStats = () => {
    console.log('Toggling torrent stats. Current state:', showTorrentStats);
    setShowTorrentStats((prev) => !prev);
  };

  // Subtitle management functions
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  // Show Up Next overlay 30 seconds before video ends
  useEffect(() => {
    if (!getNextEpisode || !onPlayNextEpisode || upNextTriggered) return;

    const video = videoRef.current;
    if (!video || !duration) return;

    const checkUpNext = () => {
      const timeRemaining = duration - currentTime;

      // Show Up Next 30 seconds before end
      if (timeRemaining <= 30 && timeRemaining > 0 && !showUpNext) {
        const nextEp = getNextEpisode();
        if (nextEp) {
          setNextEpisode(nextEp);
          setShowUpNext(true);
          setUpNextTriggered(true);
          console.log('📺 Up Next triggered:', nextEp.title);
        } else if (isLastEpisode) {
          // Will be handled by onEnded instead
          setUpNextTriggered(true);
        }
      }
    };

    checkUpNext();
  }, [
    currentTime,
    duration,
    getNextEpisode,
    onPlayNextEpisode,
    showUpNext,
    upNextTriggered,
    isLastEpisode
  ]);

  // Picture-in-Picture events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPiP(true);
    const handleLeavePiP = () => setIsPiP(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, []);

  // Keyboard shortcuts for subtitle sync
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only respond if not typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // [ key - delay subtitle (decrease offset)
      if (e.key === '[') {
        e.preventDefault();
        if (currentSubtitle && adjustSubtitleOffset) {
          adjustSubtitleOffset(-500);
          showControlsTemporarily();
        }
      }

      // ] key - advance subtitle (increase offset)
      if (e.key === ']') {
        e.preventDefault();
        if (currentSubtitle && adjustSubtitleOffset) {
          adjustSubtitleOffset(500);
          showControlsTemporarily();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSubtitle, adjustSubtitleOffset, showControlsTemporarily]);

  return (
    <>
      <div
        className={`video-player-container ${isFullscreen ? 'fullscreen' : ''} ${
          isFullscreen &&
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            ? 'mobile-fullscreen'
            : ''
        }`}
        onMouseMove={showControlsTemporarily}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        {/* Close Button - always visible on the right */}
        {onClose && (
          <button className="video-close-button" onClick={onClose} title="Close video">
            <X size={24} />
          </button>
        )}

        <video
          ref={videoRef}
          src={src}
          className="video-element"
          onClick={handleVideoTap}
          onDoubleClick={toggleFullscreen}
          onPlay={() => {
            setIsPlaying(true);
            updateMediaSessionPlaybackState('playing');
          }}
          onPause={() => {
            setIsPlaying(false);
            updateMediaSessionPlaybackState('paused');
          }}
          playsInline={false}
          webkit-playsinline="false"
          controls={false}
          preload="none"
          crossOrigin="anonymous"
          muted={false}
          autoPlay={false}
          poster=""
          // 🚀 GPU acceleration hints for 4K desktop playback
          style={{
            willChange: isPlaying ? 'transform' : 'auto',
            transform: 'translateZ(0)', // Force GPU layer
            backfaceVisibility: 'hidden' // Reduce repaints
          }}
        />

        {isLoading && (
          <div className="video-loading">
            <Loader2 className="loading-spinner" />
            <span>Buffering...</span>
          </div>
        )}

        {/* Enhanced Torrent Stats Overlay */}
        {showTorrentStats && torrentHash && (
          <div className="torrent-stats-overlay">
            <div className="stats-header">
              <div className="network-status">
                {networkStatus === 'connected' ? (
                  <Wifi className="status-icon connected" size={16} />
                ) : networkStatus === 'seeking' ? (
                  <Activity className="status-icon seeking" size={16} />
                ) : (
                  <WifiOff className="status-icon disconnected" size={16} />
                )}
                <span className={`status-text ${networkStatus}`}>
                  {networkStatus === 'connected'
                    ? 'Connected'
                    : networkStatus === 'seeking'
                    ? 'Seeking Peers'
                    : 'Disconnected'}
                </span>
              </div>
              {/* Only overlay minimize button */}
              <button
                className="stats-minimize"
                onClick={() => {
                  console.log('Minimize overlay clicked');
                  setShowTorrentStats(false);
                }}
                title="Hide Stats Overlay"
              >
                <Minimize2 size={14} />
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-item">
                <Users size={14} />
                <span className="stat-label">Peers</span>
                <span className="stat-value">{torrentStats.peers}</span>
              </div>

              <div className="stat-item">
                <TrendingDown size={14} />
                <span className="stat-label">Download</span>
                <span className="stat-value">
                  {(torrentStats.downloadSpeed / 1024 / 1024).toFixed(1)} MB/s
                </span>
              </div>

              <div className="stat-item">
                <TrendingUp size={14} />
                <span className="stat-label">Upload</span>
                <span className="stat-value">
                  {(torrentStats.uploadSpeed / 1024 / 1024).toFixed(1)} MB/s
                </span>
              </div>

              <div className="stat-item">
                <Download size={14} />
                <span className="stat-label">Progress</span>
                <span className="stat-value">{torrentStats.progress.toFixed(1)}%</span>
              </div>
            </div>

            {/* Buffer Health Indicator */}
            <div className="buffer-health">
              <div className="buffer-label">Buffer Health</div>
              <div className="buffer-bar">
                <div
                  className={`buffer-fill ${
                    bufferHealth > 70 ? 'good' : bufferHealth > 30 ? 'medium' : 'poor'
                  }`}
                  style={{ width: `${Math.min(100, bufferHealth)}%` }}
                />
              </div>
              <span className="buffer-percentage">{Math.round(bufferHealth)}%</span>
            </div>
          </div>
        )}

        {/* Stats Toggle Button (when hidden) */}
        {!showTorrentStats && torrentHash && (
          <button
            className="stats-show-button"
            onClick={toggleTorrentStats}
            title="Show torrent stats"
          >
            <Activity size={16} />
          </button>
        )}

        <div className={`video-controls ${showControls ? 'visible' : 'hidden'}`}>
          <div className="controls-background" />

          {/* Enhanced Progress Bar with Multiple Buffer Ranges */}
          <div className="progress-container" onClick={handleSeek}>
            <div className="progress-bar">
              {/* Show all buffered ranges */}
              {videoRef.current &&
                videoRef.current.buffered.length > 0 &&
                Array.from({ length: videoRef.current.buffered.length }, (_, i) => {
                  const start = (videoRef.current.buffered.start(i) / duration) * 100;
                  const end = (videoRef.current.buffered.end(i) / duration) * 100;
                  return (
                    <div
                      key={i}
                      className="progress-buffered-range"
                      style={{
                        left: `${start}%`,
                        width: `${end - start}%`
                      }}
                    />
                  );
                })}

              {/* Overall buffer indicator */}
              <div className="progress-buffered" style={{ width: `${buffered}%` }} />

              {/* Played progress */}
              <div
                className="progress-played"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />

              {/* Current position thumb */}
              <div
                className="progress-thumb"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />

              {/* Torrent download progress overlay */}
              {torrentStats.progress > 0 && (
                <div
                  className="progress-torrent"
                  style={{ width: `${torrentStats.progress}%` }}
                  title={`Torrent downloaded: ${torrentStats.progress.toFixed(1)}%`}
                />
              )}
            </div>

            {/* Progress time tooltip with enhanced buffer info */}
            <div className="progress-tooltip">
              {formatTime(currentTime)} / {formatTime(duration)}
              {torrentStats.progress > 0 && (
                <span className="torrent-progress-text">
                  • Torrent: {torrentStats.progress.toFixed(1)}%
                </span>
              )}
              {bufferVisualization.percentage > 0 && (
                <span className="buffer-status">
                  • Buffer: {bufferVisualization.percentage}%
                  {bufferVisualization.ahead > 0 &&
                    ` (${Math.round(bufferVisualization.ahead)}s ahead)`}
                </span>
              )}
            </div>
          </div>

          {/* Enhanced Buffer Status Overlay */}
          {(isLoading || (!isPlaying && bufferHealth < 100)) && (
            <div
              className={`buffer-status-overlay ${
                isLoading || (!isPlaying && bufferHealth < 100) ? 'visible' : ''
              }`}
            >
              <div className="buffer-status-title">Video Buffer</div>
              <div className="buffer-status-content">
                <div className="buffer-info-row">
                  <span className="buffer-info-label">Buffer Level:</span>
                  <span className="buffer-info-value">{Math.round(bufferHealth)}%</span>
                </div>
                {bufferVisualization.ahead > 0 && (
                  <div className="buffer-info-row">
                    <span className="buffer-info-label">Ready Time:</span>
                    <span className="buffer-info-value">
                      {Math.round(bufferVisualization.ahead)}s
                    </span>
                  </div>
                )}
                <div className="buffer-health-display">
                  <div className="buffer-health-label">Buffer Health</div>
                  <div className="buffer-health-bar">
                    <div
                      className={`buffer-health-fill ${
                        bufferHealth > 70 ? 'good' : bufferHealth > 30 ? 'medium' : 'poor'
                      }`}
                      style={{ width: `${Math.max(bufferHealth, 5)}%` }}
                    />
                  </div>
                  <div
                    className={`buffer-health-text ${
                      bufferHealth > 70 ? 'good' : bufferHealth > 30 ? 'medium' : 'poor'
                    }`}
                  >
                    {bufferHealth > 70 ? 'Excellent' : bufferHealth > 30 ? 'Good' : 'Poor'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Controls */}
          <div className="controls-main">
            <div className="controls-left">
              <button onClick={togglePlay} className="control-button play-button">
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>

              <button onClick={() => skip(-10)} className="control-button">
                <SkipBack size={20} />
              </button>

              <button onClick={() => skip(10)} className="control-button">
                <SkipForward size={20} />
              </button>

              <div className="volume-control">
                <button onClick={toggleMute} className="control-button">
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                />
              </div>

              <div className="time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="controls-center">
              <div className="video-title">{title}</div>
            </div>

            <div className="controls-right">
              {/* Subtitle Menu */}
              <SubtitleMenu
                isOpen={showSubtitleMenu}
                onToggle={() => setShowSubtitleMenu(!showSubtitleMenu)}
                currentSubtitle={currentSubtitle}
                localSubtitles={localSubtitles}
                torrentSubtitles={torrentSubtitles}
                onlineSubtitles={onlineSubtitles}
                onLoadSubtitle={loadSubtitle}
                onLoadOnlineSubtitle={loadOnlineSubtitle}
                onSearchOnline={searchOnlineSubtitles}
                isSearchingOnline={isSearchingOnline}
                isUploadingSubtitle={isUploadingSubtitle}
                onTriggerUpload={triggerSubtitleUpload}
                onUploadFile={handleSubtitleUpload}
                uploadError={subtitleUploadError}
                deleteError={subtitleDeleteError}
                deletingSubtitleId={subtitleDeletingId}
                onDeleteSubtitle={handleSubtitleDelete}
                subtitlesEnabled={subtitlesEnabled}
                onToggleSubtitles={toggleSubtitles}
                subtitleFileInputRef={subtitleFileInputRef}
                mediaTitle={title}
                subtitleOffset={subtitleOffset}
                onAdjustOffset={adjustSubtitleOffset}
              />

              <div className="settings-menu">
                <button onClick={() => setShowSettings(!showSettings)} className="control-button">
                  <Settings size={20} />
                </button>

                {showSettings && (
                  <div className="settings-dropdown">
                    <div className="settings-section">
                      <span>Playback Speed</span>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => changePlaybackRate(rate)}
                          className={`settings-option ${playbackRate === rate ? 'active' : ''}`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowKeyboardShortcuts(true)}
                className="control-button keyboard-button"
                title="Keyboard Shortcuts (?)"
              >
                <Keyboard size={20} />
              </button>

              <button
                onClick={togglePiP}
                className={`control-button pip-button ${isPiP ? 'active' : ''}`}
                title="Picture in Picture (P)"
                aria-pressed={isPiP}
                disabled={!document.pictureInPictureEnabled}
              >
                <PictureInPicture size={20} />
              </button>

              <a
                href={src}
                download
                className="control-button download-button"
                title="Download video"
              >
                <Download size={20} />
              </a>

              <button
                onClick={toggleFullscreen}
                className="control-button fullscreen-button"
                title="Fullscreen (F or double-tap video)"
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Resume Dialog */}
        {showResumeDialog && resumeData && (
          <div className="resume-dialog-overlay">
            <div className="resume-dialog">
              <h3>Resume Video</h3>
              <p>Do you want to continue from where you left off?</p>
              <div className="resume-info">
                <div className="resume-time">
                  Last watched: {progressService.formatTime(resumeData.currentTime)}
                </div>
                <div className="resume-date">
                  {progressService.formatRelativeTime(resumeData.lastWatched)}
                </div>
              </div>
              <div className="resume-actions">
                <button onClick={handleStartFromBeginning} className="resume-button secondary">
                  Start from Beginning
                </button>
                <button onClick={handleResumeVideo} className="resume-button primary">
                  Resume at {progressService.formatTime(resumeData.currentTime)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Skip Intro Button */}
        {showSkipIntro && <SkipIntroButton onSkip={handleSkipIntro} visible={showSkipIntro} />}

        {/* Up Next Overlay */}
        {showUpNext && (
          <UpNextOverlay
            nextEpisode={nextEpisode}
            isLastEpisode={isLastEpisode && !nextEpisode}
            onPlayNext={() => {
              if (nextEpisode && onPlayNextEpisode) {
                setShowUpNext(false);
                onPlayNextEpisode(nextEpisode);
              }
            }}
            onCancel={() => {
              setShowUpNext(false);
              setUpNextTriggered(true);
            }}
            countdownSeconds={5}
          />
        )}

        {/* Keyboard Shortcuts Modal */}
        {showKeyboardShortcuts && (
          <div
            className="keyboard-shortcuts-overlay"
            onClick={() => setShowKeyboardShortcuts(false)}
          >
            <div className="keyboard-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
              <div className="shortcuts-header">
                <h3>⌨️ Keyboard Shortcuts</h3>
                <button onClick={() => setShowKeyboardShortcuts(false)} className="close-shortcuts">
                  <X size={20} />
                </button>
              </div>
              <div className="shortcuts-grid">
                <div className="shortcut-section">
                  <h4>Playback</h4>
                  <div className="shortcut-item">
                    <kbd>Space</kbd>
                    <kbd>K</kbd>
                    <span>Play / Pause</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>←</kbd>
                    <kbd>J</kbd>
                    <span>Rewind 10s</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>→</kbd>
                    <kbd>L</kbd>
                    <span>Forward 10s</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>0-9</kbd>
                    <span>Seek to %</span>
                  </div>
                </div>

                <div className="shortcut-section">
                  <h4>Volume</h4>
                  <div className="shortcut-item">
                    <kbd>↑</kbd>
                    <span>Volume Up</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>↓</kbd>
                    <span>Volume Down</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>M</kbd>
                    <span>Mute / Unmute</span>
                  </div>
                </div>

                <div className="shortcut-section">
                  <h4>Display</h4>
                  <div className="shortcut-item">
                    <kbd>F</kbd>
                    <span>Fullscreen</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>P</kbd>
                    <span>Picture-in-Picture</span>
                  </div>
                </div>

                <div className="shortcut-section">
                  <h4>Subtitles</h4>
                  <div className="shortcut-item">
                    <kbd>S</kbd>
                    <span>Toggle Subtitles Menu</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>[</kbd>
                    <span>Delay Subtitle (-0.5s)</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>]</kbd>
                    <span>Advance Subtitle (+0.5s)</span>
                  </div>
                </div>

                <div className="shortcut-section">
                  <h4>Other</h4>
                  <div className="shortcut-item">
                    <kbd>?</kbd>
                    <span>Show Shortcuts</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Esc</kbd>
                    <span>Close Menus</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {confirmDialog}
    </>
  );
};

export default VideoPlayer;
