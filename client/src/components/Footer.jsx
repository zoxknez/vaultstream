import React from 'react';
import { Heart, Zap } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="footer-logo">
            <Zap size={20} />
          </div>
          <span className="footer-brand-text">StreamVault</span>
        </div>
        
        <div className="footer-info">
          <span>© 2025 StreamVault. Premium torrent streaming.</span>
        </div>

        <div className="footer-love">
          <span>Made with</span>
          <Heart size={14} className="heart-icon" />
          <span>for streaming</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
