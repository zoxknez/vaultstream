import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  Home, 
  Clock, 
  Settings, 
  Menu, 
  X, 
  Search, 
  User, 
  Download,
  TrendingUp,
  Clapperboard,
  Grid3x3,
  Bookmark,
  Share2,
  Activity,
  PieChart,
  Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SyncStatusIndicator from './SyncStatusIndicator';
import './Layout.css';

const Layout = () => {
  const location = useLocation();
  const { user, isGuest } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Primary navigation - Most important pages only (shown in top nav)
  const primaryNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/torrents', icon: Clapperboard, label: 'Torrents' },
    { path: '/downloads', icon: Download, label: 'Downloads' },
    { path: '/collections', icon: Grid3x3, label: 'Collections' },
    { path: '/watchlist', icon: Bookmark, label: 'Watchlist' },
    { path: '/metrics', icon: Activity, label: 'Metrics' },
    { path: '/analytics', icon: PieChart, label: 'Insights' },
    { path: '/about', icon: Info, label: 'About' }
  ];

  // All navigation items (for mobile bottom nav and menu)
  const allNavItems = [
    ...primaryNavItems,
    { path: '/share', icon: Share2, label: 'Share' },
    { path: '/recent', icon: Clock, label: 'Recent' },
    { path: '/cache', icon: TrendingUp, label: 'Cache' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="layout">
      {/* Floating Top Navigation */}
      <nav className="floating-nav">
        <div className="nav-container">
          {/* Logo */}
          <Link to="/" className="nav-logo">
            <div className="logo-icon-box">
              <Download size={22} />
            </div>
            <div className="logo-text-box">
              <div className="logo-brand">StreamVault</div>
              <div className="logo-tagline">Premium</div>
            </div>
          </Link>

          {/* Desktop Navigation Links - Primary only */}
          <div className="nav-links">
            {primaryNavItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                >
                  <IconComponent size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Section: Sync + Profile */}
          <div className="nav-actions">
            {/* Sync Status Indicator */}
            <SyncStatusIndicator />

            {/* Profile / User Section */}
            <div className="nav-profile">
              {user ? (
                <Link to="/profile" className="profile-button">
                  <div className="profile-avatar">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span>Profile</span>
                </Link>
              ) : isGuest ? (
                <Link to="/profile" className="profile-button guest-mode">
                  <User size={18} />
                  <span>Guest</span>
                  <span className="guest-badge">👤</span>
                </Link>
              ) : (
                <Link to="/profile" className="profile-button">
                  <User size={18} />
                  <span>Account</span>
                </Link>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <div className="bottom-nav-grid">
          {allNavItems.slice(0, 5).map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`bottom-nav-item ${isActive(item.path) ? 'active' : ''}`}
              >
                <IconComponent size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
