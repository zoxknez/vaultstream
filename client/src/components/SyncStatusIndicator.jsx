import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCloudSync } from '../hooks/useSyncHooks';
import { useSyncStatusContext } from '../hooks/useSyncStatusContext';
import './SyncStatusIndicator.css';

const SyncStatusIndicator = () => {
  const { user, configured } = useAuth();
  const { analytics, flushAnalytics } = useSyncStatusContext();
  const { syncing, lastSyncTime, syncError, syncStats, sync } = useCloudSync({
    autoSync: true,
    syncInterval: 5 * 60 * 1000, // 5 minutes
    onSyncComplete: (result) => {
      console.log('✅ Sync complete:', result);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    },
    onSyncError: (error) => {
      console.error('❌ Sync error:', error);
    }
  });

  const [showDetails, setShowDetails] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [analyticsMessage, setAnalyticsMessage] = useState(null);
  const [flushingAnalytics, setFlushingAnalytics] = useState(false);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!analytics) {
      return;
    }

    const { lastError, lastFlush } = analytics;

    if (lastError) {
      setAnalyticsMessage({ type: 'error', text: lastError, timestamp: Date.now() });
    } else if (lastFlush?.count) {
      setAnalyticsMessage({
        type: 'success',
        text: `Analytics synced (${lastFlush.count})`,
        timestamp: Date.now()
      });
    }
  }, [analytics]);

  useEffect(() => {
    if (!analyticsMessage) {
      return undefined;
    }

    const timer = setTimeout(() => setAnalyticsMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [analyticsMessage]);

  // Don't show if not configured or not logged in
  if (!configured || !user) {
    return null;
  }

  // Format last sync time
  const formatSyncTime = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Determine status with descriptive tooltips
  const getStatus = () => {
    if (!isOnline) return { 
      icon: '📴', 
      text: 'Offline', 
      color: '#6b7280',
      tooltip: 'No internet connection - sync paused'
    };
    if (syncing) return { 
      icon: '🔄', 
      text: 'Syncing', 
      color: '#3b82f6',
      tooltip: 'Syncing your watchlist, progress & collections to cloud'
    };
    if (syncError) return { 
      icon: '⚠️', 
      text: 'Error', 
      color: '#ef4444',
      tooltip: 'Sync failed - click for details'
    };
    if (lastSyncTime) return { 
      icon: '✅', 
      text: 'Synced', 
      color: '#10b981',
      tooltip: `Last synced ${formatSyncTime(lastSyncTime)} - your data is safe in cloud`
    };
    return { 
      icon: '⏳', 
      text: 'Pending', 
      color: '#f59e0b',
      tooltip: 'Waiting to sync - changes will be uploaded soon'
    };
  };

  const status = getStatus();

  const handleManualSync = async () => {
    if (syncing || !isOnline) return;
    await sync();
  };

  const handleToggleDetails = (e) => {
    e.stopPropagation();
    setShowDetails(!showDetails);
  };

  const handleFlushAnalytics = async () => {
    if (flushingAnalytics) {
      return;
    }

    setFlushingAnalytics(true);
    const result = await flushAnalytics('ui_manual_flush');
    if (result.error) {
      setAnalyticsMessage({ type: 'error', text: result.error, timestamp: Date.now() });
    } else if (result.flushed > 0) {
      setAnalyticsMessage({ type: 'success', text: `Poslato ${result.flushed} događaja`, timestamp: Date.now() });
    } else if (result.skipped) {
      setAnalyticsMessage({ type: 'info', text: result.skipped === 'offline' ? 'Nema mreže – sačuvano u redu čekanja' : 'Red čekanja je prazan', timestamp: Date.now() });
    }
    setFlushingAnalytics(false);
  };

  const analyticsQueueSize = analytics?.queueSize || 0;
  const analyticsLastFlush = analytics?.lastFlush;
  const analyticsLastFlushFormatted = analyticsLastFlush?.timestamp
    ? new Date(analyticsLastFlush.timestamp).toLocaleString()
    : 'Nikad';

  return (
    <>
      {/* Sync Status Badge */}
      <div 
        className={`sync-status-indicator ${syncing ? 'syncing' : ''}`}
        onClick={handleToggleDetails}
        title={status.tooltip}
      >
        <span className="sync-icon" style={{ color: status.color }}>
          {status.icon}
        </span>
        <span className="sync-text">{status.text}</span>
        {analyticsQueueSize > 0 && (
          <span className="sync-queue-badge" title={`Analitika čeka slanje: ${analyticsQueueSize}`}>
            {analyticsQueueSize > 99 ? '99+' : analyticsQueueSize}
          </span>
        )}
        
        {/* Dropdown Arrow */}
        <span className={`sync-arrow ${showDetails ? 'open' : ''}`}>▼</span>
      </div>

      {/* Details Dropdown */}
      {showDetails && (
        <>
          <div className="sync-backdrop" onClick={() => setShowDetails(false)}></div>
          <div className="sync-details-panel">
            {/* Header */}
            <div className="sync-details-header">
              <h3>Cloud Sync Status</h3>
              <button 
                className="sync-close-btn"
                onClick={() => setShowDetails(false)}
              >
                ✕
              </button>
            </div>

            {/* Status Info */}
            <div className="sync-details-body">
              <div className="sync-info-row">
                <span className="sync-info-label">Status:</span>
                <span className="sync-info-value" style={{ color: status.color }}>
                  {status.icon} {status.text}
                </span>
              </div>

              <div className="sync-info-row">
                <span className="sync-info-label">Connection:</span>
                <span className="sync-info-value">
                  {isOnline ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>

              <div className="sync-info-row">
                <span className="sync-info-label">Last Sync:</span>
                <span className="sync-info-value">
                  {formatSyncTime(lastSyncTime)}
                </span>
              </div>

              {lastSyncTime && (
                <div className="sync-info-row">
                  <span className="sync-info-label">Timestamp:</span>
                  <span className="sync-info-value sync-timestamp">
                    {new Date(lastSyncTime).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="sync-info-row">
                <span className="sync-info-label">Analytics queue:</span>
                <span className="sync-info-value">
                  {analyticsQueueSize > 0 ? `${analyticsQueueSize} pending` : 'All events synced'}
                </span>
              </div>

              <div className="sync-info-row">
                <span className="sync-info-label">Last analytics flush:</span>
                <span className="sync-info-value">
                  {analyticsLastFlush?.count ? `${analyticsLastFlush.count} events · ${analyticsLastFlushFormatted}` : analyticsLastFlushFormatted}
                </span>
              </div>

              {/* Error Message */}
              {syncError && (
                <div className="sync-error-box">
                  <span className="sync-error-icon">⚠️</span>
                  <span className="sync-error-text">{syncError}</span>
                </div>
              )}

              {analytics?.lastError && (
                <div className="sync-error-box analytics-error">
                  <span className="sync-error-icon">📊</span>
                  <span className="sync-error-text">Analytics: {analytics.lastError}</span>
                </div>
              )}

              {/* Sync Statistics */}
              {lastSyncTime && (
                <div className="sync-stats">
                  <h4>Last Sync Results:</h4>
                  <div className="sync-stats-grid">
                    <div className="sync-stat-item">
                      <span className="sync-stat-icon">📥</span>
                      <span className="sync-stat-label">Watchlist Pulled:</span>
                      <span className="sync-stat-value">{syncStats.watchlistPulled}</span>
                    </div>
                    <div className="sync-stat-item">
                      <span className="sync-stat-icon">📤</span>
                      <span className="sync-stat-label">Watchlist Pushed:</span>
                      <span className="sync-stat-value">{syncStats.watchlistPushed}</span>
                    </div>
                    <div className="sync-stat-item">
                      <span className="sync-stat-icon">📥</span>
                      <span className="sync-stat-label">Progress Pulled:</span>
                      <span className="sync-stat-value">{syncStats.progressPulled}</span>
                    </div>
                    <div className="sync-stat-item">
                      <span className="sync-stat-icon">📤</span>
                      <span className="sync-stat-label">Progress Pushed:</span>
                      <span className="sync-stat-value">{syncStats.progressPushed}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Sync Button */}
              <button
                className="sync-manual-btn"
                onClick={handleManualSync}
                disabled={syncing || !isOnline}
              >
                {syncing ? (
                  <>
                    <span className="sync-spinner"></span>
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Sync Now</span>
                  </>
                )}
              </button>

              <button
                className="sync-analytics-btn"
                onClick={handleFlushAnalytics}
                disabled={flushingAnalytics}
                type="button"
              >
                {flushingAnalytics ? 'Slanje...' : '📊 Pošalji analitiku'}
              </button>

              {/* Info Text */}
              <p className="sync-info-text">
                Auto-sync runs every 5 minutes when online. Data is synced across all your devices.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Success Toast */}
      {showToast && (
        <div className="sync-toast">
          <span className="sync-toast-icon">✅</span>
          <span className="sync-toast-text">Sync completed successfully!</span>
        </div>
      )}

      {analyticsMessage && (
        <div className={`sync-toast analytics ${analyticsMessage.type}`}>
          <span className="sync-toast-icon">📊</span>
          <span className="sync-toast-text">{analyticsMessage.text}</span>
        </div>
      )}
    </>
  );
};

export default SyncStatusIndicator;
