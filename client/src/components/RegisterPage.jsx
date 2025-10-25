import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './RegisterPage.css';

const RegisterPage = () => {
  const { signUp, user, configured, loading } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '' });
  const password = formData.password;

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  // Redirect if Supabase not configured
  useEffect(() => {
    if (!configured && !loading) {
      navigate('/login', { replace: true });
    }
  }, [configured, loading, navigate]);

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, text: '', color: '' });
      return;
    }

    let score = 0;
    let text = '';
    let color = '';

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Complexity checks
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    // Determine strength
    if (score <= 2) {
      text = 'Weak';
      color = '#ef4444';
    } else if (score <= 3) {
      text = 'Fair';
      color = '#f59e0b';
    } else if (score <= 4) {
      text = 'Good';
      color = '#10b981';
    } else {
      text = 'Strong';
      color = '#22c55e';
    }

    setPasswordStrength({ score, text, color });
  }, [password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateForm = () => {
    const { email, password, confirmPassword, displayName } = formData;

    if (!email || !password || !confirmPassword) {
      return 'All fields are required';
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return 'Please enter a valid email address';
    }

    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }

    if (displayName && displayName.length < 2) {
      return 'Display name must be at least 2 characters';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const metadata = formData.displayName ? { display_name: formData.displayName } : {};
      const { error } = await signUp(formData.email, formData.password, metadata);
      
      if (error) {
        setError(error);
      } else {
        setSuccess('Account created! Check your email to verify your account.');
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          displayName: ''
        });
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="register-page">
        <div className="register-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-container">
        {/* Logo/Brand */}
        <div className="register-header">
          <h1 className="register-title">
            <span className="logo-icon">🎬</span>
            StreamVault
          </h1>
          <p className="register-subtitle">
            Create your account to sync across devices
          </p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="register-form">
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

          {/* Display Name Input */}
          <div className="form-group">
            <label htmlFor="displayName" className="form-label">
              Display Name <span className="optional">(optional)</span>
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              className="form-input"
              placeholder="John Doe"
              value={formData.displayName}
              onChange={handleChange}
              disabled={isLoading}
              autoComplete="name"
            />
          </div>

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
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          {/* Password Input */}
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
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
                autoComplete="new-password"
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
            
            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="password-strength">
                <div className="password-strength-bar">
                  <div 
                    className="password-strength-fill"
                    style={{ 
                      width: `${(passwordStrength.score / 5) * 100}%`,
                      backgroundColor: passwordStrength.color
                    }}
                  ></div>
                </div>
                <span 
                  className="password-strength-text"
                  style={{ color: passwordStrength.color }}
                >
                  {passwordStrength.text}
                </span>
              </div>
            )}
            
            <p className="form-hint">
              Minimum 8 characters. Use letters, numbers, and symbols for a stronger password.
            </p>
          </div>

          {/* Confirm Password Input */}
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                className="form-input"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            
            {/* Password Match Indicator */}
            {formData.confirmPassword && (
              <p 
                className={`password-match ${
                  formData.password === formData.confirmPassword ? 'match' : 'no-match'
                }`}
              >
                {formData.password === formData.confirmPassword ? (
                  <>✓ Passwords match</>
                ) : (
                  <>✗ Passwords do not match</>
                )}
              </p>
            )}
          </div>

          {/* Terms */}
          <p className="terms-text">
            By signing up, you agree to our{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>.
          </p>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-small"></span>
                <span>Creating account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>

          {/* Sign in link */}
          <div className="form-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="link-login">
                Sign in
              </Link>
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="register-footer">
          <p className="footer-text">
            © 2025 StreamVault. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
