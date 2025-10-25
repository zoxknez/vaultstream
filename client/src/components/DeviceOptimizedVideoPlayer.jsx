/**
 * 🎬 STREAMVAULT DEVICE-OPTIMIZED VIDEO PLAYER
 * Video player with device-specific optimizations
 */

import { Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useDeviceOptimization } from '../hooks/useDeviceOptimization';
import { usePerformance } from '../hooks/usePerformance';
import { logger } from '../utils/logger';
import DeviceErrorOverlay from './devicePlayer/DeviceErrorOverlay';
import DeviceSettingsMenu from './devicePlayer/DeviceSettingsMenu';
import DeviceStatsOverlay from './devicePlayer/DeviceStatsOverlay';
import DeviceStatusOverlay from './devicePlayer/DeviceStatusOverlay';
import DeviceVideoControls from './devicePlayer/DeviceVideoControls';
import useDevicePresentation from './devicePlayer/useDevicePresentation';
import useDeviceTelemetry from './devicePlayer/useDeviceTelemetry';
import usePlayerInteractions from './devicePlayer/usePlayerInteractions';
import usePlayerMenus from './devicePlayer/usePlayerMenus';
import useVideoControls from './devicePlayer/useVideoControls';
import { useToast } from './Toast';
import './VideoPlayer.css';

const DeviceOptimizedVideoPlayer = ({ torrentHash, videoFile, onClose, onError }) => {
  // Device optimization
  const {
    deviceInfo,
    optimalSettings,
    getDeviceClasses,
    getDeviceStyles,
    supportsFeature,
    getDeviceStatus
  } = useDeviceOptimization();

  // Performance monitoring
  const { mark, measure, getRecommendations } = usePerformance();

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const { showSettings, toggleSettings, showStats, toggleStats } = usePlayerMenus();
  const [bufferHealth, setBufferHealth] = useState(0);
  const [error, setError] = useState(null);
  const videoFileIndex = videoFile?.index;

  // Toast
  const { showToast } = useToast();

  const { networkQuality, torrentStats } = useDeviceTelemetry({
    showStats,
    getRecommendations,
    showToast,
    getDeviceStatus
  });

  // Refs
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const settingsRef = useRef(null);
  const statsRef = useRef(null);
  const hideControlsTimeoutRef = useRef(null);

  const {
    handleVideoLoad,
    handlePlay,
    handlePause,
    handleSeek,
    handleVolumeChange,
    handleMuteToggle,
    handlePlaybackRateChange,
    handleFullscreenToggle,
    handleWaiting,
    handleCanPlay,
    handleTimeUpdate,
    handleProgressUpdate
  } = useVideoControls({
    videoRef,
    deviceInfo,
    mark,
    measure,
    showToast,
    hideControlsTimeoutRef,
    setIsPlaying,
    setShowControls,
    setDuration,
    setVolume,
    setIsMuted,
    setPlaybackRate,
    setIsFullscreen,
    isFullscreen,
    setCurrentTime,
    setBufferHealth,
    setIsLoading,
    setError
  });

  const { deviceStyles, deviceClasses, deviceStatus } = useDevicePresentation({
    videoRef,
    deviceInfo,
    optimalSettings,
    supportsFeature,
    getDeviceStatus,
    getDeviceStyles,
    getDeviceClasses
  });

  const {
    handleControlsVisibility,
    handleKeyboardShortcuts,
    handleTouchGestures,
    handleMouseEvents
  } = usePlayerInteractions({
    deviceInfo,
    isPlaying,
    currentTime,
    duration,
    volume,
    toggleSettings,
    isFullscreen,
    handlePlay,
    handlePause,
    handleSeek,
    handleVolumeChange,
    handleMuteToggle,
    handleFullscreenToggle,
    setShowControls,
    hideControlsTimeoutRef,
    videoRef
  });

  /**
   * Handle progress bar click
   */
  const handleProgressClick = useCallback(
    (event) => {
      if (progressRef.current) {
        const rect = progressRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const width = rect.width;
        const percentage = x / width;
        const time = percentage * duration;
        handleSeek(time);
      }
    },
    [duration, handleSeek]
  );

  /**
   * Handle volume slider change
   */
  const handleVolumeSliderChange = useCallback(
    (event) => {
      const value = parseFloat(event.target.value);
      handleVolumeChange(value);
    },
    [handleVolumeChange]
  );

  const handleDownload = useCallback(() => {
    if (typeof videoFileIndex !== 'number') {
      return;
    }

    window.open(`/api/torrents/${torrentHash}/files/${videoFileIndex}/download`);
  }, [torrentHash, videoFileIndex]);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handle close
   */
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  /**
   * Handle error
   */
  const handleError = useCallback(
    (error) => {
      logger.error('Video player error:', error);
      setError(error.message);
      if (onError) {
        onError(error);
      }
      showToast('Video playback error', 'error');
    },
    [onError, showToast]
  );

  /**
   * Render device-optimized video player
   */
  return (
    <div
      className={`device-optimized-video-player ${deviceClasses}`}
      style={deviceStyles}
      data-testid="video-player"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="video-element"
        data-testid="video-element"
        onLoadedMetadata={handleVideoLoad}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onCanPlayThrough={handleCanPlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onProgress={handleProgressUpdate}
        onError={handleError}
        onKeyDown={handleKeyboardShortcuts}
        onTouchStart={handleTouchGestures}
        onTouchEnd={handleTouchGestures}
        onTouchMove={handleTouchGestures}
        onMouseEnter={handleMouseEvents}
        onMouseLeave={handleMouseEvents}
        onMouseMove={handleMouseEvents}
        onDoubleClick={handleFullscreenToggle}
        onClick={handleControlsVisibility}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          ...deviceStyles
        }}
      >
        {typeof videoFileIndex === 'number' && (
          <source src={`/api/stream/${torrentHash}/${videoFileIndex}`} type="video/mp4" />
        )}
        Your browser does not support the video tag.
      </video>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="loading-spinner" data-testid="loading-spinner">
          <Loader2 className="animate-spin" size={32} />
        </div>
      )}

      {/* Video Controls */}
      {showControls && (
        <DeviceVideoControls
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onPause={handlePause}
          currentTime={currentTime}
          duration={duration}
          bufferHealth={bufferHealth}
          isMuted={isMuted}
          volume={volume}
          onMuteToggle={handleMuteToggle}
          onVolumeChange={handleVolumeSliderChange}
          onProgressClick={handleProgressClick}
          progressRef={progressRef}
          volumeRef={volumeRef}
          onSettingsToggle={toggleSettings}
          onStatsToggle={toggleStats}
          onDownload={handleDownload}
          isFullscreen={isFullscreen}
          onFullscreenToggle={handleFullscreenToggle}
          onClose={handleClose}
        />
      )}

      {/* Settings Menu */}
      {showSettings && (
        <DeviceSettingsMenu
          playbackRate={playbackRate}
          onPlaybackRateChange={handlePlaybackRateChange}
          settingsRef={settingsRef}
        />
      )}

      {/* Stats Overlay */}
      {showStats && (
        <DeviceStatsOverlay
          statsRef={statsRef}
          torrentStats={torrentStats}
          networkQuality={networkQuality}
          onClose={toggleStats}
        />
      )}

      <DeviceErrorOverlay error={error} onDismiss={handleDismissError} />
      <DeviceStatusOverlay deviceStatus={deviceStatus} />
    </div>
  );
};

export default DeviceOptimizedVideoPlayer;
