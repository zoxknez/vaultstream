import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Video,
  Download,
  Database,
  Shield,
  LogOut,
  Trash2,
  CheckCircle2,
  PlayCircle,
  Timer,
  ListVideo,
  Moon,
  Bell,
  Globe,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import progressService from '../services/progressService';
import Footer from './Footer';
import './SettingsPage.css';
import { config } from '../config/environment';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import ApiError from '../utils/ApiError';
import { markServerSessionInvalid } from '../services/serverAuthService';
import { useServerSession } from '../contexts/ServerSessionContext.jsx';
import ServerSessionStatus from './ServerSessionStatus';
import { useToast } from './Toast';
import { clearAllTorrents } from '../services/api';
import useConfirmDialog from '../hooks/useConfirmDialog';

const SettingsPage = () => {
  const { signOut } = useAuth();
  const { session } = useServerSession();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('playback');
  const [settings, setSettings] = useState({
    downloadPath: '/tmp/seedbox-downloads',
    maxConnections: 50,
    autoStartDownload: true,
    preserveSubtitles: true,
    defaultQuality: '1080p',
    autoResume: true,
    bufferSize: 50,
    theme: 'dark',
    notifications: true,
    language: 'en'
  });
  const [authError, setAuthError] = useState(null);
  const [requestConfirm, confirmDialog] = useConfirmDialog();

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (session.authenticated) {
      setAuthError(null);
    }
  }, [session.authenticated]);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('seedbox-settings');
      if (saved) {
        setSettings(prevSettings => ({ ...prevSettings, ...JSON.parse(saved) }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = (newSettings) => {
    try {
      localStorage.setItem('seedbox-settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const handleUnauthorized = useCallback((message) => {
    const resolved = message || 'Potrebna je administratorska prijava.';
    markServerSessionInvalid();
    setAuthError(resolved);
    toast.error(resolved);
  }, [toast]);

  const clearProgressData = async () => {
    const confirmed = await requestConfirm({
      title: 'Brisanje napretka',
      message: 'Obrisati sve podatke o praćenju gledanja? Ova akcija se ne može opozvati.',
      confirmLabel: 'Obriši napredak',
      cancelLabel: 'Otkaži',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    progressService.clearAll();
    toast.success('Svi podaci o napretku su obrisani.');
  };

  const clearAllData = async () => {
    const confirmed = await requestConfirm({
      title: 'Brisanje aplikacije',
      message: 'Obrisati SVE podatke aplikacije? Ovo će poništiti sva podešavanja i ne može se opozvati.',
      confirmLabel: 'Obriši sve',
      cancelLabel: 'Otkaži',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    localStorage.clear();
    sessionStorage.clear();
    progressService.clearAll();
    toast.success('Svi podaci aplikacije su obrisani. Ponovno učitavanje u toku...');
    setTimeout(() => window.location.reload(), 1200);
  };

  const clearWebTorrentCache = async () => {
    if (!session.authenticated) {
      toast.error('Potrebna je administratorska prijava za brisanje keša.');
      return;
    }

    const confirmed = await requestConfirm({
      title: 'Brisanje WebTorrent keša',
      message: 'Obrisati WebTorrent keš? Aktivni torenti će biti zaustavljeni.',
      confirmLabel: 'Obriši keš',
      cancelLabel: 'Otkaži',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    try {
      await fetchWithTimeout(
        config.getApiUrl('/api/cache/clear'),
        {
          method: 'POST',
          withCsrf: true
        },
        7000
      );

      await clearAllTorrents();
      setAuthError(null);
      toast.success('WebTorrent keš je uspešno obrisan.');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        handleUnauthorized('Sesija je istekla. Prijavi se ponovo da bi brisao keš.');
      } else {
        console.error('Error clearing cache:', error);
        toast.error('Brisanje keša nije uspelo.');
      }
    }
  };

  const handleLogout = async () => {
    const confirmed = await requestConfirm({
      title: 'Odjava',
      message: 'Odjaviti se sa StreamVault naloga?',
      confirmLabel: 'Odjavi se',
      cancelLabel: 'Otkaži',
      danger: true
    });

    if (!confirmed) {
      return;
    }

    signOut();
  };

  const tabs = [
    { id: 'playback', label: 'Playback', icon: Video },
    { id: 'download', label: 'Download', icon: Download },
    { id: 'storage', label: 'Storage', icon: Database },
    { id: 'appearance', label: 'Appearance', icon: Moon },
    { id: 'account', label: 'Account', icon: Shield }
  ];

  if (!session.authenticated) {
    return (
      <div className="settings-page">
        <div className="settings-content">
          <ServerSessionStatus />
          <div className="settings-guard">
            <ServerSessionStatus.Alert />
            {authError && <div className="settings-alert">{authError}</div>}
          </div>
        </div>
        <Footer />
        {confirmDialog}
        {confirmDialog}
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-content">
        <ServerSessionStatus compact />
        {/* Hero Header */}
        <div className="settings-hero">
          <div className="settings-header">
            <div className="settings-icon-box">
              <SettingsIcon size={28} />
            </div>
            <div className="settings-title-box">
              <h1>Settings</h1>
              <p>Configure your StreamVault experience</p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="settings-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Panel - Playback */}
        {activeTab === 'playback' && (
          <div className="settings-panel">
            <div className="panel-header">
              <h2>Playback Settings</h2>
              <p>Configure video playback behavior and quality preferences</p>
            </div>
            
            <div className="settings-grid">
              <div className="setting-card">
                <div className="setting-info">
                  <p className="setting-label">Auto Resume</p>
                  <p className="setting-description">Continue where you left off</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.autoResume}
                    onChange={(e) => handleSettingChange('autoResume', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-card">
                <div className="setting-info">
                  <p className="setting-label">Preserve Subtitles</p>
                  <p className="setting-description">Remember subtitle preferences</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.preserveSubtitles}
                    onChange={(e) => handleSettingChange('preserveSubtitles', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-card">
                <div className="setting-info">
                  <p className="setting-label">Default Quality</p>
                  <p className="setting-description">Preferred video resolution</p>
                </div>
                <select
                  className="setting-select"
                  value={settings.defaultQuality}
                  onChange={(e) => handleSettingChange('defaultQuality', e.target.value)}
                >
                  <option value="480p">480p</option>
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                  <option value="1440p">1440p</option>
                  <option value="2160p">4K (2160p)</option>
                </select>
              </div>

              <div className="setting-card">
                <div className="setting-info">
                  <p className="setting-label">Buffer Size</p>
                  <p className="setting-description">Video buffering in seconds</p>
                </div>
                <div className="setting-range">
                  <input
                    type="range"
                    min="10"
                    max="120"
                    step="10"
                    value={settings.bufferSize}
                    onChange={(e) => handleSettingChange('bufferSize', parseInt(e.target.value))}
                    className="range-slider"
                  />
                  <span className="range-value">{settings.bufferSize}s</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Panel - Download */}
        {activeTab === 'download' && (
          <div className="settings-panel">
            <div className="panel-header">
              <h2>Download Settings</h2>
              <p>Manage torrent downloads and connection parameters</p>
            </div>
            
            <div className="settings-grid">
              <div className="setting-card">
                <div className="setting-info">
                  <p className="setting-label">Auto Start Download</p>
                  <p className="setting-description">Begin downloading immediately</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.autoStartDownload}
                    onChange={(e) => handleSettingChange('autoStartDownload', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-card">
                <div className="setting-info">
                  <p className="setting-label">Max Connections</p>
                  <p className="setting-description">Maximum peer connections</p>
                </div>
                <div className="setting-range">
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={settings.maxConnections}
                    onChange={(e) => handleSettingChange('maxConnections', parseInt(e.target.value))}
                    className="range-slider"
                  />
                  <span className="range-value">{settings.maxConnections}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Panel - Storage */}
        {activeTab === 'storage' && (
          <div className="settings-panel">
            <div className="panel-header">
              <h2>Storage Management</h2>
              <p>Clear cached data and manage storage</p>
            </div>
            
            <div className="action-buttons">
              <button className="action-button" onClick={clearWebTorrentCache}>
                <div className="action-icon">
                  <Database size={22} />
                </div>
                <div className="action-text">
                  <h3>Clear Torrent Cache</h3>
                  <p>Remove all cached torrent data</p>
                </div>
              </button>

              <button className="action-button danger" onClick={clearProgressData}>
                <div className="action-icon">
                  <Trash2 size={22} />
                </div>
                <div className="action-text">
                  <h3>Clear Watch Progress</h3>
                  <p>Delete all playback history</p>
                </div>
              </button>

              <button className="action-button danger" onClick={clearAllData}>
                <div className="action-icon">
                  <Trash2 size={22} />
                </div>
                <div className="action-text">
                  <h3>Clear All Data</h3>
                  <p>Reset application to defaults</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Settings Panel - Appearance */}
        {activeTab === 'appearance' && (
          <div className="settings-panel">
            <div className="panel-header">
              <h2>Appearance Settings</h2>
              <p>Customize the look and feel of StreamVault</p>
            </div>
            
            <div className="settings-grid">
              <div className="setting-card">
                <div className="setting-info">
                  <p className="setting-label">Theme</p>
                  <p className="setting-description">Application color scheme</p>
                </div>
                <select
                  className="setting-select"
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div className="setting-card">
                <div className="setting-info">
                  <p className="setting-label">Notifications</p>
                  <p className="setting-description">Show system notifications</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-card">
                <div className="setting-info">
                  <p className="setting-label">Language</p>
                  <p className="setting-description">Interface language</p>
                </div>
                <select
                  className="setting-select"
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="sr">Српски</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Settings Panel - Account */}
        {activeTab === 'account' && (
          <div className="settings-panel">
            <div className="panel-header">
              <h2>Account & Security</h2>
              <p>Manage your account and security settings</p>
            </div>
            
            <div className="action-buttons">
              <button className="action-button danger" onClick={handleLogout}>
                <div className="action-icon">
                  <LogOut size={22} />
                </div>
                <div className="action-text">
                  <h3>Logout</h3>
                  <p>Sign out from StreamVault</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default SettingsPage;
