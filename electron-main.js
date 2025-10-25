const {
  app,
  BrowserWindow,
  protocol,
  ipcMain,
  dialog,
  shell,
  nativeTheme,
  clipboard,
  Notification,
  Tray,
  Menu
} = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let miniPlayerWindow = null;
let tray = null;
let serverProcess;
const isDev = process.env.NODE_ENV === 'development';
const SERVER_PORT = 3000;
const CLIENT_PORT = 5173;

// Server start function
function startServer() {
  const serverPath = path.join(__dirname, 'server', 'index.js');

  if (!fs.existsSync(serverPath)) {
    console.error('Server file not found:', serverPath);
    return;
  }

  console.log('Starting server...');
  serverProcess = spawn('node', [serverPath], {
    cwd: path.join(__dirname, 'server'),
    env: {
      ...process.env,
      NODE_ENV: isDev ? 'development' : 'production',
      SERVER_PORT: SERVER_PORT,
      ELECTRON_APP: 'true'
    },
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
  });

  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#0f0f0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'electron-preload.js')
    },
    show: false,
    icon: path.join(__dirname, 'client', 'public', 'leaf.svg'),
    frame: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  // Wait for window to be ready before showing
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Process stored protocol URL if app was launched by protocol
    if (protocolUrl) {
      console.log('[Protocol] Processing stored URL:', protocolUrl);
      handleProtocolUrl(protocolUrl);
      protocolUrl = null;
    }
  });

  // Load app
  if (isDev) {
    // Development: load from Vite dev server
    mainWindow.loadURL(`http://localhost:${CLIENT_PORT}`);
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    const indexPath = path.join(__dirname, 'client', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 🎯 Minimize to tray instead of taskbar
  mainWindow.on('minimize', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();

      // Show notification on first minimize
      if (!mainWindow.hasBeenMinimizedToTray) {
        const notification = new Notification({
          title: 'StreamVault',
          body: 'App minimized to system tray. Click the tray icon to restore.',
          icon: path.join(__dirname, 'client', 'public', 'leaf.svg')
        });
        notification.show();
        mainWindow.hasBeenMinimizedToTray = true;
      }
    }
  });

  // 🎯 Close to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();

      // Show notification
      const notification = new Notification({
        title: 'StreamVault',
        body: 'App is still running in the background. Use the tray icon to quit.',
        icon: path.join(__dirname, 'client', 'public', 'leaf.svg')
      });
      notification.show();
    }
    return false;
  });

  // Window event listeners for IPC
  mainWindow.on('focus', () => {
    mainWindow.webContents.send('window:focus');
  });

  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window:blur');
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:unmaximized');
  });
}

// ========================================
// 🎬 MINI PLAYER WINDOW
// ========================================

function createMiniPlayer(videoData) {
  // Close existing mini player if any
  if (miniPlayerWindow) {
    miniPlayerWindow.close();
    miniPlayerWindow = null;
  }

  miniPlayerWindow = new BrowserWindow({
    width: 400,
    height: 300,
    minWidth: 300,
    minHeight: 200,
    backgroundColor: '#000000',
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'electron-preload.js')
    },
    show: false
  });

  // Load mini player
  if (isDev) {
    miniPlayerWindow.loadURL(`http://localhost:${CLIENT_PORT}/#/mini-player`);
  } else {
    miniPlayerWindow.loadFile(path.join(__dirname, 'client', 'dist', 'index.html'), {
      hash: '/mini-player'
    });
  }

  // Send video data to mini player
  miniPlayerWindow.webContents.on('did-finish-load', () => {
    miniPlayerWindow.webContents.send('mini-player:load-video', videoData);
    miniPlayerWindow.show();
  });

  miniPlayerWindow.on('closed', () => {
    miniPlayerWindow = null;
  });

  console.log('✅ Mini player window created');
  return miniPlayerWindow;
}

// ========================================
// 🪟 WINDOW MANAGEMENT FUNCTIONS
// ========================================

function setAlwaysOnTop(enable) {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(enable, 'screen-saver');
    return true;
  }
  return false;
}

function setWindowBounds(bounds) {
  if (mainWindow) {
    mainWindow.setBounds(bounds);
    return true;
  }
  return false;
}

function getWindowBounds() {
  if (mainWindow) {
    return mainWindow.getBounds();
  }
  return null;
}

function centerWindow() {
  if (mainWindow) {
    mainWindow.center();
    return true;
  }
  return false;
}

// ========================================
// 🔄 AUTO-UPDATER CONFIGURATION
// ========================================

// Configure auto-updater
autoUpdater.autoDownload = false; // Don't download automatically
autoUpdater.autoInstallOnAppQuit = true; // Install on quit

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('🔍 Checking for updates...');
  if (mainWindow) {
    mainWindow.webContents.send('updater:checking-for-update');
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('✅ Update available:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('updater:update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
      releaseName: info.releaseName
    });
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('✅ App is up to date:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('updater:update-not-available', {
      version: info.version
    });
  }
});

autoUpdater.on('error', (err) => {
  console.error('❌ Auto-updater error:', err);
  if (mainWindow) {
    mainWindow.webContents.send('updater:error', {
      message: err.message || 'Unknown error occurred'
    });
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  const logMessage = `📥 Download progress: ${progressObj.percent.toFixed(2)}% (${
    progressObj.transferred
  }/${progressObj.total})`;
  console.log(logMessage);

  if (mainWindow) {
    mainWindow.webContents.send('updater:download-progress', {
      percent: progressObj.percent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
  }

  // Update Windows progress bar
  if (process.platform === 'win32') {
    mainWindow.setProgressBar(progressObj.percent / 100);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('✅ Update downloaded:', info.version);

  // Reset progress bar
  if (mainWindow && process.platform === 'win32') {
    mainWindow.setProgressBar(-1);
  }

  if (mainWindow) {
    mainWindow.webContents.send('updater:update-downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseName: info.releaseName
    });
  }
});

// Function to check for updates
function checkForUpdates() {
  if (!isDev) {
    console.log('🔄 Initiating update check...');
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('Failed to check for updates:', err);
    });
  } else {
    console.log('⚠️ Auto-updater disabled in development mode');
  }
}

// ========================================
// 🎯 SYSTEM TRAY & MENU BAR
// ========================================

// Create system tray
function createTray() {
  // Try different icon paths
  const iconPath = isDev
    ? path.join(__dirname, 'client', 'public', 'leaf.svg')
    : path.join(process.resourcesPath, 'assets', 'leaf.svg');

  // Create tray icon
  tray = new Tray(iconPath);

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'StreamVault',
      enabled: false,
      icon: iconPath
    },
    { type: 'separator' },
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Hide App',
      click: () => {
        if (mainWindow) mainWindow.hide();
      }
    },
    { type: 'separator' },
    {
      label: 'Downloads',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('navigate-to', '/downloads');
        }
      }
    },
    {
      label: 'Torrents',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('navigate-to', '/torrents');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Check for Updates',
      click: () => {
        checkForUpdates();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit StreamVault',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  // Set context menu
  tray.setContextMenu(contextMenu);

  // Set tooltip
  tray.setToolTip('StreamVault - Premium Torrent Streaming');

  // Handle tray click
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Handle double-click
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  console.log('✅ System tray created');
}

// Update tray badge (for download count, etc.)
function updateTrayBadge(count) {
  if (!tray) return;

  if (count > 0) {
    // On macOS, show badge
    if (process.platform === 'darwin') {
      app.dock.setBadge(count.toString());
    }
    // On Windows, overlay icon
    if (process.platform === 'win32' && mainWindow) {
      // You can create a small badge icon here
      tray.setToolTip(`StreamVault - ${count} active downloads`);
    }
  } else {
    if (process.platform === 'darwin') {
      app.dock.setBadge('');
    }
    tray.setToolTip('StreamVault - Premium Torrent Streaming');
  }
}

// Create application menu (menu bar)
function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Torrent File',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [{ name: 'Torrent Files', extensions: ['torrent'] }]
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('torrent:open-file', result.filePaths[0]);
            }
          }
        },
        {
          label: 'Add Magnet Link',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            mainWindow.webContents.send('torrent:add-magnet');
          }
        },
        { type: 'separator' },
        {
          label: 'Minimize to Tray',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (mainWindow) mainWindow.hide();
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Home',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/');
          }
        },
        {
          label: 'Search',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('focus-search');
          }
        },
        {
          label: 'Downloads',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/downloads');
          }
        },
        {
          label: 'Torrents',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/torrents');
          }
        },
        {
          label: 'Collections',
          accelerator: 'CmdOrCtrl+4',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/collections');
          }
        },
        {
          label: 'Watchlist',
          accelerator: 'CmdOrCtrl+5',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/watchlist');
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin'
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About StreamVault',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/about');
          }
        },
        {
          label: 'Check for Updates',
          click: () => {
            checkForUpdates();
          }
        },
        { type: 'separator' },
        {
          label: 'GitHub Repository',
          click: async () => {
            await shell.openExternal('https://github.com/streamvault/streamvault');
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/streamvault/streamvault/issues');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  console.log('✅ Application menu created');
}

// ✅ IPC Handlers - Window Controls
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.on('window:toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

// ✅ IPC Handlers - Window Management
ipcMain.handle('window:create-mini-player', (_event, videoData) => {
  const miniPlayer = createMiniPlayer(videoData);
  return { success: !!miniPlayer };
});

ipcMain.handle('window:close-mini-player', () => {
  if (miniPlayerWindow) {
    miniPlayerWindow.close();
    miniPlayerWindow = null;
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('window:set-always-on-top', (_event, enable) => {
  const success = setAlwaysOnTop(enable);
  return { success };
});

ipcMain.handle('window:get-always-on-top', () => {
  if (mainWindow) {
    return { alwaysOnTop: mainWindow.isAlwaysOnTop() };
  }
  return { alwaysOnTop: false };
});

ipcMain.handle('window:set-bounds', (_event, bounds) => {
  const success = setWindowBounds(bounds);
  return { success };
});

ipcMain.handle('window:get-bounds', () => {
  const bounds = getWindowBounds();
  return bounds || { x: 0, y: 0, width: 1400, height: 900 };
});

ipcMain.handle('window:center', () => {
  const success = centerWindow();
  return { success };
});

ipcMain.handle('window:get-display-info', () => {
  const { screen } = require('electron');
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();

  return {
    displays: displays.map((d) => ({
      id: d.id,
      bounds: d.bounds,
      workArea: d.workArea,
      scaleFactor: d.scaleFactor,
      rotation: d.rotation,
      internal: d.internal
    })),
    primary: {
      id: primaryDisplay.id,
      bounds: primaryDisplay.bounds,
      workArea: primaryDisplay.workArea,
      scaleFactor: primaryDisplay.scaleFactor
    }
  };
});

// ✅ IPC Handlers - App
ipcMain.handle('app:get-path', (_event, name) => {
  return app.getPath(name);
});

ipcMain.handle('app:get-name', () => {
  return app.getName();
});

ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

ipcMain.on('app:quit', () => {
  app.quit();
});

ipcMain.on('app:relaunch', () => {
  app.relaunch();
  app.quit();
});

// ✅ IPC Handlers - Dialog
ipcMain.handle('dialog:open', async (_event, options) => {
  if (!mainWindow) return { canceled: true };
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('dialog:save', async (_event, options) => {
  if (!mainWindow) return { canceled: true };
  return await dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('dialog:message', async (_event, options) => {
  if (!mainWindow) return { response: 0 };
  return await dialog.showMessageBox(mainWindow, options);
});

// ✅ IPC Handlers - Shell
ipcMain.handle('shell:open-external', async (_event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Failed to open external URL:', error);
    return { success: false, error: error.message };
  }
});

// ✅ IPC Handlers - Clipboard
ipcMain.handle('clipboard:write-text', (_event, text) => {
  clipboard.writeText(text);
  return { success: true };
});

ipcMain.handle('clipboard:read-text', () => {
  return clipboard.readText();
});

// ✅ IPC Handlers - Notifications
let notificationId = 0;
ipcMain.handle('notification:show', (_event, options) => {
  const id = ++notificationId;
  const notification = new Notification({
    title: options.title,
    body: options.body,
    icon: options.icon,
    silent: options.silent
  });

  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.webContents.send('notification:clicked', id);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  notification.show();
  return { id };
});

// ✅ IPC Handlers - Theme
ipcMain.handle('theme:get', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

nativeTheme.on('updated', () => {
  const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  if (mainWindow) {
    mainWindow.webContents.send('theme:changed', theme);
  }
});

// ✅ IPC Handlers - Auto-Updater
ipcMain.handle('updater:check-for-updates', async () => {
  if (isDev) {
    return {
      success: false,
      message: 'Auto-updater disabled in development mode'
    };
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      success: true,
      updateInfo: result ? result.updateInfo : null
    };
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('updater:download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('Failed to download update:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('updater:quit-and-install', () => {
  autoUpdater.quitAndInstall(false, true);
  return { success: true };
});

ipcMain.handle('updater:get-version', () => {
  return {
    version: app.getVersion(),
    name: app.getName()
  };
});

// ✅ IPC Handlers - System Tray
ipcMain.handle('tray:update-badge', (_event, count) => {
  updateTrayBadge(count);
  return { success: true };
});

ipcMain.handle('tray:show-notification', (_event, options) => {
  if (tray) {
    tray.displayBalloon({
      title: options.title || 'StreamVault',
      content: options.message || '',
      icon: options.icon
    });
  }
  return { success: true };
});

// ✅ IPC Handlers - Performance
ipcMain.handle('performance:get-metrics', () => {
  return {
    memory: process.getProcessMemoryInfo(),
    cpu: process.getCPUUsage(),
    system: {
      totalMemory: require('os').totalmem(),
      freeMemory: require('os').freemem()
    }
  };
});

ipcMain.handle('performance:clear-cache', async () => {
  if (mainWindow) {
    await mainWindow.webContents.session.clearCache();
    return { success: true };
  }
  return { success: false };
});

// ✅ Power Monitoring
const { powerMonitor } = require('electron');

// 🔗 PROTOCOL HANDLER - Deep Links & Magnet Links
let protocolUrl = null; // Store protocol URL if app wasn't running

// Register protocols before app ready
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('streamvault', process.execPath, [
      path.resolve(process.argv[1])
    ]);
    app.setAsDefaultProtocolClient('magnet', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('streamvault');
  app.setAsDefaultProtocolClient('magnet');
}

// Handle protocol URLs when app is already running
app.on('open-url', (event, url) => {
  event.preventDefault();
  console.log('[Protocol] Received URL:', url);

  if (mainWindow) {
    handleProtocolUrl(url);
  } else {
    protocolUrl = url; // Store for later when window is ready
  }
});

// Windows/Linux protocol handling
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Check for protocol URL in command line
      const url = commandLine.find(
        (arg) => arg.startsWith('streamvault://') || arg.startsWith('magnet:')
      );

      if (url) {
        console.log('[Protocol] Second instance URL:', url);
        handleProtocolUrl(url);
      }
    }
  });
}

// Handle protocol URLs
function handleProtocolUrl(url) {
  console.log('[Protocol] Handling URL:', url);

  try {
    if (url.startsWith('magnet:')) {
      // Handle magnet links
      const magnetLink = url;
      console.log('[Protocol] Magnet link:', magnetLink);

      // Send to renderer to add torrent
      if (mainWindow) {
        mainWindow.webContents.send('protocol:magnet', magnetLink);

        // Show window and focus
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    } else if (url.startsWith('streamvault://')) {
      // Handle streamvault:// deep links
      const route = url.replace('streamvault://', '');
      console.log('[Protocol] Deep link route:', route);

      // Send to renderer to navigate
      if (mainWindow) {
        mainWindow.webContents.send('protocol:navigate', route);

        // Show window and focus
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    }
  } catch (error) {
    console.error('[Protocol] Error handling URL:', error);
  }
}

app.whenReady().then(() => {
  // Power monitor events
  powerMonitor.on('suspend', () => {
    console.log('System is going to sleep');
    if (mainWindow) {
      mainWindow.webContents.send('power:suspend');
    }
  });

  powerMonitor.on('resume', () => {
    console.log('System woke up');
    if (mainWindow) {
      mainWindow.webContents.send('power:resume');
    }
  });

  // ✅ Content Security Policy
  if (!isDev) {
    app.on('web-contents-created', (_event, contents) => {
      contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);

        // Allow only local navigation
        if (
          parsedUrl.origin !== `http://localhost:${CLIENT_PORT}` &&
          parsedUrl.protocol !== 'file:'
        ) {
          event.preventDefault();
          console.warn('Blocked navigation to:', navigationUrl);
        }
      });

      // Prevent new window creation
      contents.setWindowOpenHandler(({ url }) => {
        // Open external links in default browser
        if (url.startsWith('http://') || url.startsWith('https://')) {
          shell.openExternal(url);
        }
        return { action: 'deny' };
      });
    });
  }

  // Start backend server
  startServer();

  // Give server time to start
  setTimeout(() => {
    createWindow();

    // 🎯 Create system tray and application menu
    createTray();
    createApplicationMenu();

    // 🔄 Check for updates after window is ready (30 seconds delay)
    setTimeout(() => {
      checkForUpdates();
    }, 30000); // Wait 30s before checking for updates
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Kill server process
  if (serverProcess) {
    console.log('Stopping server...');
    serverProcess.kill();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
