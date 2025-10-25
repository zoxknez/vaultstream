import {
  Activity,
  Download,
  Maximize,
  Minimize,
  Pause,
  Play,
  Settings,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';

const formatTime = (value = 0) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60)
    .toString()
    .padStart(2, '0');

  return `${minutes}:${seconds}`;
};

const DeviceVideoControls = ({
  isPlaying,
  onPlay,
  onPause,
  currentTime,
  duration,
  bufferHealth,
  isMuted,
  volume,
  onMuteToggle,
  onVolumeChange,
  onProgressClick,
  progressRef,
  volumeRef,
  onSettingsToggle,
  onStatsToggle,
  onDownload,
  isFullscreen,
  onFullscreenToggle,
  onClose
}) => {
  const handlePlayPause = () => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  const playbackPercentage = duration ? (currentTime / duration) * 100 : 0;
  const bufferPercentage = bufferHealth * 100;

  return (
    <div className="video-controls" data-testid="video-controls">
      <button
        className="play-pause-button"
        data-testid={isPlaying ? 'pause-button' : 'play-button'}
        onClick={handlePlayPause}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
      </button>

      <div className="progress-container" ref={progressRef} onClick={onProgressClick}>
        <div className="progress-bar" data-testid="progress-bar">
          <div className="progress-fill" style={{ width: `${playbackPercentage}%` }} />
          <div
            className="buffered-progress"
            style={{ width: `${bufferPercentage}%` }}
            data-testid="buffered-progress"
          />
        </div>
      </div>

      <div className="time-display" data-testid="time-display">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      <div className="volume-controls">
        <button
          className="volume-button"
          data-testid={isMuted ? 'unmute-button' : 'mute-button'}
          onClick={onMuteToggle}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input
          type="range"
          className="volume-slider"
          data-testid="volume-slider"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={onVolumeChange}
          ref={volumeRef}
        />
      </div>

      <button
        className="settings-button"
        data-testid="settings-button"
        onClick={onSettingsToggle}
        aria-label="Settings"
      >
        <Settings size={20} />
      </button>

      <button
        className="stats-button"
        data-testid="stats-button"
        onClick={onStatsToggle}
        aria-label="Statistics"
      >
        <Activity size={20} />
      </button>

      <button
        className="download-button"
        data-testid="download-button"
        onClick={onDownload}
        aria-label="Download"
      >
        <Download size={20} />
      </button>

      <button
        className="fullscreen-button"
        data-testid={isFullscreen ? 'exit-fullscreen-button' : 'fullscreen-button'}
        onClick={onFullscreenToggle}
        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      >
        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
      </button>

      <button
        className="close-button"
        data-testid="video-close-button"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default DeviceVideoControls;
