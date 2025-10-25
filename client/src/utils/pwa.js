/**
 * 📱 STREAMVAULT PWA UTILITIES
 * Progressive Web App functionality and optimization
 */

import { logger } from './logger';

class PWAUtils {
  constructor() {
    this.isInstalled = false;
    this.deferredPrompt = null;
    this.updateAvailable = false;
    this.serviceWorker = null;

    this.init();
  }

  /**
   * Initialize PWA functionality
   */
  init() {
    this.checkInstallation();
    this.setupInstallPrompt();
    this.setupServiceWorker();
    this.setupUpdateNotifications();
    this.setupOfflineHandling();
  }

  /**
   * Check if app is already installed
   */
  checkInstallation() {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      logger.info('PWA is running in standalone mode');
    }

    // Check if running in fullscreen mode
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      this.isInstalled = true;
      logger.info('PWA is running in fullscreen mode');
    }
  }

  /**
   * Setup install prompt
   */
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();

      // Stash the event so it can be triggered later
      this.deferredPrompt = event;

      logger.info('PWA install prompt is available');

      // Show install button or notification
      this.showInstallPrompt();
    });

    // Handle app installed event
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;

      logger.info('PWA has been installed');

      // Track installation
      this.trackInstallation();
    });
  }

  /**
   * Show install prompt to user
   */
  showInstallPrompt() {
    // Create install notification
    const notification = document.createElement('div');
    notification.className = 'pwa-install-notification';
    notification.innerHTML = `
      <div class="pwa-install-content">
        <div class="pwa-install-icon">📱</div>
        <div class="pwa-install-text">
          <h3>Install StreamVault</h3>
          <p>Get the full app experience with offline support</p>
        </div>
        <div class="pwa-install-actions">
          <button class="pwa-install-button" onclick="window.pwaUtils.install()">
            Install
          </button>
          <button class="pwa-dismiss-button" onclick="window.pwaUtils.dismissInstall()">
            Not now
          </button>
        </div>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: slideUp 0.3s ease-out;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .pwa-install-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .pwa-install-icon {
        font-size: 24px;
      }
      .pwa-install-text h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
      }
      .pwa-install-text p {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
      }
      .pwa-install-actions {
        display: flex;
        gap: 8px;
        margin-left: auto;
      }
      .pwa-install-button, .pwa-dismiss-button {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .pwa-install-button {
        background: white;
        color: #667eea;
      }
      .pwa-install-button:hover {
        background: #f8f9fa;
        transform: translateY(-1px);
      }
      .pwa-dismiss-button {
        background: transparent;
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      .pwa-dismiss-button:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(notification);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      this.dismissInstall();
    }, 10000);
  }

  /**
   * Install PWA
   */
  async install() {
    if (!this.deferredPrompt) {
      logger.warn('Install prompt not available');
      return false;
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        logger.info('PWA installation accepted');
        this.trackInstallation('accepted');
      } else {
        logger.info('PWA installation dismissed');
        this.trackInstallation('dismissed');
      }

      // Clear the deferred prompt
      this.deferredPrompt = null;

      // Remove install notification
      this.dismissInstall();

      return outcome === 'accepted';
    } catch (error) {
      logger.error('PWA installation failed:', error);
      return false;
    }
  }

  /**
   * Dismiss install prompt
   */
  dismissInstall() {
    const notification = document.querySelector('.pwa-install-notification');
    if (notification) {
      notification.remove();
    }
  }

  /**
   * Setup service worker
   */
  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          this.serviceWorker = registration;
          logger.info('Service worker registered successfully');

          // Check for updates
          this.checkForUpdates();
        })
        .catch((error) => {
          logger.error('Service worker registration failed:', error);
        });
    }
  }

  /**
   * Check for updates
   */
  checkForUpdates() {
    if (!this.serviceWorker) return;

    this.serviceWorker.addEventListener('updatefound', () => {
      const newWorker = this.serviceWorker.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          this.updateAvailable = true;
          this.showUpdateNotification();
        }
      });
    });
  }

  /**
   * Show update notification
   */
  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'pwa-update-notification';
    notification.innerHTML = `
      <div class="pwa-update-content">
        <div class="pwa-update-icon">🔄</div>
        <div class="pwa-update-text">
          <h3>Update Available</h3>
          <p>New version of StreamVault is ready</p>
        </div>
        <div class="pwa-update-actions">
          <button class="pwa-update-button" onclick="window.pwaUtils.update()">
            Update
          </button>
          <button class="pwa-dismiss-button" onclick="window.pwaUtils.dismissUpdate()">
            Later
          </button>
        </div>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: slideDown 0.3s ease-out;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .pwa-update-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .pwa-update-icon {
        font-size: 24px;
      }
      .pwa-update-text h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
      }
      .pwa-update-text p {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
      }
      .pwa-update-actions {
        display: flex;
        gap: 8px;
        margin-left: auto;
      }
      .pwa-update-button, .pwa-dismiss-button {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .pwa-update-button {
        background: white;
        color: #4facfe;
      }
      .pwa-update-button:hover {
        background: #f8f9fa;
        transform: translateY(-1px);
      }
      .pwa-dismiss-button {
        background: transparent;
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      .pwa-dismiss-button:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(notification);
  }

  /**
   * Update PWA
   */
  async update() {
    if (!this.updateAvailable) return;

    try {
      // Skip waiting and activate new service worker
      if (this.serviceWorker && this.serviceWorker.waiting) {
        this.serviceWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Reload the page
      window.location.reload();

      logger.info('PWA updated successfully');
    } catch (error) {
      logger.error('PWA update failed:', error);
    }
  }

  /**
   * Dismiss update notification
   */
  dismissUpdate() {
    const notification = document.querySelector('.pwa-update-notification');
    if (notification) {
      notification.remove();
    }
  }

  /**
   * Setup update notifications
   */
  setupUpdateNotifications() {
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New service worker is controlling the page
        this.updateAvailable = false;
        logger.info('New service worker is now controlling the page');
      });
    }
  }

  /**
   * Setup offline handling
   */
  setupOfflineHandling() {
    // Handle online/offline events
    window.addEventListener('online', () => {
      logger.info('App is back online');
      this.showOnlineNotification();
    });

    window.addEventListener('offline', () => {
      logger.info('App is offline');
      this.showOfflineNotification();
    });
  }

  /**
   * Show online notification
   */
  showOnlineNotification() {
    const notification = document.createElement('div');
    notification.className = 'pwa-online-notification';
    notification.innerHTML = `
      <div class="pwa-online-content">
        <div class="pwa-online-icon">✅</div>
        <div class="pwa-online-text">
          <h3>Back Online</h3>
          <p>StreamVault is connected</p>
        </div>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);
      color: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .pwa-online-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .pwa-online-icon {
        font-size: 24px;
      }
      .pwa-online-text h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
      }
      .pwa-online-text p {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(notification);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Show offline notification
   */
  showOfflineNotification() {
    const notification = document.createElement('div');
    notification.className = 'pwa-offline-notification';
    notification.innerHTML = `
      <div class="pwa-offline-content">
        <div class="pwa-offline-icon">⚠️</div>
        <div class="pwa-offline-text">
          <h3>Offline Mode</h3>
          <p>Some features may be limited</p>
        </div>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ff6b6b 0%, #ffa8a8 100%);
      color: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .pwa-offline-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .pwa-offline-icon {
        font-size: 24px;
      }
      .pwa-offline-text h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
      }
      .pwa-offline-text p {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(notification);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  /**
   * Track installation
   */
  trackInstallation(outcome = 'unknown') {
    // Send analytics event
    if (window.gtag) {
      window.gtag('event', 'pwa_install', {
        event_category: 'PWA',
        event_label: outcome,
        value: 1
      });
    }

    // Store in local storage
    const installData = {
      timestamp: Date.now(),
      outcome,
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };

    localStorage.setItem('pwa_install_data', JSON.stringify(installData));
  }

  /**
   * Get PWA status
   */
  getStatus() {
    return {
      isInstalled: this.isInstalled,
      canInstall: !!this.deferredPrompt,
      updateAvailable: this.updateAvailable,
      isOnline: navigator.onLine,
      serviceWorkerSupported: 'serviceWorker' in navigator,
      pushSupported: 'PushManager' in window,
      notificationSupported: 'Notification' in window
    };
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      logger.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      logger.warn('Notification permission denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      logger.error('Notification permission request failed:', error);
      return false;
    }
  }

  /**
   * Show notification
   */
  showNotification(title, options = {}) {
    if (Notification.permission !== 'granted') {
      logger.warn('Notification permission not granted');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      logger.error('Notification failed:', error);
    }
  }
}

// Create global instance
const pwaUtils = new PWAUtils();

// Make available globally
window.pwaUtils = pwaUtils;

export default pwaUtils;
