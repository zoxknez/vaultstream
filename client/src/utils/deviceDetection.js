/**
 * 📱 STREAMVAULT DEVICE DETECTION
 * Advanced device and platform detection for optimal UX
 */

class DeviceDetection {
  constructor() {
    this.userAgent = navigator.userAgent;
    this.platform = navigator.platform;
    this.screen = {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth
    };
    this.viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    this.touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.orientation = this.getOrientation();
    this.deviceType = this.getDeviceType();
    this.browser = this.getBrowser();
    this.os = this.getOS();
    this.capabilities = this.getCapabilities();
  }

  /**
   * Get device type
   */
  getDeviceType() {
    const width = this.viewport.width;
    const height = this.viewport.height;
    const minDimension = Math.min(width, height);

    // Mobile detection
    if (minDimension <= 768 || this.touch) {
      if (minDimension <= 480) {
        return 'mobile-small';
      } else if (minDimension <= 768) {
        return 'mobile-large';
      }
    }

    // Tablet detection
    if (minDimension > 768 && minDimension <= 1024) {
      return 'tablet';
    }

    // Desktop detection
    if (minDimension > 1024) {
      return 'desktop';
    }

    return 'unknown';
  }

  /**
   * Get browser information
   */
  getBrowser() {
    const ua = this.userAgent;

    if (ua.includes('Chrome') && !ua.includes('Edge')) {
      return {
        name: 'Chrome',
        version: this.extractVersion(ua, 'Chrome/'),
        isChrome: true
      };
    }

    if (ua.includes('Firefox')) {
      return {
        name: 'Firefox',
        version: this.extractVersion(ua, 'Firefox/'),
        isFirefox: true
      };
    }

    if (ua.includes('Safari') && !ua.includes('Chrome')) {
      return {
        name: 'Safari',
        version: this.extractVersion(ua, 'Version/'),
        isSafari: true
      };
    }

    if (ua.includes('Edge')) {
      return {
        name: 'Edge',
        version: this.extractVersion(ua, 'Edge/'),
        isEdge: true
      };
    }

    if (ua.includes('Opera')) {
      return {
        name: 'Opera',
        version: this.extractVersion(ua, 'Opera/'),
        isOpera: true
      };
    }

    return {
      name: 'Unknown',
      version: 'Unknown',
      isUnknown: true
    };
  }

  /**
   * Get operating system
   */
  getOS() {
    const ua = this.userAgent;

    if (ua.includes('Windows')) {
      return {
        name: 'Windows',
        version: this.extractVersion(ua, 'Windows NT '),
        isWindows: true
      };
    }

    if (ua.includes('Mac OS X')) {
      return {
        name: 'macOS',
        version: this.extractVersion(ua, 'Mac OS X '),
        isMacOS: true
      };
    }

    if (ua.includes('Linux')) {
      return {
        name: 'Linux',
        version: 'Unknown',
        isLinux: true
      };
    }

    if (ua.includes('Android')) {
      return {
        name: 'Android',
        version: this.extractVersion(ua, 'Android '),
        isAndroid: true
      };
    }

    if (ua.includes('iPhone') || ua.includes('iPad')) {
      return {
        name: 'iOS',
        version: this.extractVersion(ua, 'OS '),
        isIOS: true
      };
    }

    return {
      name: 'Unknown',
      version: 'Unknown',
      isUnknown: true
    };
  }

  /**
   * Get device orientation
   */
  getOrientation() {
    if (this.viewport.width > this.viewport.height) {
      return 'landscape';
    } else {
      return 'portrait';
    }
  }

  /**
   * Get device capabilities
   */
  getCapabilities() {
    return {
      touch: this.touch,
      webgl: this.hasWebGL(),
      webgl2: this.hasWebGL2(),
      webp: this.hasWebP(),
      avif: this.hasAVIF(),
      hevc: this.hasHEVC(),
      hdr: this.hasHDR(),
      pwa: this.hasPWA(),
      serviceWorker: 'serviceWorker' in navigator,
      pushNotifications: 'PushManager' in window,
      geolocation: 'geolocation' in navigator,
      camera: this.hasCamera(),
      microphone: this.hasMicrophone(),
      accelerometer: 'Accelerometer' in window,
      gyroscope: 'Gyroscope' in window,
      magnetometer: 'Magnetometer' in window,
      orientation: 'DeviceOrientationEvent' in window,
      motion: 'DeviceMotionEvent' in window,
      vibration: 'vibrate' in navigator,
      bluetooth: 'bluetooth' in navigator,
      usb: 'usb' in navigator,
      nfc: 'nfc' in navigator,
      battery: 'getBattery' in navigator,
      connection: 'connection' in navigator,
      memory: 'memory' in performance,
      storage: 'storage' in navigator,
      indexedDB: 'indexedDB' in window,
      webSQL: 'openDatabase' in window,
      localStorage: this.hasLocalStorage(),
      sessionStorage: this.hasSessionStorage(),
      cookies: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      language: navigator.language,
      languages: navigator.languages,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      screen: this.screen,
      viewport: this.viewport,
      devicePixelRatio: window.devicePixelRatio,
      colorScheme: this.getColorScheme(),
      reducedMotion: this.getReducedMotion(),
      highContrast: this.getHighContrast()
    };
  }

  /**
   * Check WebGL support
   */
  hasWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  /**
   * Check WebGL2 support
   */
  hasWebGL2() {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch {
      return false;
    }
  }

  /**
   * Check WebP support
   */
  hasWebP() {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src =
        'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  /**
   * Check AVIF support
   */
  hasAVIF() {
    return new Promise((resolve) => {
      const avif = new Image();
      avif.onload = avif.onerror = () => {
        resolve(avif.height === 2);
      };
      avif.src =
        'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABgAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAA';
    });
  }

  /**
   * Check HEVC support
   */
  hasHEVC() {
    const video = document.createElement('video');
    return video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"') !== '';
  }

  /**
   * Check HDR support
   */
  hasHDR() {
    return window.matchMedia('(dynamic-range: high)').matches;
  }

  /**
   * Check PWA support
   */
  hasPWA() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Check camera support
   */
  hasCamera() {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  }

  /**
   * Check microphone support
   */
  hasMicrophone() {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  }

  /**
   * Check localStorage support
   */
  hasLocalStorage() {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check sessionStorage support
   */
  hasSessionStorage() {
    try {
      const test = 'test';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get color scheme preference
   */
  getColorScheme() {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    } else {
      return 'no-preference';
    }
  }

  /**
   * Get reduced motion preference
   */
  getReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Get high contrast preference
   */
  getHighContrast() {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  /**
   * Extract version from user agent
   */
  extractVersion(ua, prefix) {
    const index = ua.indexOf(prefix);
    if (index === -1) return 'Unknown';

    const version = ua.substring(index + prefix.length);
    const endIndex = version.indexOf(' ');
    return endIndex === -1 ? version : version.substring(0, endIndex);
  }

  /**
   * Get device info summary
   */
  getDeviceInfo() {
    return {
      deviceType: this.deviceType,
      browser: this.browser,
      os: this.os,
      orientation: this.orientation,
      capabilities: this.capabilities,
      screen: this.screen,
      viewport: this.viewport,
      touch: this.touch,
      userAgent: this.userAgent,
      platform: this.platform
    };
  }

  /**
   * Check if device is mobile
   */
  isMobile() {
    return this.deviceType.startsWith('mobile');
  }

  /**
   * Check if device is tablet
   */
  isTablet() {
    return this.deviceType === 'tablet';
  }

  /**
   * Check if device is desktop
   */
  isDesktop() {
    return this.deviceType === 'desktop';
  }

  /**
   * Check if device is touch-enabled
   */
  isTouch() {
    return this.touch;
  }

  /**
   * Check if device supports high DPI
   */
  isHighDPI() {
    return window.devicePixelRatio > 1;
  }

  /**
   * Check if device is in landscape mode
   */
  isLandscape() {
    return this.orientation === 'landscape';
  }

  /**
   * Check if device is in portrait mode
   */
  isPortrait() {
    return this.orientation === 'portrait';
  }

  /**
   * Get optimal video quality for device
   */
  getOptimalVideoQuality() {
    if (this.isMobile()) {
      return this.viewport.width <= 480 ? '480p' : '720p';
    } else if (this.isTablet()) {
      return '1080p';
    } else {
      return '4K';
    }
  }

  /**
   * Get optimal audio quality for device
   */
  getOptimalAudioQuality() {
    if (this.isMobile()) {
      return '128kbps';
    } else if (this.isTablet()) {
      return '256kbps';
    } else {
      return '320kbps';
    }
  }

  /**
   * Get optimal subtitle size for device
   */
  getOptimalSubtitleSize() {
    if (this.isMobile()) {
      return 'large';
    } else if (this.isTablet()) {
      return 'medium';
    } else {
      return 'small';
    }
  }

  /**
   * Get optimal UI scale for device
   */
  getOptimalUIScale() {
    if (this.isMobile()) {
      return 1.2;
    } else if (this.isTablet()) {
      return 1.1;
    } else {
      return 1.0;
    }
  }

  /**
   * Get optimal font size for device
   */
  getOptimalFontSize() {
    if (this.isMobile()) {
      return '16px';
    } else if (this.isTablet()) {
      return '14px';
    } else {
      return '12px';
    }
  }

  /**
   * Get optimal touch target size
   */
  getOptimalTouchTargetSize() {
    if (this.isMobile()) {
      return '44px';
    } else if (this.isTablet()) {
      return '40px';
    } else {
      return '36px';
    }
  }

  /**
   * Get optimal gesture sensitivity
   */
  getOptimalGestureSensitivity() {
    if (this.isMobile()) {
      return 'high';
    } else if (this.isTablet()) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get optimal animation duration
   */
  getOptimalAnimationDuration() {
    if (this.isMobile()) {
      return '200ms';
    } else if (this.isTablet()) {
      return '150ms';
    } else {
      return '100ms';
    }
  }

  /**
   * Get optimal debounce delay
   */
  getOptimalDebounceDelay() {
    if (this.isMobile()) {
      return 300;
    } else if (this.isTablet()) {
      return 200;
    } else {
      return 100;
    }
  }

  /**
   * Get optimal throttle delay
   */
  getOptimalThrottleDelay() {
    if (this.isMobile()) {
      return 100;
    } else if (this.isTablet()) {
      return 50;
    } else {
      return 16;
    }
  }

  /**
   * Get optimal memory limit
   */
  getOptimalMemoryLimit() {
    if (this.isMobile()) {
      return 50 * 1024 * 1024; // 50MB
    } else if (this.isTablet()) {
      return 100 * 1024 * 1024; // 100MB
    } else {
      return 200 * 1024 * 1024; // 200MB
    }
  }

  /**
   * Get optimal cache size
   */
  getOptimalCacheSize() {
    if (this.isMobile()) {
      return 10 * 1024 * 1024; // 10MB
    } else if (this.isTablet()) {
      return 25 * 1024 * 1024; // 25MB
    } else {
      return 50 * 1024 * 1024; // 50MB
    }
  }

  /**
   * Get optimal connection timeout
   */
  getOptimalConnectionTimeout() {
    if (this.isMobile()) {
      return 10000; // 10 seconds
    } else if (this.isTablet()) {
      return 8000; // 8 seconds
    } else {
      return 5000; // 5 seconds
    }
  }

  /**
   * Get optimal retry attempts
   */
  getOptimalRetryAttempts() {
    if (this.isMobile()) {
      return 5;
    } else if (this.isTablet()) {
      return 3;
    } else {
      return 2;
    }
  }

  /**
   * Get optimal retry delay
   */
  getOptimalRetryDelay() {
    if (this.isMobile()) {
      return 2000; // 2 seconds
    } else if (this.isTablet()) {
      return 1500; // 1.5 seconds
    } else {
      return 1000; // 1 second
    }
  }

  /**
   * Get optimal batch size
   */
  getOptimalBatchSize() {
    if (this.isMobile()) {
      return 5;
    } else if (this.isTablet()) {
      return 10;
    } else {
      return 20;
    }
  }

  /**
   * Get optimal prefetch count
   */
  getOptimalPrefetchCount() {
    if (this.isMobile()) {
      return 2;
    } else if (this.isTablet()) {
      return 3;
    } else {
      return 5;
    }
  }

  /**
   * Get optimal worker count
   */
  getOptimalWorkerCount() {
    if (this.isMobile()) {
      return 2;
    } else if (this.isTablet()) {
      return 4;
    } else {
      return 8;
    }
  }

  /**
   * Get optimal chunk size
   */
  getOptimalChunkSize() {
    if (this.isMobile()) {
      return 64 * 1024; // 64KB
    } else if (this.isTablet()) {
      return 128 * 1024; // 128KB
    } else {
      return 256 * 1024; // 256KB
    }
  }

  /**
   * Get optimal buffer size
   */
  getOptimalBufferSize() {
    if (this.isMobile()) {
      return 1024 * 1024; // 1MB
    } else if (this.isTablet()) {
      return 2 * 1024 * 1024; // 2MB
    } else {
      return 4 * 1024 * 1024; // 4MB
    }
  }

  /**
   * Get optimal frame rate
   */
  getOptimalFrameRate() {
    if (this.isMobile()) {
      return 30;
    } else if (this.isTablet()) {
      return 45;
    } else {
      return 60;
    }
  }

  /**
   * Get optimal bitrate
   */
  getOptimalBitrate() {
    if (this.isMobile()) {
      return 1000000; // 1Mbps
    } else if (this.isTablet()) {
      return 2000000; // 2Mbps
    } else {
      return 4000000; // 4Mbps
    }
  }

  /**
   * Get optimal resolution
   */
  getOptimalResolution() {
    if (this.isMobile()) {
      return { width: 854, height: 480 };
    } else if (this.isTablet()) {
      return { width: 1280, height: 720 };
    } else {
      return { width: 1920, height: 1080 };
    }
  }

  /**
   * Get optimal aspect ratio
   */
  getOptimalAspectRatio() {
    if (this.isMobile()) {
      return 16 / 9;
    } else if (this.isTablet()) {
      return 16 / 9;
    } else {
      return 16 / 9;
    }
  }

  /**
   * Get optimal codec
   */
  getOptimalCodec() {
    if (this.isMobile()) {
      return 'h264';
    } else if (this.isTablet()) {
      return 'h264';
    } else {
      return 'h265';
    }
  }

  /**
   * Get optimal container
   */
  getOptimalContainer() {
    if (this.isMobile()) {
      return 'mp4';
    } else if (this.isTablet()) {
      return 'mp4';
    } else {
      return 'mkv';
    }
  }

  /**
   * Get optimal protocol
   */
  getOptimalProtocol() {
    if (this.isMobile()) {
      return 'https';
    } else if (this.isTablet()) {
      return 'https';
    } else {
      return 'https';
    }
  }

  /**
   * Get optimal transport
   */
  getOptimalTransport() {
    if (this.isMobile()) {
      return 'websocket';
    } else if (this.isTablet()) {
      return 'websocket';
    } else {
      return 'websocket';
    }
  }

  /**
   * Get optimal encryption
   */
  getOptimalEncryption() {
    if (this.isMobile()) {
      return 'aes-256-gcm';
    } else if (this.isTablet()) {
      return 'aes-256-gcm';
    } else {
      return 'aes-256-gcm';
    }
  }

  /**
   * Get optimal compression
   */
  getOptimalCompression() {
    if (this.isMobile()) {
      return 'gzip';
    } else if (this.isTablet()) {
      return 'brotli';
    } else {
      return 'brotli';
    }
  }

  /**
   * Get optimal format
   */
  getOptimalFormat() {
    if (this.isMobile()) {
      return 'mp4';
    } else if (this.isTablet()) {
      return 'mp4';
    } else {
      return 'mkv';
    }
  }

  /**
   * Get optimal quality
   */
  getOptimalQuality() {
    if (this.isMobile()) {
      return 'medium';
    } else if (this.isTablet()) {
      return 'high';
    } else {
      return 'ultra';
    }
  }

  /**
   * Get optimal performance
   */
  getOptimalPerformance() {
    if (this.isMobile()) {
      return 'balanced';
    } else if (this.isTablet()) {
      return 'high';
    } else {
      return 'ultra';
    }
  }

  /**
   * Get optimal settings
   */
  getOptimalSettings() {
    return {
      video: {
        quality: this.getOptimalVideoQuality(),
        resolution: this.getOptimalResolution(),
        aspectRatio: this.getOptimalAspectRatio(),
        frameRate: this.getOptimalFrameRate(),
        bitrate: this.getOptimalBitrate(),
        codec: this.getOptimalCodec(),
        container: this.getOptimalContainer(),
        format: this.getOptimalFormat()
      },
      audio: {
        quality: this.getOptimalAudioQuality(),
        bitrate: this.getOptimalAudioQuality(),
        codec: 'aac',
        container: 'mp4',
        format: 'mp4'
      },
      ui: {
        scale: this.getOptimalUIScale(),
        fontSize: this.getOptimalFontSize(),
        touchTargetSize: this.getOptimalTouchTargetSize(),
        subtitleSize: this.getOptimalSubtitleSize(),
        animationDuration: this.getOptimalAnimationDuration(),
        gestureSensitivity: this.getOptimalGestureSensitivity()
      },
      performance: {
        memoryLimit: this.getOptimalMemoryLimit(),
        cacheSize: this.getOptimalCacheSize(),
        connectionTimeout: this.getOptimalConnectionTimeout(),
        retryAttempts: this.getOptimalRetryAttempts(),
        retryDelay: this.getOptimalRetryDelay(),
        batchSize: this.getOptimalBatchSize(),
        prefetchCount: this.getOptimalPrefetchCount(),
        workerCount: this.getOptimalWorkerCount(),
        chunkSize: this.getOptimalChunkSize(),
        bufferSize: this.getOptimalBufferSize(),
        debounceDelay: this.getOptimalDebounceDelay(),
        throttleDelay: this.getOptimalThrottleDelay()
      },
      network: {
        protocol: this.getOptimalProtocol(),
        transport: this.getOptimalTransport(),
        encryption: this.getOptimalEncryption(),
        compression: this.getOptimalCompression()
      },
      quality: {
        level: this.getOptimalQuality(),
        performance: this.getOptimalPerformance()
      }
    };
  }
}

// Create global instance
const deviceDetection = new DeviceDetection();

// Export for use in other modules
export default deviceDetection;
