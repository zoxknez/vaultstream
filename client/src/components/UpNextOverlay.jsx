import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Play, X, ChevronRight } from 'lucide-react';
import './UpNextOverlay.css';

const UpNextOverlay = ({ 
  nextEpisode, 
  onPlayNext, 
  onCancel,
  countdownSeconds = 5,
  isLastEpisode = false
}) => {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (isLastEpisode || !isVisible) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onPlayNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLastEpisode, isVisible, onPlayNext]);

  const handleCancel = () => {
    setIsVisible(false);
    onCancel();
  };

  if (!isVisible) return null;

  if (isLastEpisode) {
    return (
      <div className="up-next-overlay">
        <div className="up-next-container end-of-season">
          <button onClick={handleCancel} className="up-next-close">
            <X size={24} />
          </button>
          
          <div className="up-next-content">
            <div className="up-next-icon-large">🎬</div>
            <h2 className="up-next-title">End of Season</h2>
            <p className="up-next-subtitle">You've finished all available episodes</p>
            
            <div className="up-next-actions">
              <button onClick={handleCancel} className="up-next-button primary">
                Close Player
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!nextEpisode) return null;

  return (
    <div className="up-next-overlay">
      <div className="up-next-container">
        <button onClick={handleCancel} className="up-next-close">
          <X size={24} />
        </button>
        
        <div className="up-next-content">
          <div className="up-next-header">
            <span className="up-next-label">Up Next</span>
            <span className="up-next-countdown">{countdown}s</span>
          </div>

          <div className="up-next-episode-info">
            {nextEpisode.thumbnail && (
              <div className="up-next-thumbnail">
                <img src={nextEpisode.thumbnail} alt={nextEpisode.title} />
                <div className="up-next-play-icon">
                  <Play size={32} fill="white" />
                </div>
              </div>
            )}
            
            <div className="up-next-details">
              <h3 className="up-next-episode-title">{nextEpisode.title}</h3>
              {nextEpisode.episodeNumber && (
                <p className="up-next-episode-number">
                  Episode {nextEpisode.episodeNumber}
                  {nextEpisode.seasonNumber && ` • Season ${nextEpisode.seasonNumber}`}
                </p>
              )}
              {nextEpisode.description && (
                <p className="up-next-description">{nextEpisode.description}</p>
              )}
            </div>
          </div>

          <div className="up-next-actions">
            <button onClick={handleCancel} className="up-next-button secondary">
              <X size={18} />
              Cancel
            </button>
            <button onClick={onPlayNext} className="up-next-button primary">
              <ChevronRight size={18} />
              Play Now
            </button>
          </div>

          <div className="up-next-progress">
            <div 
              className="up-next-progress-bar"
              style={{ 
                width: `${((countdownSeconds - countdown) / countdownSeconds) * 100}%`,
                transition: 'width 1s linear'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

UpNextOverlay.propTypes = {
  nextEpisode: PropTypes.shape({
    title: PropTypes.string.isRequired,
    episodeNumber: PropTypes.number,
    seasonNumber: PropTypes.number,
    thumbnail: PropTypes.string,
    description: PropTypes.string,
    fileIndex: PropTypes.number.isRequired,
    hash: PropTypes.string
  }),
  onPlayNext: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  countdownSeconds: PropTypes.number,
  isLastEpisode: PropTypes.bool
};

UpNextOverlay.defaultProps = {
  nextEpisode: null,
  countdownSeconds: 5,
  isLastEpisode: false
};

export default UpNextOverlay;
