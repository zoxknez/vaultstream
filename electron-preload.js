/**
 * 🔒 ELECTRON PRELOAD SCRIPT
 * Secure bridge between main process and renderer
 * Exposes safe IPC channels via contextBridge
 */

const { contextBridge, ipcRenderer, shell } = require('electron');
const path = require('path');

// ✅ Whitelist of safe external URLs
const SAFE_URL_PATTERNS = [
  /^https:\/\/api\.themoviedb\.org\/.*/,
  /^https:\/\/image\.tmdb\.org\/.*/,
  /^https:\/\/www\.omdbapi\.com\/.*/,
  /^https:\/\/github\.com\/.*/,
  /^https:\/\/.*\.github\.io\/.*/
];

const isSafeUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return SAFE_URL_PATTERNS.some((pattern) => pattern.test(url));
  } catch {
    return false;
  }
};

// ✅ Expose safe API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,
  arch: process.arch,
  version: process.versions.electron,

  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    toggleFullscreen: () => ipcRenderer.send('window:toggle-fullscreen'),
    // Window management
    createMiniPlayer: (videoData) => ipcRenderer.invoke('window:create-mini-player', videoData),
    closeMiniPlayer: () => ipcRenderer.invoke('window:close-mini-player'),
    setAlwaysOnTop: (enable) => ipcRenderer.invoke('window:set-always-on-top', enable),
    getAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top'),
    setBounds: (bounds) => ipcRenderer.invoke('window:set-bounds', bounds),
    getBounds: () => ipcRenderer.invoke('window:get-bounds'),
    center: () => ipcRenderer.invoke('window:center'),
    getDisplayInfo: () => ipcRenderer.invoke('window:get-display-info'),
    onFocus: (callback) => {
      const subscription = (_event) => callback();
      ipcRenderer.on('window:focus', subscription);
      return () => ipcRenderer.removeListener('window:focus', subscription);
    },
    onBlur: (callback) => {
      const subscription = (_event) => callback();
      ipcRenderer.on('window:blur', subscription);
      return () => ipcRenderer.removeListener('window:blur', subscription);
    },
    onMaximize: (callback) => {
      const subscription = (_event) => callback();
      ipcRenderer.on('window:maximized', subscription);
      return () => ipcRenderer.removeListener('window:maximized', subscription);
    },
    onUnmaximize: (callback) => {
      const subscription = (_event) => callback();
      ipcRenderer.on('window:unmaximized', subscription);
      return () => ipcRenderer.removeListener('window:unmaximized', subscription);
    }
  },

  // File system operations (safe)
  path: {
    join: (...args) => path.join(...args),
    basename: (p) => path.basename(p),
    dirname: (p) => path.dirname(p),
    extname: (p) => path.extname(p)
  },

  // System paths
  getPath: (name) => {
    const validPaths = ['home', 'appData', 'userData', 'downloads', 'documents', 'desktop', 'temp'];
    if (!validPaths.includes(name)) {
      throw new Error(`Invalid path name: ${name}`);
    }
    return ipcRenderer.invoke('app:get-path', name);
  },

  // File dialogs
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:open', options),
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:save', options),
    showMessageBox: (options) => ipcRenderer.invoke('dialog:message', options)
  },

  // External links (with security validation)
  openExternal: (url) => {
    if (!isSafeUrl(url)) {
      console.warn('Blocked attempt to open unsafe URL:', url);
      return Promise.reject(new Error('URL not in whitelist'));
    }
    return ipcRenderer.invoke('shell:open-external', url);
  },

  // Clipboard operations
  clipboard: {
    writeText: (text) => ipcRenderer.invoke('clipboard:write-text', text),
    readText: () => ipcRenderer.invoke('clipboard:read-text')
  },

  // Notifications
  notification: {
    show: (title, options) => ipcRenderer.invoke('notification:show', { title, ...options }),
    onClicked: (callback) => {
      const subscription = (_event, id) => callback(id);
      ipcRenderer.on('notification:clicked', subscription);
      return () => ipcRenderer.removeListener('notification:clicked', subscription);
    }
  },

  // Auto-updater
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
    getVersion: () => ipcRenderer.invoke('updater:get-version'),
    onCheckingForUpdate: (callback) => {
      const subscription = () => callback();
      ipcRenderer.on('updater:checking-for-update', subscription);
      return () => ipcRenderer.removeListener('updater:checking-for-update', subscription);
    },
    onUpdateAvailable: (callback) => {
      const subscription = (_event, info) => callback(info);
      ipcRenderer.on('updater:update-available', subscription);
      return () => ipcRenderer.removeListener('updater:update-available', subscription);
    },
    onUpdateNotAvailable: (callback) => {
      const subscription = (_event, info) => callback(info);
      ipcRenderer.on('updater:update-not-available', subscription);
      return () => ipcRenderer.removeListener('updater:update-not-available', subscription);
    },
    onDownloadProgress: (callback) => {
      const subscription = (_event, progress) => callback(progress);
      ipcRenderer.on('updater:download-progress', subscription);
      return () => ipcRenderer.removeListener('updater:download-progress', subscription);
    },
    onUpdateDownloaded: (callback) => {
      const subscription = (_event, info) => callback(info);
      ipcRenderer.on('updater:update-downloaded', subscription);
      return () => ipcRenderer.removeListener('updater:update-downloaded', subscription);
    },
    onError: (callback) => {
      const subscription = (_event, error) => callback(error);
      ipcRenderer.on('updater:error', subscription);
      return () => ipcRenderer.removeListener('updater:error', subscription);
    }
  },

  // System theme
  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
    onChange: (callback) => {
      const subscription = (_event, theme) => callback(theme);
      ipcRenderer.on('theme:changed', subscription);
      return () => ipcRenderer.removeListener('theme:changed', subscription);
    }
  },

  // Power monitor
  power: {
    onSuspend: (callback) => {
      const subscription = () => callback();
      ipcRenderer.on('power:suspend', subscription);
      return () => ipcRenderer.removeListener('power:suspend', subscription);
    },
    onResume: (callback) => {
      const subscription = () => callback();
      ipcRenderer.on('power:resume', subscription);
      return () => ipcRenderer.removeListener('power:resume', subscription);
    }
  },

  // App metadata
  app: {
    getName: () => ipcRenderer.invoke('app:get-name'),
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    quit: () => ipcRenderer.send('app:quit'),
    relaunch: () => ipcRenderer.send('app:relaunch')
  },

  // System tray
  tray: {
    updateBadge: (count) => ipcRenderer.invoke('tray:update-badge', count),
    showNotification: (options) => ipcRenderer.invoke('tray:show-notification', options)
  },

  // Navigation events (from menu)
  navigation: {
    onNavigateTo: (callback) => {
      const subscription = (_event, route) => callback(route);
      ipcRenderer.on('navigate-to', subscription);
      return () => ipcRenderer.removeListener('navigate-to', subscription);
    },
    onFocusSearch: (callback) => {
      const subscription = () => callback();
      ipcRenderer.on('focus-search', subscription);
      return () => ipcRenderer.removeListener('focus-search', subscription);
    },
    onOpenTorrentFile: (callback) => {
      const subscription = (_event, filePath) => callback(filePath);
      ipcRenderer.on('torrent:open-file', subscription);
      return () => ipcRenderer.removeListener('torrent:open-file', subscription);
    },
    onAddMagnet: (callback) => {
      const subscription = () => callback();
      ipcRenderer.on('torrent:add-magnet', subscription);
      return () => ipcRenderer.removeListener('torrent:add-magnet', subscription);
    }
  },

  // 🔗 Protocol Handler - Deep Links & Magnet Links
  protocol: {
    onMagnetLink: (callback) => {
      const subscription = (_event, magnetLink) => callback(magnetLink);
      ipcRenderer.on('protocol:magnet', subscription);
      return () => ipcRenderer.removeListener('protocol:magnet', subscription);
    },
    onDeepLink: (callback) => {
      const subscription = (_event, route) => callback(route);
      ipcRenderer.on('protocol:navigate', subscription);
      return () => ipcRenderer.removeListener('protocol:navigate', subscription);
    }
  },

  // Performance metrics
  performance: {
    getMetrics: () => ipcRenderer.invoke('performance:get-metrics'),
    clearCache: () => ipcRenderer.invoke('performance:clear-cache')
  }
});

// ✅ Log preload script loaded
console.log('✅ Electron Preload Script loaded securely');
