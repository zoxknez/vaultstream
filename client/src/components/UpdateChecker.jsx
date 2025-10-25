import React, { useEffect, useState, useCallback } from 'react';
import { Download, X, RefreshCw, AlertCircle } from 'lucide-react';
import './UpdateChecker.css';

const GITHUB_REPO = 'zoxknez/netflix';
const CURRENT_VERSION = '1.0.0';
const CHECK_INTERVAL = 1000 * 60 * 60; // Check every 60 minutes

const UpdateChecker = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);
  const [releaseUrl, setReleaseUrl] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  const checkForUpdates = useCallback(async () => {
    setChecking(true);
    setError(null);
    
    try {
      // Check GitHub releases
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No releases yet - this is normal for new repos
          setChecking(false);
          return;
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const version = data.tag_name.replace('v', '');
      
      console.log(`📦 Current version: ${CURRENT_VERSION}`);
      console.log(`🚀 Latest version: ${version}`);

      // Simple version comparison (can be improved with semver)
      if (compareVersions(version, CURRENT_VERSION) > 0) {
        setLatestVersion(version);
        setReleaseUrl(data.html_url);
        setUpdateAvailable(true);
        
        // Save to localStorage that update is available
        localStorage.setItem('streamvault_update_available', JSON.stringify({
          version,
          url: data.html_url,
          checkedAt: Date.now()
        }));
      } else {
        console.log('✅ You are using the latest version!');
      }
    } catch (err) {
      // Silently handle update check failures (network issues, no releases, etc.)
      // Only log in development
      if (import.meta.env.DEV) {
        console.warn('Update check skipped:', err.message);
      }
    } finally {
      setChecking(false);
    }
  }, []);

  // Compare versions using a simple semantic versioning approach
  const compareVersions = (v1, v2) => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  };

  useEffect(() => {
    // Disable update checker until releases are published on GitHub
    // Uncomment when you publish first release:
    // checkForUpdates();
    // const interval = setInterval(checkForUpdates, CHECK_INTERVAL);
    // return () => clearInterval(interval);
    
    console.log('ℹ️ Update checker disabled - no releases published yet');
  }, [checkForUpdates]);

  // Check localStorage on load
  useEffect(() => {
    const savedUpdate = localStorage.getItem('streamvault_update_available');
    if (savedUpdate) {
      try {
        const update = JSON.parse(savedUpdate);
        const hoursSinceCheck = (Date.now() - update.checkedAt) / (1000 * 60 * 60);
        
        // If check was within last 24h, show notification
        if (hoursSinceCheck < 24) {
          setLatestVersion(update.version);
          setReleaseUrl(update.url);
          setUpdateAvailable(true);
        }
      } catch (e) {
        console.error('Error parsing saved update info:', e);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    // Remember that user dismissed notification (don't show until next load)
    sessionStorage.setItem('streamvault_update_dismissed', 'true');
  };

  const handleDownload = () => {
    if (releaseUrl) {
      window.open(releaseUrl, '_blank');
    }
  };

  // Don't show if dismissed or no update available
  if (dismissed || !updateAvailable || sessionStorage.getItem('streamvault_update_dismissed')) {
    return null;
  }

  return (
    <div className="update-checker">
      <div className="update-banner">
        <div className="update-icon">
          {checking ? (
            <RefreshCw size={20} className="spinning" />
          ) : error ? (
            <AlertCircle size={20} />
          ) : (
            <Download size={20} />
          )}
        </div>
        
        <div className="update-content">
          {error ? (
            <p className="update-error">
              Error checking for updates: {error}
            </p>
          ) : (
            <>
              <p className="update-title">
                🎉 New version available! <strong>v{latestVersion}</strong>
              </p>
              <p className="update-subtitle">
                Current version: v{CURRENT_VERSION}
              </p>
            </>
          )}
        </div>

        <div className="update-actions">
          {!error && (
            <button onClick={handleDownload} className="update-btn download-btn">
              <Download size={16} />
              Download
            </button>
          )}
          <button onClick={handleDismiss} className="update-btn dismiss-btn">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateChecker;
