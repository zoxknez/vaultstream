import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const { signIn, signInWithMagicLink, enterAsGuest, user, configured, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [guestMode, setGuestMode] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  // Check if user wants guest mode
  useEffect(() => {
    if (!configured && !loading) {
      setGuestMode(true);
    }
  }, [configured, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (useMagicLink) {
        // Send magic link
        const { error } = await signInWithMagicLink(email);
        if (error) {
          setError(error);
        } else {
          setSuccess('Magic link sent! Check your email to sign in.');
          setEmail('');
        }
      } else {
        // Regular email/password login
        const { error } = await signIn(email, password);
        if (error) {
          setError(error);
        } else {
          const from = location.state?.from?.pathname || '/';
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = () => {
    try {
      // Activate guest mode in AuthContext
      enterAsGuest();
      // Navigate to app
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Error entering guest mode:', error);
      setError('Failed to enter guest mode');
    }
  };

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Logo/Brand */}
        <div className="login-header">
          <h1 className="login-title">
            <span className="logo-icon">🎬</span>
            StreamVault
          </h1>
          <p className="login-subtitle">
            {useMagicLink ? 'Sign in with magic link' : 'Sign in to your account'}
          </p>
        </div>

        {/* Guest Mode Info */}
        {guestMode && (
          <div className="guest-mode-banner">
            <div className="guest-mode-icon">ℹ️</div>
            <div className="guest-mode-content">
              <h3>Supabase Not Configured</h3>
              <p>Cloud sync is disabled. You can still use the app with local storage.</p>
              <button 
                className="btn-guest-access"
                onClick={handleGuestAccess}
              >
                Continue as Guest
              </button>
            </div>
          </div>
        )}

        {/* Primary Guest Mode Button - Always Visible */}
        {!guestMode && (
          <button
            type="button"
            className="guest-btn-primary"
            onClick={handleGuestAccess}
          >
            <span className="guest-icon">👤</span>
            <div className="guest-btn-content">
              <span className="guest-btn-title">Try Without Account</span>
              <span className="guest-btn-subtitle">Browse and stream instantly - no registration needed</span>
            </div>
          </button>
        )}

        {/* Divider */}
        {!guestMode && (
          <div className="divider">
            <span>or</span>
          </div>
        )}

        {/* Login Form */}
        {!guestMode && (
          <form onSubmit={handleSubmit} className="login-form">
            {/* Error Message */}
            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="alert alert-success">
                <span className="alert-icon">✅</span>
                <span>{success}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            {/* Password Input (only for regular login) */}
            {!useMagicLink && (
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
            )}

            {/* Remember me & Forgot password */}
            {!useMagicLink && (
              <div className="form-row">
                <Link to="/forgot-password" className="link-forgot-password">
                  Forgot password?
                </Link>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-small"></span>
                  <span>{useMagicLink ? 'Sending...' : 'Signing in...'}</span>
                </>
              ) : (
                <span>{useMagicLink ? 'Send Magic Link' : 'Sign In'}</span>
              )}
            </button>

            {/* Divider */}
            <div className="divider">
              <span>or</span>
            </div>

            {/* Toggle Magic Link */}
            <button
              type="button"
              className="btn-magic-link"
              onClick={() => {
                setUseMagicLink(!useMagicLink);
                setPassword('');
                setError('');
                setSuccess('');
              }}
              disabled={isLoading}
            >
              {useMagicLink ? '📧 Use password instead' : '✨ Sign in with magic link'}
            </button>

            {/* Sign up link */}
            <div className="form-footer">
              <p>
                Don't have an account?{' '}
                <Link to="/register" className="link-register">
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="login-footer">
          <p className="footer-text">
            © 2025 StreamVault. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
