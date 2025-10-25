import { useEffect, useMemo } from 'react';
import { logger } from '../../utils/logger';

const useDevicePresentation = ({
  videoRef,
  deviceInfo,
  optimalSettings,
  supportsFeature,
  getDeviceStatus,
  getDeviceStyles,
  getDeviceClasses
}) => {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const deviceStatus = getDeviceStatus();

    if (deviceInfo.deviceType === 'mobile') {
      video.controls = false;
      video.playsInline = true;
      video.muted = true;
      video.preload = 'metadata';
    } else if (deviceInfo.deviceType === 'tablet') {
      video.controls = false;
      video.playsInline = true;
      video.preload = 'metadata';
    } else {
      video.controls = false;
      video.preload = 'metadata';
    }

    if (supportsFeature('webgl')) {
      video.style.transform = 'translateZ(0)';
    }

    if (deviceInfo.capabilities.reducedMotion) {
      video.style.transition = 'none';
    }

    if (deviceInfo.capabilities.highContrast) {
      video.style.filter = 'contrast(1.2)';
    }

    logger.info('Video player initialized with device optimizations', {
      deviceType: deviceInfo.deviceType,
      optimalSettings,
      deviceStatus,
      supportsWebGL: supportsFeature('webgl'),
      supportsWebP: supportsFeature('webp'),
      supportsAVIF: supportsFeature('avif'),
      supportsHEVC: supportsFeature('hevc'),
      supportsHDR: supportsFeature('hdr')
    });
  }, [videoRef, deviceInfo, optimalSettings, supportsFeature, getDeviceStatus]);

  const deviceStyles = useMemo(() => getDeviceStyles(), [getDeviceStyles]);
  const deviceClasses = useMemo(() => getDeviceClasses(), [getDeviceClasses]);
  const deviceStatus = useMemo(() => getDeviceStatus(), [getDeviceStatus]);

  return { deviceStyles, deviceClasses, deviceStatus };
};

export default useDevicePresentation;
