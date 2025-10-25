/**
 * StreamVault Layout with Navigation
 * Clean, minimal layout with main navigation
 */

import Navigation from './Navigation';

const UltimateLayout = ({ children }) => {
  return (
    <div className="netflix-app">
      <Navigation />

      <main className="netflix-main">{children}</main>

      <footer className="netflix-footer">
        <div className="netflix-footer-content">
          <p className="netflix-footer-text">© 2024 StreamVault. Your personal streaming vault.</p>
        </div>
      </footer>
    </div>
  );
};

export default UltimateLayout;
