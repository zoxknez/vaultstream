import React, { useState, useEffect } from 'react';
import { Star, Clock, Calendar, Users, Film, Tv, Play, X } from 'lucide-react';
import tmdbService from '../services/tmdbService';
import './TMDBCard.css';

const TMDBCard = ({ 
  torrentTitle, 
  compact = false,
  onPlay = null,
  className = ''
}) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!torrentTitle) {
      setLoading(false);
      return;
    }

    const fetchMetadata = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await tmdbService.searchContent(torrentTitle);
        if (data) {
          const formatted = tmdbService.formatForDisplay(data);
          setMetadata(formatted);
        } else {
          setError('Metadata not found');
        }
      } catch (err) {
        console.error('TMDB fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [torrentTitle]);

  if (loading) {
    return (
      <div className={`tmdb-card skeleton ${compact ? 'compact' : ''} ${className}`}>
        <div className="skeleton-poster"></div>
        <div className="skeleton-content">
          <div className="skeleton-title"></div>
          <div className="skeleton-text"></div>
          <div className="skeleton-text short"></div>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return null; // Gracefully hide if no metadata
  }

  if (compact) {
    return (
      <div className={`tmdb-card compact ${className}`}>
        {metadata.posterSmall && (
          <img 
            src={metadata.posterSmall} 
            alt={metadata.title}
            className="tmdb-poster-small"
            loading="lazy"
          />
        )}
        <div className="tmdb-compact-info">
          <div className="tmdb-title-row">
            {metadata.type === 'tv' ? <Tv size={16} /> : <Film size={16} />}
            <h4 className="tmdb-title">{metadata.title}</h4>
          </div>
          <div className="tmdb-meta-row">
            {metadata.rating && (
              <span className="tmdb-rating">
                <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                {metadata.rating.toFixed(1)}
              </span>
            )}
            {metadata.year && (
              <span className="tmdb-year">
                <Calendar size={14} />
                {metadata.year}
              </span>
            )}
            {metadata.runtime && (
              <span className="tmdb-runtime">
                <Clock size={14} />
                {metadata.runtime} min
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full card view
  return (
    <div className={`tmdb-card full ${className}`}>
      <div className="tmdb-backdrop-container">
        {metadata.backdrop && (
          <img 
            src={metadata.backdrop} 
            alt={metadata.title}
            className="tmdb-backdrop"
            loading="lazy"
          />
        )}
        <div className="tmdb-backdrop-overlay"></div>
      </div>

      <div className="tmdb-content">
        <div className="tmdb-poster-section">
          {metadata.poster && (
            <img 
              src={metadata.poster} 
              alt={metadata.title}
              className="tmdb-poster"
              loading="lazy"
            />
          )}
        </div>

        <div className="tmdb-info-section">
          <div className="tmdb-header">
            <div className="tmdb-title-group">
              <div className="tmdb-type-badge">
                {metadata.type === 'tv' ? (
                  <>
                    <Tv size={16} />
                    <span>TV Series</span>
                  </>
                ) : (
                  <>
                    <Film size={16} />
                    <span>Movie</span>
                  </>
                )}
              </div>
              <h2 className="tmdb-title-full">{metadata.title}</h2>
              {metadata.originalTitle !== metadata.title && (
                <p className="tmdb-original-title">{metadata.originalTitle}</p>
              )}
            </div>

            {onPlay && (
              <button className="tmdb-play-btn" onClick={onPlay}>
                <Play size={20} fill="white" />
                <span>Play</span>
              </button>
            )}
          </div>

          <div className="tmdb-stats">
            {metadata.rating && (
              <div className="tmdb-stat">
                <Star size={18} fill="#fbbf24" stroke="#fbbf24" />
                <span className="stat-value">{metadata.rating.toFixed(1)}</span>
                <span className="stat-label">({metadata.voteCount?.toLocaleString()} votes)</span>
              </div>
            )}
            {metadata.year && (
              <div className="tmdb-stat">
                <Calendar size={18} />
                <span className="stat-value">{metadata.year}</span>
              </div>
            )}
            {metadata.runtime && (
              <div className="tmdb-stat">
                <Clock size={18} />
                <span className="stat-value">{metadata.runtime} min</span>
              </div>
            )}
            {metadata.type === 'tv' && metadata.numberOfSeasons && (
              <div className="tmdb-stat">
                <Tv size={18} />
                <span className="stat-value">
                  {metadata.numberOfSeasons} Season{metadata.numberOfSeasons > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {metadata.genres && metadata.genres.length > 0 && (
            <div className="tmdb-genres">
              {metadata.genres.map((genre, index) => (
                <span key={index} className="tmdb-genre-tag">{genre}</span>
              ))}
            </div>
          )}

          {metadata.overview && (
            <div className="tmdb-overview">
              <h3>Overview</h3>
              <p>{metadata.overview}</p>
            </div>
          )}

          {metadata.type === 'tv' && metadata.episodeTitle && (
            <div className="tmdb-episode-info">
              <h3>
                S{metadata.currentSeason}E{metadata.currentEpisode}: {metadata.episodeTitle}
              </h3>
              {metadata.episodeOverview && <p>{metadata.episodeOverview}</p>}
            </div>
          )}

          {metadata.cast && metadata.cast.length > 0 && (
            <div className="tmdb-cast">
              <h3>
                <Users size={18} />
                Cast
              </h3>
              <div className="tmdb-cast-list">
                {metadata.cast.map(person => (
                  <div key={person.id} className="tmdb-cast-member">
                    {person.profilePath ? (
                      <img src={person.profilePath} alt={person.name} />
                    ) : (
                      <div className="tmdb-cast-placeholder">
                        <Users size={20} />
                      </div>
                    )}
                    <div className="tmdb-cast-info">
                      <span className="cast-name">{person.name}</span>
                      <span className="cast-character">{person.character}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(metadata.director || (metadata.creators && metadata.creators.length > 0)) && (
            <div className="tmdb-crew">
              {metadata.director && (
                <div className="crew-item">
                  <span className="crew-label">Director:</span>
                  <span className="crew-value">{metadata.director}</span>
                </div>
              )}
              {metadata.creators && metadata.creators.length > 0 && (
                <div className="crew-item">
                  <span className="crew-label">Created by:</span>
                  <span className="crew-value">{metadata.creators.join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TMDBCard;
