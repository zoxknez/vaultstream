/**
 * 📱 STREAMVAULT DEVICE OPTIMIZATION HOOK
 * React hook for device-specific optimizations
 */

import { useCallback, useEffect, useState } from 'react';
import deviceDetection from '../utils/deviceDetection';
import { logger } from '../utils/logger';

/**
 * Device optimization hook
 */
export const useDeviceOptimization = () => {
  const [deviceInfo, setDeviceInfo] = useState(deviceDetection.getDeviceInfo());
  const [optimalSettings, setOptimalSettings] = useState(deviceDetection.getOptimalSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Update device info on orientation change
   */
  useEffect(() => {
    const handleOrientationChange = () => {
      const newDeviceInfo = deviceDetection.getDeviceInfo();
      setDeviceInfo(newDeviceInfo);
      setOptimalSettings(deviceDetection.getOptimalSettings());
      
      logger.info('Device orientation changed', {
        orientation: newDeviceInfo.orientation,
        viewport: newDeviceInfo.viewport
      });
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  /**
   * Update device info on visibility change
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const newDeviceInfo = deviceDetection.getDeviceInfo();
        setDeviceInfo(newDeviceInfo);
        setOptimalSettings(deviceDetection.getOptimalSettings());
        
        logger.info('Device visibility changed', {
          visibilityState: document.visibilityState,
          deviceInfo: newDeviceInfo
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  /**
   * Update device info on connection change
   */
  useEffect(() => {
    const handleConnectionChange = () => {
      if (navigator.connection) {
        const newDeviceInfo = deviceDetection.getDeviceInfo();
        setDeviceInfo(newDeviceInfo);
        setOptimalSettings(deviceDetection.getOptimalSettings());
        
        logger.info('Device connection changed', {
          connection: navigator.connection,
          deviceInfo: newDeviceInfo
        });
      }
    };

    if (navigator.connection) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  /**
   * Update device info on battery change
   */
  useEffect(() => {
    const handleBatteryChange = async () => {
      if (navigator.getBattery) {
        try {
          const battery = await navigator.getBattery();
          const newDeviceInfo = deviceDetection.getDeviceInfo();
          setDeviceInfo(newDeviceInfo);
          setOptimalSettings(deviceDetection.getOptimalSettings());
          
          logger.info('Device battery changed', {
            battery: {
              level: battery.level,
              charging: battery.charging,
              chargingTime: battery.chargingTime,
              dischargingTime: battery.dischargingTime
            },
            deviceInfo: newDeviceInfo
          });
        } catch (error) {
          logger.warn('Failed to get battery info:', error);
        }
      }
    };

    if (navigator.getBattery) {
      navigator.getBattery().then(battery => {
        battery.addEventListener('levelchange', handleBatteryChange);
        battery.addEventListener('chargingchange', handleBatteryChange);
        battery.addEventListener('chargingtimechange', handleBatteryChange);
        battery.addEventListener('dischargingtimechange', handleBatteryChange);
      });
    }

    return () => {
      if (navigator.getBattery) {
        navigator.getBattery().then(battery => {
          battery.removeEventListener('levelchange', handleBatteryChange);
          battery.removeEventListener('chargingchange', handleBatteryChange);
          battery.removeEventListener('chargingtimechange', handleBatteryChange);
          battery.removeEventListener('dischargingtimechange', handleBatteryChange);
        });
      }
    };
  }, []);

  /**
   * Update device info on memory change
   */
  useEffect(() => {
    const handleMemoryChange = () => {
      if (performance.memory) {
        const newDeviceInfo = deviceDetection.getDeviceInfo();
        setDeviceInfo(newDeviceInfo);
        setOptimalSettings(deviceDetection.getOptimalSettings());
        
        logger.info('Device memory changed', {
          memory: performance.memory,
          deviceInfo: newDeviceInfo
        });
      }
    };

    if (performance.memory) {
      const interval = setInterval(handleMemoryChange, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  /**
   * Update device info on storage change
   */
  useEffect(() => {
    const handleStorageChange = () => {
      const newDeviceInfo = deviceDetection.getDeviceInfo();
      setDeviceInfo(newDeviceInfo);
      setOptimalSettings(deviceDetection.getOptimalSettings());
      
      logger.info('Device storage changed', {
        storage: {
          localStorage: localStorage.length,
          sessionStorage: sessionStorage.length
        },
        deviceInfo: newDeviceInfo
      });
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  /**
   * Update device info on theme change
   */
  useEffect(() => {
    const handleThemeChange = () => {
      const newDeviceInfo = deviceDetection.getDeviceInfo();
      setDeviceInfo(newDeviceInfo);
      setOptimalSettings(deviceDetection.getOptimalSettings());
      
      logger.info('Device theme changed', {
        theme: newDeviceInfo.capabilities.colorScheme,
        deviceInfo: newDeviceInfo
      });
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);

  /**
   * Update device info on motion preference change
   */
  useEffect(() => {
    const handleMotionChange = () => {
      const newDeviceInfo = deviceDetection.getDeviceInfo();
      setDeviceInfo(newDeviceInfo);
      setOptimalSettings(deviceDetection.getOptimalSettings());
      
      logger.info('Device motion preference changed', {
        reducedMotion: newDeviceInfo.capabilities.reducedMotion,
        deviceInfo: newDeviceInfo
      });
    };

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', handleMotionChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  /**
   * Update device info on contrast preference change
   */
  useEffect(() => {
    const handleContrastChange = () => {
      const newDeviceInfo = deviceDetection.getDeviceInfo();
      setDeviceInfo(newDeviceInfo);
      setOptimalSettings(deviceDetection.getOptimalSettings());
      
      logger.info('Device contrast preference changed', {
        highContrast: newDeviceInfo.capabilities.highContrast,
        deviceInfo: newDeviceInfo
      });
    };

    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    mediaQuery.addEventListener('change', handleContrastChange);

    return () => {
      mediaQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  /**
   * Refresh device info
   */
  const refreshDeviceInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const newDeviceInfo = deviceDetection.getDeviceInfo();
      const newOptimalSettings = deviceDetection.getOptimalSettings();
      
      setDeviceInfo(newDeviceInfo);
      setOptimalSettings(newOptimalSettings);
      
      logger.info('Device info refreshed', {
        deviceInfo: newDeviceInfo,
        optimalSettings: newOptimalSettings
      });
    } catch (error) {
      setError(error);
      logger.error('Failed to refresh device info:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get device-specific CSS classes
   */
  const getDeviceClasses = useCallback(() => {
    const classes = [];
    
    if (deviceInfo.deviceType) {
      classes.push(`device-${deviceInfo.deviceType}`);
    }
    
    if (deviceInfo.orientation) {
      classes.push(`orientation-${deviceInfo.orientation}`);
    }
    
    if (deviceInfo.touch) {
      classes.push('touch-enabled');
    }
    
    if (deviceInfo.capabilities.reducedMotion) {
      classes.push('reduced-motion');
    }
    
    if (deviceInfo.capabilities.highContrast) {
      classes.push('high-contrast');
    }
    
    if (deviceInfo.capabilities.colorScheme) {
      classes.push(`color-scheme-${deviceInfo.capabilities.colorScheme}`);
    }
    
    return classes.join(' ');
  }, [deviceInfo]);

  /**
   * Get device-specific styles
   */
  const getDeviceStyles = useCallback(() => {
    const styles = {};
    
    if (deviceInfo.deviceType === 'mobile') {
      styles.fontSize = optimalSettings.ui.fontSize;
      styles.touchAction = 'manipulation';
      styles.userSelect = 'none';
    }
    
    if (deviceInfo.orientation === 'landscape') {
      styles.width = '100vw';
      styles.height = '100vh';
    }
    
    if (deviceInfo.capabilities.reducedMotion) {
      styles.animationDuration = '0.01ms';
      styles.animationIterationCount = '1';
      styles.transitionDuration = '0.01ms';
    }
    
    if (deviceInfo.capabilities.highContrast) {
      styles.filter = 'contrast(1.5)';
    }
    
    return styles;
  }, [deviceInfo, optimalSettings]);

  /**
   * Get device-specific media queries
   */
  const getDeviceMediaQueries = useCallback(() => {
    const queries = [];
    
    if (deviceInfo.deviceType === 'mobile') {
      queries.push('(max-width: 768px)');
    } else if (deviceInfo.deviceType === 'tablet') {
      queries.push('(min-width: 769px) and (max-width: 1024px)');
    } else if (deviceInfo.deviceType === 'desktop') {
      queries.push('(min-width: 1025px)');
    }
    
    if (deviceInfo.orientation === 'landscape') {
      queries.push('(orientation: landscape)');
    } else if (deviceInfo.orientation === 'portrait') {
      queries.push('(orientation: portrait)');
    }
    
    if (deviceInfo.capabilities.reducedMotion) {
      queries.push('(prefers-reduced-motion: reduce)');
    }
    
    if (deviceInfo.capabilities.highContrast) {
      queries.push('(prefers-contrast: high)');
    }
    
    if (deviceInfo.capabilities.colorScheme === 'dark') {
      queries.push('(prefers-color-scheme: dark)');
    } else if (deviceInfo.capabilities.colorScheme === 'light') {
      queries.push('(prefers-color-scheme: light)');
    }
    
    return queries;
  }, [deviceInfo]);

  /**
   * Get device-specific configuration
   */
  const getDeviceConfig = useCallback(() => {
    return {
      device: deviceInfo,
      settings: optimalSettings,
      classes: getDeviceClasses(),
      styles: getDeviceStyles(),
      mediaQueries: getDeviceMediaQueries()
    };
  }, [deviceInfo, optimalSettings, getDeviceClasses, getDeviceStyles, getDeviceMediaQueries]);

  /**
   * Check if device supports feature
   */
  const supportsFeature = useCallback((feature) => {
    return deviceInfo.capabilities[feature] || false;
  }, [deviceInfo.capabilities]);

  /**
   * Check if device is compatible
   */
  const isCompatible = useCallback(() => {
    const requiredFeatures = [
      'localStorage',
      'sessionStorage',
      'indexedDB',
      'serviceWorker',
      'pushNotifications'
    ];
    
    return requiredFeatures.every(feature => supportsFeature(feature));
  }, [supportsFeature]);

  /**
   * Get device recommendations
   */
  const getRecommendations = useCallback(() => {
    const recommendations = [];
    
    if (!supportsFeature('webgl')) {
      recommendations.push('WebGL is not supported. Some features may not work properly.');
    }
    
    if (!supportsFeature('webp')) {
      recommendations.push('WebP is not supported. Images may load slower.');
    }
    
    if (!supportsFeature('avif')) {
      recommendations.push('AVIF is not supported. Images may load slower.');
    }
    
    if (!supportsFeature('hevc')) {
      recommendations.push('HEVC is not supported. Video quality may be limited.');
    }
    
    if (!supportsFeature('hdr')) {
      recommendations.push('HDR is not supported. Video quality may be limited.');
    }
    
    if (!supportsFeature('pwa')) {
      recommendations.push('PWA is not supported. Some features may not work offline.');
    }
    
    if (!supportsFeature('serviceWorker')) {
      recommendations.push('Service Worker is not supported. Some features may not work offline.');
    }
    
    if (!supportsFeature('pushNotifications')) {
      recommendations.push('Push Notifications are not supported. You may not receive notifications.');
    }
    
    if (!supportsFeature('camera')) {
      recommendations.push('Camera is not supported. Some features may not work.');
    }
    
    if (!supportsFeature('microphone')) {
      recommendations.push('Microphone is not supported. Some features may not work.');
    }
    
    if (!supportsFeature('geolocation')) {
      recommendations.push('Geolocation is not supported. Some features may not work.');
    }
    
    if (!supportsFeature('vibration')) {
      recommendations.push('Vibration is not supported. Some features may not work.');
    }
    
    if (!supportsFeature('bluetooth')) {
      recommendations.push('Bluetooth is not supported. Some features may not work.');
    }
    
    if (!supportsFeature('usb')) {
      recommendations.push('USB is not supported. Some features may not work.');
    }
    
    if (!supportsFeature('nfc')) {
      recommendations.push('NFC is not supported. Some features may not work.');
    }
    
    if (!supportsFeature('battery')) {
      recommendations.push('Battery API is not supported. Some features may not work.');
    }
    
    if (!supportsFeature('connection')) {
      recommendations.push('Connection API is not supported. Some features may not work.');
    }
    
    if (!supportsFeature('memory')) {
      recommendations.push('Memory API is not supported. Some features may not work.');
    }
    
    if (!supportsFeature('storage')) {
      recommendations.push('Storage API is not supported. Some features may not work.');
    }
    
    return recommendations;
  }, [supportsFeature]);

  /**
   * Get device warnings
   */
  const getWarnings = useCallback(() => {
    const warnings = [];
    
    if (deviceInfo.deviceType === 'mobile' && deviceInfo.viewport.width < 320) {
      warnings.push('Screen width is very small. Some features may not work properly.');
    }
    
    if (deviceInfo.deviceType === 'mobile' && deviceInfo.viewport.height < 480) {
      warnings.push('Screen height is very small. Some features may not work properly.');
    }
    
    if (deviceInfo.deviceType === 'tablet' && deviceInfo.viewport.width < 768) {
      warnings.push('Screen width is small for tablet. Some features may not work properly.');
    }
    
    if (deviceInfo.deviceType === 'tablet' && deviceInfo.viewport.height < 1024) {
      warnings.push('Screen height is small for tablet. Some features may not work properly.');
    }
    
    if (deviceInfo.deviceType === 'desktop' && deviceInfo.viewport.width < 1024) {
      warnings.push('Screen width is small for desktop. Some features may not work properly.');
    }
    
    if (deviceInfo.deviceType === 'desktop' && deviceInfo.viewport.height < 768) {
      warnings.push('Screen height is small for desktop. Some features may not work properly.');
    }
    
    if (deviceInfo.capabilities.reducedMotion) {
      warnings.push('Reduced motion is enabled. Some animations may be disabled.');
    }
    
    if (deviceInfo.capabilities.highContrast) {
      warnings.push('High contrast is enabled. Some colors may be adjusted.');
    }
    
    if (deviceInfo.capabilities.colorScheme === 'dark') {
      warnings.push('Dark mode is enabled. Some colors may be adjusted.');
    }
    
    if (deviceInfo.capabilities.colorScheme === 'light') {
      warnings.push('Light mode is enabled. Some colors may be adjusted.');
    }
    
    return warnings;
  }, [deviceInfo]);

  /**
   * Get device errors
   */
  const getErrors = useCallback(() => {
    const errors = [];
    
    if (!supportsFeature('localStorage')) {
      errors.push('Local Storage is not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('sessionStorage')) {
      errors.push('Session Storage is not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('indexedDB')) {
      errors.push('IndexedDB is not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('serviceWorker')) {
      errors.push('Service Worker is not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('pushNotifications')) {
      errors.push('Push Notifications are not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('camera')) {
      errors.push('Camera is not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('microphone')) {
      errors.push('Microphone is not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('geolocation')) {
      errors.push('Geolocation is not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('vibration')) {
      errors.push('Vibration is not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('bluetooth')) {
      errors.push('Bluetooth is not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('usb')) {
      errors.push('USB is not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('nfc')) {
      errors.push('NFC is not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('battery')) {
      errors.push('Battery API is not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('connection')) {
      errors.push('Connection API is not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('memory')) {
      errors.push('Memory API is not supported. The app may not work properly.');
    }
    
    if (!supportsFeature('storage')) {
      errors.push('Storage API is not supported. The app may not work properly.');
    }
    
    return errors;
  }, [supportsFeature]);

  /**
   * Get device status
   */
  const getDeviceStatus = useCallback(() => {
    const status = {
      compatible: isCompatible(),
      recommendations: getRecommendations(),
      warnings: getWarnings(),
      errors: getErrors()
    };
    
    if (status.errors.length > 0) {
      status.level = 'error';
    } else if (status.warnings.length > 0) {
      status.level = 'warning';
    } else if (status.recommendations.length > 0) {
      status.level = 'info';
    } else {
      status.level = 'success';
    }
    
    return status;
  }, [isCompatible, getRecommendations, getWarnings, getErrors]);

  /**
   * Get device summary
   */
  const getDeviceSummary = useCallback(() => {
    return {
      info: deviceInfo,
      settings: optimalSettings,
      config: getDeviceConfig(),
      status: getDeviceStatus(),
      classes: getDeviceClasses(),
      styles: getDeviceStyles(),
      mediaQueries: getDeviceMediaQueries()
    };
  }, [
    deviceInfo,
    optimalSettings,
    getDeviceConfig,
    getDeviceStatus,
    getDeviceClasses,
    getDeviceStyles,
    getDeviceMediaQueries
  ]);

  return {
    deviceInfo,
    optimalSettings,
    isLoading,
    error,
    refreshDeviceInfo,
    getDeviceClasses,
    getDeviceStyles,
    getDeviceMediaQueries,
    getDeviceConfig,
    supportsFeature,
    isCompatible,
    getRecommendations,
    getWarnings,
    getErrors,
    getDeviceStatus,
    getDeviceSummary
  };
};

export default useDeviceOptimization;
