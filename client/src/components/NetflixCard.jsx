/**
 * 🎬 NETFLIX CARD COMPONENT - ENHANCED
 * Features:
 * - Hover expansion with more details
 * - Beautiful rating badges
 * - Genre tags
 * - Better placeholder
 */

import { Film, Info, Play, Plus } from 'lucide-react';
import { memo } from 'react';
import { useLazyImage } from '../hooks/useIntersectionObserver';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Genre mapping (TMDB genre IDs)
const GENRE_MAP = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

const NetflixCard = memo(function NetflixCard({ item, onPlay }) {
  const posterPath = item.poster_path || item.backdrop_path;
  const imageSrc = posterPath ? `${TMDB_IMAGE_BASE}/w500${posterPath}` : null;

  const [ref, loadedSrc] = useLazyImage(imageSrc, null);

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (onPlay) {
      onPlay(item);
    }
  };

  const handleInfoClick = (e) => {
    e.stopPropagation();
    // TODO: Open detail modal
    console.log('Show info for:', item.title || item.name);
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    // TODO: Add to watchlist
    console.log('Add to list:', item.title || item.name);
  };

  // Get first 2 genres
  const genres =
    item.genre_ids
      ?.slice(0, 2)
      .map((id) => GENRE_MAP[id])
      .filter(Boolean) || [];

  return (
    <div className="netflix-card" ref={ref}>
      <div className="netflix-card-image">
        {loadedSrc ? (
          <img src={loadedSrc} alt={item.title || item.name} loading="lazy" />
        ) : (
          <div className="netflix-card-placeholder">
            <Film size={48} className="placeholder-icon" />
            <span className="placeholder-text">{item.title || item.name}</span>
          </div>
        )}
      </div>

      {/* Title outside overlay - always visible */}
      <div className="netflix-card-title-wrapper">
        <h3 className="netflix-card-title-main">{item.title || item.name}</h3>
      </div>

      <div className="netflix-card-overlay">
        <div className="netflix-card-info">
          {/* Meta info - Rating & Year */}
          <div className="netflix-card-meta">
            {item.vote_average > 0 && (
              <span className="netflix-card-rating">
                <span className="rating-icon">★</span>
                <span className="rating-value">{item.vote_average.toFixed(1)}</span>
              </span>
            )}
            {item.release_date && (
              <span className="netflix-card-year">{new Date(item.release_date).getFullYear()}</span>
            )}
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="netflix-card-genres">
              {genres.map((genre, idx) => (
                <span key={idx} className="genre-tag">
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Overview (truncated) */}
          {item.overview && (
            <p className="netflix-card-overview">
              {item.overview.length > 100 ? `${item.overview.substring(0, 100)}...` : item.overview}
            </p>
          )}

          {/* Actions */}
          <div className="netflix-card-actions">
            <button
              className="netflix-btn netflix-btn-icon netflix-btn-play"
              onClick={handlePlayClick}
              title="Search & Play"
            >
              <Play size={16} fill="currentColor" />
            </button>
            <button
              className="netflix-btn netflix-btn-icon"
              onClick={handleAddClick}
              title="Add to Watchlist"
            >
              <Plus size={16} />
            </button>
            <button
              className="netflix-btn netflix-btn-icon"
              onClick={handleInfoClick}
              title="More Info"
            >
              <Info size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default NetflixCard;
