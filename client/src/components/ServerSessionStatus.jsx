import React, { useState } from 'react';
import { Lock, Unlock, KeyRound, ShieldAlert } from 'lucide-react';
import { useServerSession } from '../contexts/ServerSessionContext.jsx';
import './ServerSessionStatus.css';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const ServerSessionStatus = ({ allowLogout = true, compact = false }) => {
  const { session, login, logout, loading, error, resetError } = useServerSession();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!password.trim()) {
      setFeedback('Password required');
      return;
    }

    try {
      const result = await login(password.trim());
      setFeedback(result?.message || 'Authenticated successfully');
      setPassword('');
      resetError();
    } catch (err) {
      setFeedback(err?.message || 'Authentication failed');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setFeedback('Session cleared');
    } catch (err) {
      setFeedback(err?.message || 'Logout failed');
    }
  };

  const renderAuthenticated = () => (
    <div className={`server-session-card ${compact ? 'server-session-card--compact' : ''}`}>
      <div className="server-session-header success">
        <Unlock size={20} />
        <div>
          <h3>Backend session active</h3>
          <p>Established at {formatTimestamp(session.lastAuthenticatedAt)}</p>
        </div>
      </div>
      {allowLogout && (
        <div className="server-session-actions">
          <button
            type="button"
            className="server-session-button outline"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
      {feedback && (
        <div className="server-session-feedback muted">
          {feedback}
        </div>
      )}
    </div>
  );

  const renderForm = () => (
    <form className={`server-session-card ${compact ? 'server-session-card--compact' : ''}`} onSubmit={handleLogin}>
      <div className="server-session-header warning">
        <Lock size={20} />
        <div>
          <h3>Secure backend login</h3>
          <p>Enter the server access password to unlock administrative endpoints.</p>
        </div>
      </div>

      <label className="server-session-field">
        <span>Password</span>
        <div className="server-session-input-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            disabled={loading}
            onChange={(event) => {
              setPassword(event.target.value);
              if (feedback) setFeedback('');
              if (error) resetError();
            }}
            placeholder="••••••••"
          />
          <button
            type="button"
            className="server-session-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <KeyRound size={16} />
          </button>
        </div>
      </label>

      {(error || feedback) && (
        <div className={`server-session-feedback ${error ? 'error' : ''}`}>
          {error || feedback}
        </div>
      )}

      <div className="server-session-actions">
        <button
          type="submit"
          className="server-session-button"
          disabled={loading}
        >
          {loading ? 'Authenticating…' : 'Unlock backend'}
        </button>
      </div>
    </form>
  );

  return session.authenticated ? renderAuthenticated() : renderForm();
};

const ServerSessionAlert = () => (
  <div className="server-session-inline-alert">
    <ShieldAlert size={18} />
    <div>
      <strong>Admin access required</strong>
      <p>Authenticate with the backend password to view protected metrics and manage cache and download operations.</p>
    </div>
  </div>
);

ServerSessionStatus.Alert = ServerSessionAlert;

export default ServerSessionStatus;
