import React, { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink, Star } from 'lucide-react';
import './RecommendationsSidebar.css';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '5a2876e7f1442bb3cb793b278e1de1bf';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const RecommendationsSidebar = ({ 
  tmdbId, 
  mediaType = 'movie', // 'movie' or 'tv'
  onSelectMovie,
  onClose 
}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('recommendations'); // 'recommendations' or 'similar'

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both recommendations and similar content
      const [recRes, simRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}/recommendations?api_key=${TMDB_API_KEY}&language=en-US&page=1`),
        fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}/similar?api_key=${TMDB_API_KEY}&language=en-US&page=1`)
      ]);

      const recData = await recRes.json();
      const simData = await simRes.json();

      setRecommendations(recData.results?.slice(0, 6) || []);
      setSimilar(simData.results?.slice(0, 6) || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load recommendations');
      setLoading(false);
    }
  }, [mediaType, tmdbId]);

  useEffect(() => {
    if (!tmdbId) return;

    fetchRecommendations();
  }, [tmdbId, fetchRecommendations]);

  const handleMovieClick = (movie) => {
    if (onSelectMovie) {
      onSelectMovie({
        id: movie.id,
        title: movie.title || movie.name,
        poster: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null,
        year: movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0],
        rating: movie.vote_average,
        overview: movie.overview
      });
    }
  };

  const currentList = activeTab === 'recommendations' ? recommendations : similar;
  const hasContent = currentList.length > 0;

  if (loading) {
    return (
      <div className="recommendations-sidebar">
        <div className="sidebar-header">
          <h3>Recommendations</h3>
          <button className="btn-close-sidebar" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-loading">
          <div className="loading-spinner"></div>
          <p>Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recommendations-sidebar">
        <div className="sidebar-header">
          <h3>Recommendations</h3>
          <button className="btn-close-sidebar" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendations-sidebar">
      <div className="sidebar-header">
        <h3>More Like This</h3>
        <button className="btn-close-sidebar" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="sidebar-tabs">
        <button
          className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          Recommendations
          {recommendations.length > 0 && <span className="tab-count">{recommendations.length}</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'similar' ? 'active' : ''}`}
          onClick={() => setActiveTab('similar')}
        >
          Similar
          {similar.length > 0 && <span className="tab-count">{similar.length}</span>}
        </button>
      </div>

      {/* Content */}
      <div className="sidebar-content">
        {hasContent ? (
          <div className="recommendations-grid">
            {currentList.map((item) => (
              <div
                key={item.id}
                className="recommendation-card"
                onClick={() => handleMovieClick(item)}
              >
                {item.poster_path ? (
                  <img
                    src={`${TMDB_IMAGE_BASE}${item.poster_path}`}
                    alt={item.title || item.name}
                    className="recommendation-poster"
                  />
                ) : (
                  <div className="recommendation-poster-placeholder">
                    <ExternalLink size={32} />
                  </div>
                )}
                <div className="recommendation-info">
                  <h4 className="recommendation-title">
                    {item.title || item.name}
                  </h4>
                  <div className="recommendation-meta">
                    <span className="recommendation-year">
                      {item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0]}
                    </span>
                    {item.vote_average > 0 && (
                      <span className="recommendation-rating">
                        <Star size={12} fill="currentColor" />
                        {item.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="sidebar-empty">
            <ExternalLink size={48} opacity={0.3} />
            <p>No {activeTab} available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationsSidebar;
