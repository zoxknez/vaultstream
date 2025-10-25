import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCloudSync } from '../hooks/useSyncHooks';
import collectionsService from '../services/collectionsService';
import ServerSessionStatus from './ServerSessionStatus';
import useConfirmDialog from '../hooks/useConfirmDialog';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, signOut, updateUser, configured } = useAuth();
  const { sync, syncing, lastSyncTime, syncStats } = useCloudSync({ autoSync: false });
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({
    watchlistCount: 0,
    collectionsCount: 0,
    progressCount: 0
  });
  const [requestConfirm, confirmDialog] = useConfirmDialog();

  // Load user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || '');
    }
  }, [user]);

  // Load local stats and keep them fresh when collections/watchlist change
  useEffect(() => {
    const updateStats = () => {
      try {
        const snapshot = collectionsService.getStats();
        setStats({
          watchlistCount: snapshot.watchlistItems,
          collectionsCount: snapshot.totalCollections,
          progressCount: snapshot.continueWatchingItems
        });
      } catch (err) {
        console.warn('Failed to load profile statistics:', err);
      }
    };

    const eventNames = [
      'storage',
      'collections:updated',
      'watchlist:updated',
      'continueWatching:updated',
      'history:updated'
    ];

    updateStats();
    eventNames.forEach((eventName) => window.addEventListener(eventName, updateStats));

    return () => {
      eventNames.forEach((eventName) => window.removeEventListener(eventName, updateStats));
    };
  }, []);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await updateUser({ display_name: displayName });
      
      if (updateError) {
        setError(updateError);
      } else {
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const confirmed = await requestConfirm({
      title: 'Sign out',
      message: 'Are you sure you want to sign out?',
      confirmLabel: 'Sign Out',
      cancelLabel: 'Stay Logged In',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    await signOut();
    navigate('/login');
  };

  const handleManualSync = async () => {
    setError('');
    setSuccess('');
    
    await sync();
    
    setSuccess('Sync completed successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatSyncTime = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-empty">
            <div className="empty-icon">👤</div>
            <h2>Not Logged In</h2>
            <p>Please log in to view your profile.</p>
            <button 
              className="btn-login"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </button>
          </div>
        </div>
        {confirmDialog}
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Animated Background Elements */}
        <div className="profile-bg-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        {/* Header with Banner */}
        <div className="profile-header-banner">
          <div className="profile-banner-gradient"></div>
          <div className="profile-header-content">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-large">
                {displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="profile-avatar-status">✓</div>
            </div>
            <div className="profile-header-info">
              <h1 className="profile-title">{displayName || 'StreamVault User'}</h1>
              <p className="profile-subtitle">{user.email}</p>
              <div className="profile-badges">
                <span className="profile-badge">Premium Member</span>
                {configured && <span className="profile-badge badge-sync">☁️ Cloud Synced</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="profile-alert alert-error">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
            <button className="alert-close" onClick={() => setError('')}>×</button>
          </div>
        )}

        {success && (
          <div className="profile-alert alert-success">
            <span className="alert-icon">✅</span>
            <span>{success}</span>
            <button className="alert-close" onClick={() => setSuccess('')}>×</button>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="profile-content-grid">
          {/* Left Column - Profile Info */}
          <div className="profile-left-col">
            {/* Quick Stats */}
            <div className="profile-section stats-quick">
              <h2 className="section-title">
                <span className="title-icon">📊</span>
                Quick Stats
              </h2>
              <div className="stats-quick-grid">
                <div className="stat-quick-item">
                  <div className="stat-quick-icon">📚</div>
                  <div className="stat-quick-value">{stats.watchlistCount}</div>
                  <div className="stat-quick-label">Watchlist</div>
                </div>
                <div className="stat-quick-item">
                  <div className="stat-quick-icon">📺</div>
                  <div className="stat-quick-value">{stats.progressCount}</div>
                  <div className="stat-quick-label">Watching</div>
                </div>
                <div className="stat-quick-item">
                  <div className="stat-quick-icon">📁</div>
                  <div className="stat-quick-value">{stats.collectionsCount}</div>
                  <div className="stat-quick-label">Collections</div>
                </div>
              </div>
            </div>

            {/* Account Info Section */}
            <div className="profile-section">
              <h2 className="section-title">
                <span className="title-icon">👤</span>
                Account Information
              </h2>
          
              <div className="profile-info-grid">
                {/* Display Name */}
                <div className="profile-info-item">
                  <label className="profile-label">Display Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="profile-display-name"
                      name="displayName"
                      className="profile-input"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter display name"
                      disabled={saving}
                      autoComplete="name"
                    />
                  ) : (
                    <div className="profile-value">{displayName}</div>
                  )}
                </div>

                {/* Email (read-only) */}
                <div className="profile-info-item">
                  <label className="profile-label">Email Address</label>
                  <div className="profile-value">{user.email}</div>
                </div>

                {/* Account Created */}
                <div className="profile-info-item">
                  <label className="profile-label">Member Since</label>
                  <div className="profile-value">{formatDate(user.created_at)}</div>
                </div>

                {/* User ID (for debugging) */}
                <div className="profile-info-item">
                  <label className="profile-label">User ID</label>
                  <div className="profile-value profile-id">{user.id.substring(0, 8)}...</div>
                </div>
              </div>

              {/* Edit/Save Buttons */}
              <div className="profile-actions">
                {isEditing ? (
                  <>
                    <button
                      className="btn-save"
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={() => {
                        setIsEditing(false);
                        setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || '');
                        setError('');
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="btn-edit"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Cloud Sync Section */}
            {configured && (
              <div className="profile-section">
                <h2 className="section-title">
                  <span className="title-icon">☁️</span>
                  Cloud Sync
                </h2>
                
                <div className="sync-status-box">
                  <div className="sync-status-header">
                    <span className="sync-status-icon">
                      {syncing ? '🔄' : lastSyncTime ? '✅' : '⏳'}
                    </span>
                    <div>
                      <div className="sync-status-text">
                        {syncing ? 'Syncing...' : lastSyncTime ? 'Synced' : 'Not synced yet'}
                      </div>
                      <div className="sync-status-time">
                        Last sync: {formatSyncTime(lastSyncTime)}
                      </div>
                    </div>
                  </div>

                  {lastSyncTime && (
                    <div className="sync-stats-mini">
                      <div className="sync-stat-mini">
                        <span className="stat-icon">📥</span>
                        <span className="stat-label">Pulled:</span>
                        <span className="stat-value">{syncStats.watchlistPulled + syncStats.progressPulled}</span>
                      </div>
                      <div className="sync-stat-mini">
                        <span className="stat-icon">📤</span>
                        <span className="stat-label">Pushed:</span>
                        <span className="stat-value">{syncStats.watchlistPushed + syncStats.progressPushed}</span>
                      </div>
                    </div>
                  )}

                  <button
                    className="btn-sync"
                    onClick={handleManualSync}
                    disabled={syncing}
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
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions & Danger Zone */}
          <div className="profile-right-col">
            {/* Activity Timeline */}
            <div className="profile-section">
              <h2 className="section-title">
                <span className="title-icon">⚡</span>
                Quick Actions
              </h2>
              <div className="quick-actions-list">
                <button className="quick-action-btn" onClick={() => navigate('/watchlist')}>
                  <span className="quick-action-icon">📚</span>
                  <div className="quick-action-text">
                    <div className="quick-action-title">View Watchlist</div>
                    <div className="quick-action-subtitle">{stats.watchlistCount} items</div>
                  </div>
                </button>
                <button className="quick-action-btn" onClick={() => navigate('/recent')}>
                  <span className="quick-action-icon">📺</span>
                  <div className="quick-action-text">
                    <div className="quick-action-title">Continue Watching</div>
                    <div className="quick-action-subtitle">{stats.progressCount} in progress</div>
                  </div>
                </button>
                <button className="quick-action-btn" onClick={() => navigate('/collections')}>
                  <span className="quick-action-icon">📁</span>
                  <div className="quick-action-text">
                    <div className="quick-action-title">My Collections</div>
                    <div className="quick-action-subtitle">{stats.collectionsCount} collections</div>
                  </div>
                </button>
                <button className="quick-action-btn" onClick={() => navigate('/settings')}>
                  <span className="quick-action-icon">⚙️</span>
                  <div className="quick-action-text">
                    <div className="quick-action-title">Settings</div>
                    <div className="quick-action-subtitle">Preferences & more</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Backend Session */}
            <div className="profile-section">
              <h2 className="section-title">
                <span className="title-icon">🔐</span>
                Backend Session
              </h2>
              <ServerSessionStatus allowLogout={true} />
            </div>

            {/* Danger Zone */}
            <div className="profile-section danger-section">
              <h2 className="section-title">
                <span className="title-icon">⚠️</span>
                Account Actions
              </h2>
              
              <button
                className="btn-signout"
                onClick={handleSignOut}
              >
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {confirmDialog}
    </div>
  );
};

export default ProfilePage;
