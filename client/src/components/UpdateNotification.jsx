/**
 * 🔄 UPDATE NOTIFICATION COMPONENT
 * Desktop auto-update UI with changelog
 */

import { AlertCircle, CheckCircle, Download, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import './UpdateNotification.css';

const UpdateNotification = () => {
  const [updateState, setUpdateState] = useState('idle'); // idle, checking, available, downloading, downloaded, error
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');

  // Check if Electron API is available
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  // Get current version
  useEffect(() => {
    if (isElectron) {
      window.electronAPI.updater.getVersion().then((info) => {
        setCurrentVersion(info.version);
      });
    }
  }, [isElectron]);

  // Set up auto-updater event listeners
  useEffect(() => {
    if (!isElectron) return;

    const unsubscribers = [];

    // Checking for update
    const unsubCheckingForUpdate = window.electronAPI.updater.onCheckingForUpdate(() => {
      setUpdateState('checking');
    });
    unsubscribers.push(unsubCheckingForUpdate);

    // Update available
    const unsubUpdateAvailable = window.electronAPI.updater.onUpdateAvailable((info) => {
      console.log('✅ Update available:', info);
      setUpdateInfo(info);
      setUpdateState('available');
      setIsVisible(true);
    });
    unsubscribers.push(unsubUpdateAvailable);

    // Update not available
    const unsubUpdateNotAvailable = window.electronAPI.updater.onUpdateNotAvailable((info) => {
      console.log('✅ No updates available:', info);
      setUpdateState('idle');
    });
    unsubscribers.push(unsubUpdateNotAvailable);

    // Download progress
    const unsubDownloadProgress = window.electronAPI.updater.onDownloadProgress((progress) => {
      setDownloadProgress(progress.percent);
      setUpdateState('downloading');
    });
    unsubscribers.push(unsubDownloadProgress);

    // Update downloaded
    const unsubUpdateDownloaded = window.electronAPI.updater.onUpdateDownloaded((info) => {
      console.log('✅ Update downloaded:', info);
      setUpdateInfo(info);
      setUpdateState('downloaded');
      setIsVisible(true);
    });
    unsubscribers.push(unsubUpdateDownloaded);

    // Error
    const unsubError = window.electronAPI.updater.onError((error) => {
      console.error('❌ Update error:', error);
      setErrorMessage(error.message);
      setUpdateState('error');
      setIsVisible(true);
    });
    unsubscribers.push(unsubError);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [isElectron]);

  // Manual check for updates
  const handleCheckForUpdates = useCallback(async () => {
    if (!isElectron) return;

    setUpdateState('checking');
    setIsVisible(true);

    try {
      const result = await window.electronAPI.updater.checkForUpdates();
      console.log('Update check result:', result);

      if (!result.success) {
        setErrorMessage(result.message || 'Failed to check for updates');
        setUpdateState('error');
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      setErrorMessage(error.message);
      setUpdateState('error');
    }
  }, [isElectron]);

  // Download update
  const handleDownloadUpdate = useCallback(async () => {
    if (!isElectron) return;

    setUpdateState('downloading');
    setDownloadProgress(0);

    try {
      await window.electronAPI.updater.downloadUpdate();
    } catch (error) {
      console.error('Failed to download update:', error);
      setErrorMessage(error.message);
      setUpdateState('error');
    }
  }, [isElectron]);

  // Install update and restart
  const handleInstallUpdate = useCallback(async () => {
    if (!isElectron) return;

    try {
      await window.electronAPI.updater.quitAndInstall();
    } catch (error) {
      console.error('Failed to install update:', error);
      setErrorMessage(error.message);
      setUpdateState('error');
    }
  }, [isElectron]);

  // Close notification
  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Don't render if not Electron or not visible
  if (!isElectron || !isVisible) return null;

  // Format release notes
  const formatReleaseNotes = (notes) => {
    if (!notes) return null;
    if (typeof notes === 'string') {
      // Convert markdown-style bullet points to list items
      return notes.split('\n').map((line, index) => {
        if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
          return <li key={index}>{line.trim().substring(1).trim()}</li>;
        }
        return line.trim() ? <p key={index}>{line.trim()}</p> : null;
      });
    }
    return null;
  };

  return (
    <div className="update-notification-container">
      <div className="update-notification">
        <button className="update-close" onClick={handleClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Checking for updates */}
        {updateState === 'checking' && (
          <div className="update-content">
            <RefreshCw className="update-icon spinning" size={24} />
            <h3>Checking for updates...</h3>
            <p>Please wait while we check for new versions.</p>
          </div>
        )}

        {/* Update available */}
        {updateState === 'available' && updateInfo && (
          <div className="update-content">
            <Download className="update-icon" size={24} />
            <h3>Update Available</h3>
            <p className="update-version">
              Version {updateInfo.version} is available (current: {currentVersion})
            </p>
            {updateInfo.releaseNotes && (
              <div className="update-changelog">
                <h4>What's New:</h4>
                <ul>{formatReleaseNotes(updateInfo.releaseNotes)}</ul>
              </div>
            )}
            <div className="update-actions">
              <button className="btn-update-primary" onClick={handleDownloadUpdate}>
                Download Update
              </button>
              <button className="btn-update-secondary" onClick={handleClose}>
                Later
              </button>
            </div>
          </div>
        )}

        {/* Downloading */}
        {updateState === 'downloading' && (
          <div className="update-content">
            <Download className="update-icon pulsing" size={24} />
            <h3>Downloading Update...</h3>
            <div className="update-progress">
              <div className="update-progress-bar">
                <div className="update-progress-fill" style={{ width: `${downloadProgress}%` }} />
              </div>
              <span className="update-progress-text">{Math.round(downloadProgress)}%</span>
            </div>
            <p className="update-hint">Please keep the app running until download completes.</p>
          </div>
        )}

        {/* Downloaded - ready to install */}
        {updateState === 'downloaded' && updateInfo && (
          <div className="update-content">
            <CheckCircle className="update-icon success" size={24} />
            <h3>Update Ready to Install</h3>
            <p className="update-version">Version {updateInfo.version} has been downloaded.</p>
            {updateInfo.releaseNotes && (
              <div className="update-changelog">
                <h4>What's New:</h4>
                <ul>{formatReleaseNotes(updateInfo.releaseNotes)}</ul>
              </div>
            )}
            <div className="update-actions">
              <button className="btn-update-primary" onClick={handleInstallUpdate}>
                Restart & Install
              </button>
              <button className="btn-update-secondary" onClick={handleClose}>
                Install Later
              </button>
            </div>
            <p className="update-hint">The app will restart to complete the installation.</p>
          </div>
        )}

        {/* Error */}
        {updateState === 'error' && (
          <div className="update-content">
            <AlertCircle className="update-icon error" size={24} />
            <h3>Update Error</h3>
            <p className="update-error">{errorMessage || 'An error occurred during update.'}</p>
            <div className="update-actions">
              <button className="btn-update-primary" onClick={handleCheckForUpdates}>
                Try Again
              </button>
              <button className="btn-update-secondary" onClick={handleClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual check button (bottom-right corner) */}
      {updateState === 'idle' && (
        <button
          className="update-check-button"
          onClick={handleCheckForUpdates}
          aria-label="Check for updates"
          title="Check for updates"
        >
          <RefreshCw size={20} />
        </button>
      )}
    </div>
  );
};

export default UpdateNotification;
