import React, { useEffect, useRef } from 'react';
import { 
  Play, 
  Check, 
  CheckCheck, 
  Trash2, 
  Info,
  Download,
  RotateCcw
} from 'lucide-react';
import './EpisodeContextMenu.css';

/**
 * Episode Context Menu Component
 * 
 * Right-click context menu for episode quick actions:
 * - Mark as watched / unwatched
 * - Play next episode
 * - Get episode info
 * - Download episode
 * - Reset progress
 */

const EpisodeContextMenu = ({ 
  episode, 
  position, 
  onClose,
  onMarkAsWatched,
  onMarkAsUnwatched,
  onPlayNext,
  onResetProgress,
  onDownload,
  onGetInfo,
  isWatched = false,
  hasProgress = false
}) => {
  const menuRef = useRef(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust menu position to stay within viewport
  useEffect(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Adjust horizontal position
    if (rect.right > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }

    // Adjust vertical position
    if (rect.bottom > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10;
    }

    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;
  }, [position]);

  const handleAction = (action) => {
    action?.();
    onClose();
  };

  return (
    <div 
      ref={menuRef}
      className="episode-context-menu"
      style={{ left: position.x, top: position.y }}
    >
      <div className="context-menu-header">
        <span className="context-menu-title">
          Episode {episode.episodeNumber || 'Actions'}
        </span>
      </div>

      <div className="context-menu-items">
        {/* Play Next */}
        {onPlayNext && (
          <button
            className="context-menu-item"
            onClick={() => handleAction(onPlayNext)}
          >
            <Play size={16} />
            <span>Play Now</span>
          </button>
        )}

        {/* Mark as Watched / Unwatched */}
        {isWatched ? (
          <button
            className="context-menu-item"
            onClick={() => handleAction(onMarkAsUnwatched)}
          >
            <Check size={16} />
            <span>Mark as Unwatched</span>
          </button>
        ) : (
          <button
            className="context-menu-item"
            onClick={() => handleAction(onMarkAsWatched)}
          >
            <CheckCheck size={16} />
            <span>Mark as Watched</span>
          </button>
        )}

        {/* Reset Progress */}
        {hasProgress && onResetProgress && (
          <button
            className="context-menu-item"
            onClick={() => handleAction(onResetProgress)}
          >
            <RotateCcw size={16} />
            <span>Reset Progress</span>
          </button>
        )}

        <div className="context-menu-separator" />

        {/* Download */}
        {onDownload && (
          <button
            className="context-menu-item"
            onClick={() => handleAction(onDownload)}
          >
            <Download size={16} />
            <span>Download</span>
          </button>
        )}

        {/* Get Info */}
        {onGetInfo && (
          <button
            className="context-menu-item"
            onClick={() => handleAction(onGetInfo)}
          >
            <Info size={16} />
            <span>Episode Info</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default EpisodeContextMenu;
