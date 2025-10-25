/**
 * 🧭 NAVIGATION COMPONENT - ACCESSIBLE
 * React 19 + WCAG 2.1 AA compliant
 * Features:
 * - Full keyboard navigation (Arrow keys, Tab, Enter, Escape)
 * - ARIA labels and roles
 * - Focus management
 * - Screen reader support
 */

import { Bell, ChevronDown, Menu, Search, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useFocusTrap from '../hooks/useFocusTrap';
import useKeyboardNav from '../hooks/useKeyboardNav';

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Refs for focus management
  const searchInputRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // ✅ Keyboard navigation for main menu
  const mainMenuNav = useKeyboardNav({
    enabled: !searchActive && !mobileMenuOpen,
    orientation: 'horizontal',
    loop: true
  });

  // ✅ Focus trap for profile dropdown
  const profileTrapRef = useFocusTrap(profileDropdownOpen, {
    returnFocus: true,
    allowOutsideClick: true
  });

  // ✅ Focus trap for mobile menu
  const mobileTrapRef = useFocusTrap(mobileMenuOpen, {
    returnFocus: true
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { name: 'Home', path: '/' },
    { name: 'Torrents', path: '/torrents' },
    { name: 'Downloads', path: '/downloads' },
    { name: 'Collections', path: '/collections' },
    { name: 'Watchlist', path: '/watchlist' }
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // ✅ Use React Router instead of window.location
      navigate(`/torrents?search=${encodeURIComponent(searchQuery)}`);
      setSearchActive(false);
      setSearchQuery('');
    }
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen((prev) => !prev);
  };

  const closeProfileDropdown = () => {
    setProfileDropdownOpen(false);
  };

  // ✅ Focus search input when activated
  useEffect(() => {
    if (searchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchActive]);

  // ✅ Close dropdown on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (profileDropdownOpen) {
          closeProfileDropdown();
        }
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
        if (searchActive) {
          setSearchActive(false);
          setSearchQuery('');
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [profileDropdownOpen, mobileMenuOpen, searchActive]);

  // ✅ Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        profileDropdownOpen &&
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(e.target)
      ) {
        closeProfileDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen]);

  return (
    <>
      <header
        className={`netflix-header ${scrolled ? 'netflix-header-scrolled' : ''}`}
        role="banner"
      >
        <nav className="netflix-nav" aria-label="Main navigation" role="navigation">
          {/* Left Side - Logo & Navigation */}
          <div className="netflix-nav-left">
            <Link to="/" className="netflix-logo" aria-label="StreamVault Home">
              <span className="netflix-logo-text" aria-hidden="true">
                STREAMVAULT
              </span>
            </Link>

            <ul
              className="netflix-nav-menu"
              ref={mainMenuNav.ref}
              role="menubar"
              aria-label="Primary navigation"
            >
              {navigation.map((item) => (
                <li key={item.path} className="netflix-nav-item" role="none">
                  <Link
                    to={item.path}
                    className={`netflix-nav-link ${
                      location.pathname === item.path ? 'active' : ''
                    }`}
                    role="menuitem"
                    aria-current={location.pathname === item.path ? 'page' : undefined}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Side - Search, Notifications, Profile */}
          <div className="netflix-nav-right">
            {/* Search */}
            <div className={`netflix-search ${searchActive ? 'active' : ''}`} role="search">
              <button
                className="netflix-search-btn"
                onClick={() => setSearchActive(!searchActive)}
                aria-label={searchActive ? 'Close search' : 'Open search'}
                aria-expanded={searchActive}
                aria-controls="search-input"
              >
                {searchActive ? <X size={18} /> : <Search size={18} />}
              </button>
              <form onSubmit={handleSearchSubmit}>
                <input
                  ref={searchInputRef}
                  id="search-input"
                  type="search"
                  className="netflix-search-input"
                  placeholder="Titles, torrents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => {
                    if (!searchQuery) {
                      setTimeout(() => setSearchActive(false), 200);
                    }
                  }}
                  aria-label="Search for titles and torrents"
                  role="searchbox"
                />
              </form>
            </div>

            {/* Notifications */}
            <div className="netflix-notifications">
              <Link
                to="/analytics"
                className="netflix-notification-icon"
                aria-label="View analytics and notifications"
              >
                <Bell size={20} aria-hidden="true" />
              </Link>
            </div>

            {/* Profile Dropdown */}
            <div className="netflix-profile" ref={profileDropdownRef}>
              <button
                className="netflix-profile-button"
                onClick={toggleProfileDropdown}
                aria-label="User menu"
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
                aria-controls="profile-dropdown"
              >
                <div className="netflix-profile-avatar">
                  <User size={20} aria-hidden="true" />
                </div>
                <ChevronDown size={16} className="netflix-profile-arrow" aria-hidden="true" />
              </button>

              {profileDropdownOpen && (
                <div
                  id="profile-dropdown"
                  className="netflix-profile-dropdown"
                  ref={profileTrapRef}
                  role="menu"
                  aria-label="User menu options"
                >
                  <Link
                    to="/watchlist"
                    className="netflix-profile-item"
                    role="menuitem"
                    onClick={closeProfileDropdown}
                  >
                    <span>Watchlist</span>
                  </Link>
                  <Link
                    to="/collections"
                    className="netflix-profile-item"
                    role="menuitem"
                    onClick={closeProfileDropdown}
                  >
                    <span>Collections</span>
                  </Link>
                  <div className="netflix-profile-divider" role="separator" />
                  <Link
                    to="/analytics"
                    className="netflix-profile-item"
                    role="menuitem"
                    onClick={closeProfileDropdown}
                  >
                    <span>Analytics</span>
                  </Link>
                  <Link
                    to="/metrics"
                    className="netflix-profile-item"
                    role="menuitem"
                    onClick={closeProfileDropdown}
                  >
                    <span>Metrics</span>
                  </Link>
                  <Link
                    to="/cache"
                    className="netflix-profile-item"
                    role="menuitem"
                    onClick={closeProfileDropdown}
                  >
                    <span>Cache</span>
                  </Link>
                  <div className="netflix-profile-divider" role="separator" />
                  <Link
                    to="/about"
                    className="netflix-profile-item"
                    role="menuitem"
                    onClick={closeProfileDropdown}
                  >
                    <span>About</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="netflix-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? (
                <X size={24} aria-hidden="true" />
              ) : (
                <Menu size={24} aria-hidden="true" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className={`netflix-mobile-menu ${mobileMenuOpen ? 'active' : ''}`}
          ref={mobileTrapRef}
          role="dialog"
          aria-label="Mobile navigation menu"
          aria-modal="true"
        >
          <nav
            className="netflix-mobile-menu-items"
            ref={mobileMenuRef}
            role="menu"
            aria-label="Mobile menu options"
          >
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`netflix-mobile-menu-link ${
                  location.pathname === item.path ? 'active' : ''
                }`}
                onClick={() => setMobileMenuOpen(false)}
                role="menuitem"
                aria-current={location.pathname === item.path ? 'page' : undefined}
              >
                {item.name}
              </Link>
            ))}
            <div className="netflix-profile-divider" role="separator" />
            <Link
              to="/analytics"
              className="netflix-mobile-menu-link"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Analytics
            </Link>
            <Link
              to="/metrics"
              className="netflix-mobile-menu-link"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Metrics
            </Link>
            <Link
              to="/cache"
              className="netflix-mobile-menu-link"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Cache
            </Link>
            <Link
              to="/about"
              className="netflix-mobile-menu-link"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              About
            </Link>
          </nav>
        </div>
      )}

      {/* Spacer to prevent content from hiding under fixed header */}
      <div style={{ height: '68px' }} />
    </>
  );
};

export default Navigation;
