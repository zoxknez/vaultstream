/**
 * 📊 STREAMVAULT ANALYTICS UTILITIES
 * Advanced analytics and user behavior tracking
 */

import { logger } from './logger';

class Analytics {
  constructor() {
    this.isInitialized = false;
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    this.events = [];
    this.metrics = {
      pageViews: 0,
      videoPlays: 0,
      videoCompletions: 0,
      userInteractions: 0,
      errors: 0,
      performance: {
        loadTime: 0,
        renderTime: 0,
        memoryUsage: 0
      }
    };
    
    this.init();
  }

  /**
   * Initialize analytics
   */
  init() {
    if (this.isInitialized) return;
    
    this.setupPageTracking();
    this.setupVideoTracking();
    this.setupUserInteractionTracking();
    this.setupPerformanceTracking();
    this.setupErrorTracking();
    this.setupCustomEvents();
    
    this.isInitialized = true;
    logger.info('Analytics initialized');
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    const existing = sessionStorage.getItem('analytics_session_id');
    if (existing) return existing;
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
    return sessionId;
  }

  /**
   * Get or create user ID
   */
  getUserId() {
    const existing = localStorage.getItem('analytics_user_id');
    if (existing) return existing;
    
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('analytics_user_id', userId);
    return userId;
  }

  /**
   * Setup page tracking
   */
  setupPageTracking() {
    // Track page views
    this.trackPageView(window.location.pathname);
    
    // Track route changes (for SPA)
    let currentPath = window.location.pathname;
    
    const trackRouteChange = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        this.trackPageView(newPath);
        currentPath = newPath;
      }
    };
    
    // Listen for popstate events
    window.addEventListener('popstate', trackRouteChange);
    
    // Override pushState and replaceState for SPA routing
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(trackRouteChange, 0);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(trackRouteChange, 0);
    };
  }

  /**
   * Track page view
   */
  trackPageView(path) {
    this.metrics.pageViews++;
    
    const event = {
      type: 'page_view',
      path,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    this.events.push(event);
    this.sendEvent(event);
    
    logger.info('Page view tracked:', path);
  }

  /**
   * Setup video tracking
   */
  setupVideoTracking() {
    // Track video plays
    document.addEventListener('video_play', (event) => {
      this.trackVideoPlay(event.detail);
    });
    
    // Track video pauses
    document.addEventListener('video_pause', (event) => {
      this.trackVideoPause(event.detail);
    });
    
    // Track video completions
    document.addEventListener('video_complete', (event) => {
      this.trackVideoComplete(event.detail);
    });
    
    // Track video seeks
    document.addEventListener('video_seek', (event) => {
      this.trackVideoSeek(event.detail);
    });
    
    // Track video errors
    document.addEventListener('video_error', (event) => {
      this.trackVideoError(event.detail);
    });
  }

  /**
   * Track video play
   */
  trackVideoPlay(details) {
    this.metrics.videoPlays++;
    
    const event = {
      type: 'video_play',
      videoId: details.videoId,
      title: details.title,
      duration: details.duration,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };
    
    this.events.push(event);
    this.sendEvent(event);
    
    logger.info('Video play tracked:', details.title);
  }

  /**
   * Track video pause
   */
  trackVideoPause(details) {
    const event = {
      type: 'video_pause',
      videoId: details.videoId,
      title: details.title,
      currentTime: details.currentTime,
      duration: details.duration,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };
    
    this.events.push(event);
    this.sendEvent(event);
    
    logger.info('Video pause tracked:', details.title);
  }

  /**
   * Track video completion
   */
  trackVideoComplete(details) {
    this.metrics.videoCompletions++;
    
    const event = {
      type: 'video_complete',
      videoId: details.videoId,
      title: details.title,
      duration: details.duration,
      completionRate: 100,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };
    
    this.events.push(event);
    this.sendEvent(event);
    
    logger.info('Video completion tracked:', details.title);
  }

  /**
   * Track video seek
   */
  trackVideoSeek(details) {
    const event = {
      type: 'video_seek',
      videoId: details.videoId,
      title: details.title,
      fromTime: details.fromTime,
      toTime: details.toTime,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };
    
    this.events.push(event);
    this.sendEvent(event);
    
    logger.info('Video seek tracked:', details.title);
  }

  /**
   * Track video error
   */
  trackVideoError(details) {
    this.metrics.errors++;
    
    const event = {
      type: 'video_error',
      videoId: details.videoId,
      title: details.title,
      error: details.error,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };
    
    this.events.push(event);
    this.sendEvent(event);
    
    logger.error('Video error tracked:', details.error);
  }

  /**
   * Setup user interaction tracking
   */
  setupUserInteractionTracking() {
    // Track clicks
    document.addEventListener('click', (event) => {
      this.trackUserInteraction('click', event.target);
    });
    
    // Track scrolls
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.trackUserInteraction('scroll', document.body);
      }, 100);
    });
    
    // Track keyboard events
    document.addEventListener('keydown', (event) => {
      this.trackUserInteraction('keydown', event.target, {
        key: event.key,
        code: event.code
      });
    });
    
    // Track form submissions
    document.addEventListener('submit', (event) => {
      this.trackUserInteraction('form_submit', event.target);
    });
  }

  /**
   * Track user interaction
   */
  trackUserInteraction(type, element, details = {}) {
    this.metrics.userInteractions++;
    
    const event = {
      type: 'user_interaction',
      interactionType: type,
      element: this.getElementInfo(element),
      details,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };
    
    this.events.push(event);
    this.sendEvent(event);
  }

  /**
   * Get element information
   */
  getElementInfo(element) {
    if (!element) return null;
    
    return {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      textContent: element.textContent?.substring(0, 100),
      href: element.href,
      src: element.src
    };
  }

  /**
   * Setup performance tracking
   */
  setupPerformanceTracking() {
    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.trackPerformance();
      }, 1000);
    });
    
    // Track performance metrics periodically
    setInterval(() => {
      this.trackPerformance();
    }, 30000); // Every 30 seconds
  }

  /**
   * Track performance metrics
   */
  trackPerformance() {
    const performance = window.performance;
    if (!performance) return;
    
    const navigation = performance.getEntriesByType('navigation')[0];
    const memory = performance.memory;
    
    const metrics = {
      loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
      firstPaint: this.getFirstPaint(),
      firstContentfulPaint: this.getFirstContentfulPaint(),
      memoryUsage: memory ? memory.usedJSHeapSize : 0,
      memoryLimit: memory ? memory.jsHeapSizeLimit : 0
    };
    
    this.metrics.performance = metrics;
    
    const event = {
      type: 'performance',
      metrics,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };
    
    this.events.push(event);
    this.sendEvent(event);
  }

  /**
   * Get first paint time
   */
  getFirstPaint() {
    const entries = performance.getEntriesByType('paint');
    const firstPaint = entries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  /**
   * Get first contentful paint time
   */
  getFirstContentfulPaint() {
    const entries = performance.getEntriesByType('paint');
    const firstContentfulPaint = entries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint ? firstContentfulPaint.startTime : 0;
  }

  /**
   * Setup error tracking
   */
  setupErrorTracking() {
    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
    
    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('unhandled_rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  /**
   * Track error
   */
  trackError(type, details) {
    this.metrics.errors++;
    
    const event = {
      type: 'error',
      errorType: type,
      details,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };
    
    this.events.push(event);
    this.sendEvent(event);
    
    logger.error('Error tracked:', type, details);
  }

  /**
   * Setup custom events
   */
  setupCustomEvents() {
    // Track search events
    document.addEventListener('search', (event) => {
      this.trackCustomEvent('search', event.detail);
    });
    
    // Track download events
    document.addEventListener('download', (event) => {
      this.trackCustomEvent('download', event.detail);
    });
    
    // Track share events
    document.addEventListener('share', (event) => {
      this.trackCustomEvent('share', event.detail);
    });
  }

  /**
   * Track custom event
   */
  trackCustomEvent(eventName, details) {
    const event = {
      type: 'custom_event',
      eventName,
      details,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };
    
    this.events.push(event);
    this.sendEvent(event);
    
    logger.info('Custom event tracked:', eventName, details);
  }

  /**
   * Send event to analytics service
   */
  async sendEvent(event) {
    try {
      // Send to Google Analytics if available
      if (window.gtag) {
        window.gtag('event', event.type, {
          event_category: 'StreamVault',
          event_label: event.path || event.videoId || event.eventName,
          value: 1
        });
      }
      
      // Send to custom analytics endpoint
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      logger.error('Analytics event send failed:', error);
    }
  }

  /**
   * Get analytics summary
   */
  getSummary() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      metrics: this.metrics,
      eventCount: this.events.length,
      sessionDuration: Date.now() - parseInt(this.sessionId.split('_')[1]),
      isOnline: navigator.onLine,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language
    };
  }

  /**
   * Export analytics data
   */
  exportData() {
    return {
      summary: this.getSummary(),
      events: this.events,
      timestamp: Date.now()
    };
  }

  /**
   * Clear analytics data
   */
  clearData() {
    this.events = [];
    this.metrics = {
      pageViews: 0,
      videoPlays: 0,
      videoCompletions: 0,
      userInteractions: 0,
      errors: 0,
      performance: {
        loadTime: 0,
        renderTime: 0,
        memoryUsage: 0
      }
    };
  }
}

// Create global instance
const analytics = new Analytics();

// Make available globally
window.analytics = analytics;

export default analytics;