import React from 'react';
import ApiError from '../utils/ApiError';
import copyToClipboard from '../utils/copyToClipboard';
import { extractRequestId } from '../utils/errorUtils';

/**
 * Error boundary component to catch and handle React errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      copiedRequestId: false
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      errorInfo: errorInfo
    });
  }

  async copyRequestId(requestId) {
    if (!requestId) return;
    const copied = await copyToClipboard(requestId);
    if (copied) {
      this.setState({ copiedRequestId: true });
      setTimeout(() => this.setState({ copiedRequestId: false }), 2000);
    }
  }

  render() {
    if (this.state.hasError) {
      const requestId = extractRequestId(this.state.error);
      const errorMessage = (() => {
        if (this.state.error instanceof ApiError && typeof this.state.error.message === 'string') {
          return this.state.error.message.replace(/\s*\(Request ID:.*\)\s*$/, '').trim();
        }
        return this.state.error?.message || 'An unknown error occurred';
      })();

      return (
        <div className="error-boundary">
          <div className="error-container">
            <h2>Something went wrong</h2>
            <p>{errorMessage}</p>
            {requestId && (
              <div
                className="error-support"
                style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}
              >
                <p className="error-support-text" style={{ margin: 0 }}>
                  Reference ID for support: <strong>{requestId}</strong>
                </p>
                <button
                  type="button"
                  className="retry-button"
                  onClick={() => this.copyRequestId(requestId)}
                  aria-label="Copy request identifier"
                >
                  {this.state.copiedRequestId ? 'Copied!' : 'Copy ID'}
                </button>
              </div>
            )}
            <div className="error-actions">
              <button 
                className="retry-button"
                onClick={() => {
                  // Reset the error state
                  this.setState({ 
                    hasError: false, 
                    error: null, 
                    errorInfo: null,
                    copiedRequestId: false
                  });
                  
                  // If there's a retry callback, call it
                  if (this.props.onRetry && typeof this.props.onRetry === 'function') {
                    this.props.onRetry();
                  }
                }}
              >
                Try Again
              </button>
              
              {this.props.showReload && (
                <button 
                  className="reload-button"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
              )}
            </div>
            
            {this.props.debug && this.state.errorInfo && (
              <details className="error-details">
                <summary>Error Details</summary>
                <pre>{this.state.error?.toString()}</pre>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
