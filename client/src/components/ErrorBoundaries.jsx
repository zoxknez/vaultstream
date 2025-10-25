import React from 'react';
import { error as logError } from '../services/loggingService';

/**
 * Root Error Boundary - Catches critical application-wide errors
 */
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to logging service
    logError('Critical application error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState({
      error,
      errorInfo
    });

    // Send to error tracking service (Sentry, etc.)
    if (typeof window !== 'undefined' && window.__STREAMVAULT_ERROR_TRACKER__) {
      window.__STREAMVAULT_ERROR_TRACKER__(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Reload the page as a last resort
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              background: 'white',
              borderRadius: '12px',
              padding: '40px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>😕</div>
            <h1
              style={{
                fontSize: '28px',
                marginBottom: '16px',
                color: '#1a202c'
              }}
            >
              Oops! Something went wrong
            </h1>
            <p
              style={{
                fontSize: '16px',
                color: '#4a5568',
                marginBottom: '24px',
                lineHeight: '1.6'
              }}
            >
              We're sorry for the inconvenience. The application encountered an unexpected error.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details
                style={{
                  background: '#f7fafc',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  textAlign: 'left'
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: '#2d3748',
                    marginBottom: '8px'
                  }}
                >
                  Error Details (Development Only)
                </summary>
                <pre
                  style={{
                    fontSize: '12px',
                    overflow: 'auto',
                    color: '#c53030',
                    marginTop: '8px'
                  }}
                >
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => (e.target.style.background = '#5568d3')}
                onMouseLeave={(e) => (e.target.style.background = '#667eea')}
              >
                Reload Application
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                style={{
                  background: 'transparent',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f7fafc';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Route Error Boundary - Catches errors within specific routes
 */
class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logError('Route error', {
      route: window.location.pathname,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState({ error });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            maxWidth: '500px',
            margin: '60px auto'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2
            style={{
              fontSize: '24px',
              marginBottom: '12px',
              color: '#1a202c'
            }}
          >
            This page encountered an error
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: '#718096',
              marginBottom: '24px'
            }}
          >
            {import.meta.env.DEV && this.state.error
              ? this.state.error.message
              : 'Please try again or go back to the home page.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={this.handleRetry}
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.history.back()}
              style={{
                background: 'transparent',
                color: '#667eea',
                border: '1px solid #667eea',
                borderRadius: '6px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Component Error Boundary - Catches errors in optional features
 */
class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const { componentName } = this.props;

    logError(`Component error: ${componentName || 'Unknown'}`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      const { fallback, componentName } = this.props;

      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback
      return (
        <div
          style={{
            padding: '20px',
            background: '#fff5f5',
            border: '1px solid #feb2b2',
            borderRadius: '6px',
            color: '#c53030'
          }}
        >
          <p style={{ margin: 0, fontSize: '14px' }}>
            ⚠️ {componentName || 'This component'} failed to load
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ComponentErrorBoundary, RootErrorBoundary, RouteErrorBoundary };
export default RootErrorBoundary;
