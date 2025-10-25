import { useCallback, useEffect } from 'react';

const usePlayerInteractions = ({
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
}) => {
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [hideControlsTimeoutRef]);

  const handleControlsVisibility = useCallback(() => {
    if (deviceInfo.deviceType === 'mobile') {
      setShowControls(true);
      clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    } else if (deviceInfo.deviceType === 'tablet') {
      setShowControls(true);
      clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    } else {
      setShowControls(true);
      clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
  }, [deviceInfo, hideControlsTimeoutRef, setShowControls]);

  const handleKeyboardShortcuts = useCallback(
    (event) => {
      if (deviceInfo.deviceType === 'mobile') {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          if (isPlaying) {
            handlePause();
          } else {
            handlePlay();
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          handleSeek(Math.max(0, currentTime - 10));
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleSeek(Math.min(duration, currentTime + 10));
          break;
        case 'ArrowUp':
          event.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          event.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'm':
        case 'M':
          event.preventDefault();
          handleMuteToggle();
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          handleFullscreenToggle();
          break;
        case 's':
        case 'S':
          event.preventDefault();
          toggleSettings();
          break;
        case 'Escape':
          event.preventDefault();
          if (isFullscreen) {
            handleFullscreenToggle();
          }
          break;
      }
    },
    [
      deviceInfo,
      isPlaying,
      handlePause,
      handlePlay,
      handleSeek,
      currentTime,
      duration,
      handleVolumeChange,
      volume,
      handleMuteToggle,
      handleFullscreenToggle,
      toggleSettings,
      isFullscreen
    ]
  );

  const handleTouchGestures = useCallback(
    (event) => {
      if (deviceInfo.deviceType !== 'mobile' && deviceInfo.deviceType !== 'tablet') {
        return;
      }

      const touch = event.touches[0] || event.changedTouches?.[0];
      if (!touch || !videoRef?.current) {
        return;
      }

      if (event.type === 'touchend') {
        if (isPlaying) {
          handlePause();
        } else {
          handlePlay();
        }
      }

      if (event.type === 'dblclick') {
        handleFullscreenToggle();
      }

      if (event.type === 'touchmove') {
        const nextTouch = event.touches[0] || touch;
        const deltaX = touch.clientX - (nextTouch?.clientX ?? touch.clientX);
        if (Math.abs(deltaX) > 50) {
          if (deltaX > 0) {
            handleSeek(Math.max(0, currentTime - 10));
          } else {
            handleSeek(Math.min(duration, currentTime + 10));
          }
        }
      }

      if (event.type === 'touchmove') {
        const deltaY = touch.clientY - (event.touches[0]?.clientY || touch.clientY);
        if (Math.abs(deltaY) > 50) {
          if (deltaY > 0) {
            handleVolumeChange(Math.max(0, volume - 0.1));
          } else {
            handleVolumeChange(Math.min(1, volume + 0.1));
          }
        }
      }
    },
    [
      deviceInfo,
      isPlaying,
      handlePause,
      handlePlay,
      handleFullscreenToggle,
      handleSeek,
      currentTime,
      duration,
      handleVolumeChange,
      volume,
      videoRef
    ]
  );

  const handleMouseEvents = useCallback(
    (event) => {
      if (deviceInfo.deviceType === 'mobile' || deviceInfo.deviceType === 'tablet') {
        return;
      }

      switch (event.type) {
        case 'mouseenter':
          setShowControls(true);
          break;
        case 'mouseleave':
          clearTimeout(hideControlsTimeoutRef.current);
          hideControlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
          }, 3000);
          break;
        case 'mousemove':
          setShowControls(true);
          clearTimeout(hideControlsTimeoutRef.current);
          hideControlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
          }, 3000);
          break;
      }
    },
    [deviceInfo, hideControlsTimeoutRef, setShowControls]
  );

  return {
    handleControlsVisibility,
    handleKeyboardShortcuts,
    handleTouchGestures,
    handleMouseEvents
  };
};

export default usePlayerInteractions;
