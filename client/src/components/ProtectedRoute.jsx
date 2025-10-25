import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireAuth = true }) => {
  const { user, loading, isConfigured, isGuest } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
      }}>
        <div style={{
          textAlign: 'center',
          color: '#ff0000',
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255, 0, 0, 0.3)',
            borderTopColor: '#ff0000',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ fontSize: '18px', fontWeight: 600 }}>Loading...</p>
        </div>
      </div>
    );
  }

  // If Supabase is not configured, check if user wants to use guest mode
  // If not configured and not a guest, redirect to login to choose guest access
  if (!isConfigured && requireAuth && !isGuest) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If Supabase IS configured, require actual authentication
  if (isConfigured && requireAuth && !user && !isGuest) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If auth is not required but user is logged in (e.g., login page), redirect to home
  if (!requireAuth && (user || isGuest)) {
    return <Navigate to="/" replace />;
  }

  // Allow access
  return children;
};

export default ProtectedRoute;
