import { useCallback } from 'react';
import { logger } from '../../utils/logger';

const useVideoControls = ({
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
}) => {
  const handleVideoLoad = useCallback(() => {
    mark('video-load-start');

    if (!videoRef.current) {
      return;
    }

    const video = videoRef.current;
    setDuration(video.duration);
    setVolume(video.volume);
    setIsMuted(video.muted);

    if (deviceInfo.deviceType === 'mobile') {
      video.volume = 0.8;
      video.playbackRate = 1.0;
    } else if (deviceInfo.deviceType === 'tablet') {
      video.volume = 0.9;
      video.playbackRate = 1.0;
    } else {
      video.volume = 1.0;
      video.playbackRate = 1.0;
    }

    setVolume(video.volume);
    setPlaybackRate(video.playbackRate);

    measure('video-load-start', 'video-load-end');

    logger.info('Video loaded with device optimizations', {
      duration: video.duration,
      volume: video.volume,
      playbackRate: video.playbackRate,
      deviceType: deviceInfo.deviceType
    });
  }, [deviceInfo, mark, measure, setDuration, setIsMuted, setPlaybackRate, setVolume, videoRef]);

  const handlePlay = useCallback(async () => {
    mark('video-play-start');

    if (!videoRef.current) {
      return;
    }

    try {
      await videoRef.current.play();
      setIsPlaying(true);

      clearTimeout(hideControlsTimeoutRef.current);
      if (deviceInfo.deviceType === 'mobile') {
        setShowControls(true);
      } else {
        setShowControls(true);
        const timeout = deviceInfo.deviceType === 'tablet' ? 3000 : 5000;
        hideControlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, timeout);
      }

      measure('video-play-start', 'video-play-end');

      logger.info('Video playing with device optimizations', {
        deviceType: deviceInfo.deviceType,
        isPlaying: true
      });
    } catch (error) {
      logger.error('Failed to play video:', error);
      setError(error.message);
      showToast('Failed to play video', 'error');
    }
  }, [
    deviceInfo,
    hideControlsTimeoutRef,
    mark,
    measure,
    setError,
    setIsPlaying,
    setShowControls,
    showToast,
    videoRef
  ]);

  const handlePause = useCallback(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.pause();
    setIsPlaying(false);

    logger.info('Video paused', {
      deviceType: deviceInfo.deviceType,
      isPlaying: false
    });
  }, [deviceInfo, setIsPlaying, videoRef]);

  const handleSeek = useCallback(
    (time) => {
      if (!videoRef.current) {
        return;
      }

      videoRef.current.currentTime = time;
      setCurrentTime(time);

      logger.info('Video seeked', {
        time,
        deviceType: deviceInfo.deviceType
      });
    },
    [deviceInfo, setCurrentTime, videoRef]
  );

  const handleVolumeChange = useCallback(
    (newVolume) => {
      if (!videoRef.current) {
        return;
      }

      let volumeToApply = newVolume;

      if (deviceInfo.deviceType === 'mobile' && newVolume > 0.8) {
        volumeToApply = 0.8;
        showToast('Volume limited for mobile device', 'info');
      }

      videoRef.current.volume = volumeToApply;
      setVolume(volumeToApply);

      logger.info('Volume changed', {
        volume: volumeToApply,
        deviceType: deviceInfo.deviceType
      });
    },
    [deviceInfo, setVolume, showToast, videoRef]
  );

  const handleMuteToggle = useCallback(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);

    logger.info('Mute toggled', {
      muted: videoRef.current.muted,
      deviceType: deviceInfo.deviceType
    });
  }, [deviceInfo, setIsMuted, videoRef]);

  const handlePlaybackRateChange = useCallback(
    (rate) => {
      if (!videoRef.current) {
        return;
      }

      let rateToApply = rate;

      if (deviceInfo.deviceType === 'mobile' && (rate < 0.5 || rate > 2.0)) {
        rateToApply = Math.max(0.5, Math.min(2.0, rate));
        showToast('Playback rate limited for mobile device', 'info');
      }

      videoRef.current.playbackRate = rateToApply;
      setPlaybackRate(rateToApply);

      logger.info('Playback rate changed', {
        rate: rateToApply,
        deviceType: deviceInfo.deviceType
      });
    },
    [deviceInfo, setPlaybackRate, showToast, videoRef]
  );

  const handleFullscreenToggle = useCallback(() => {
    if (!document.fullscreenElement) {
      if (videoRef.current?.requestFullscreen) {
        videoRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }

    logger.info('Fullscreen toggled', {
      isFullscreen: !isFullscreen,
      deviceType: deviceInfo.deviceType
    });
  }, [deviceInfo, isFullscreen, setIsFullscreen, videoRef]);

  const handleWaiting = useCallback(() => {
    setIsLoading(true);
  }, [setIsLoading]);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
  }, [setIsLoading]);

  const updateBufferHealth = useCallback(() => {
    if (!videoRef.current) {
      return;
    }

    const buffered = videoRef.current.buffered;
    if (buffered.length > 0) {
      const bufferedEnd = buffered.end(buffered.length - 1);
      const bufferHealth = (bufferedEnd - videoRef.current.currentTime) / videoRef.current.duration;
      setBufferHealth(bufferHealth);
    }
  }, [setBufferHealth, videoRef]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) {
      return;
    }

    setCurrentTime(videoRef.current.currentTime);
    updateBufferHealth();
  }, [setCurrentTime, updateBufferHealth, videoRef]);

  const handleProgressUpdate = useCallback(() => {
    updateBufferHealth();
  }, [updateBufferHealth]);

  return {
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
  };
};

export default useVideoControls;
