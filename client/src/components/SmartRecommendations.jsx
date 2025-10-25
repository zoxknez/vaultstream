import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, TrendingUp, Star, Play, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import collectionsService from '../services/collectionsService';
import tmdbService from '../services/tmdbService';
import analyticsService from '../services/analyticsService';
import './SmartRecommendations.css';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const normalizeMovie = (movie) => ({
  id: movie.id,
  title: movie.title,
  year: movie.release_date?.split('-')[0] || 'N/A',
  rating: Number(movie.vote_average || 0),
  poster: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : ''
});

const SmartRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [basedOnMovie, setBasedOnMovie] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchPopularMovies = useCallback(async () => {
    try {
      const data = await tmdbService.request('/movie/popular', {
        language: 'en-US',
        page: 1
      });
      setRecommendations(data.results?.slice(0, 8).map(normalizeMovie) || []);
      setBasedOnMovie(null);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching popular movies:', error);
      setLoading(false);
    }
  }, []);

  const fetchSmartRecommendations = useCallback(async () => {
    try {
      setLoading(true);

  const analyticsSummary = await analyticsService.getSummary();
  const analyticsSeed = analyticsSummary?.topProgress?.[0] || analyticsSummary?.topWatchlist?.[0] || null;

      // Get watch history
      const watchHistory = collectionsService.getWatchHistory();
      const continueWatching = collectionsService.getContinueWatching();
      
      // Combine and get most recent movie
      const allWatched = [...watchHistory, ...continueWatching]
        .filter(item => item.id)
        .sort((a, b) => {
          const dateA = new Date(a.watchedAt || a.lastWatched || 0);
          const dateB = new Date(b.watchedAt || b.lastWatched || 0);
          return dateB - dateA;
        });

      let seed = null;

      if (analyticsSeed?.tmdbId) {
        seed = {
          tmdbId: analyticsSeed.tmdbId,
          title: analyticsSeed.title
        };
      }

      if (!seed && allWatched.length > 0) {
        const recentMovie = allWatched[0];
        const movieId = recentMovie.id;

        if (movieId && !(typeof movieId === 'string' && movieId.startsWith('tt'))) {
          seed = {
            tmdbId: Number(movieId),
            title: recentMovie.title
          };
          setBasedOnMovie(recentMovie);
        }
      } else if (analyticsSeed) {
        setBasedOnMovie({ title: analyticsSeed.title });
      }

      if (!seed) {
        await fetchPopularMovies();
        return;
      }

      const data = await tmdbService.request(`/movie/${seed.tmdbId}/recommendations`, {
        language: 'en-US',
        page: 1
      });
      
      if (data.results && data.results.length > 0) {
        setRecommendations(data.results.slice(0, 8).map(normalizeMovie));
        setBasedOnMovie((prev) => prev || seed);
      } else {
        await fetchPopularMovies();
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching smart recommendations:', error);
      await fetchPopularMovies();
    }
  }, [fetchPopularMovies]);

  useEffect(() => {
    fetchSmartRecommendations();
  }, [fetchSmartRecommendations]);

  const handleAddToWatchlist = (movie, e) => {
    e.preventDefault();
    e.stopPropagation();

    const item = {
      id: movie.id.toString(),
      title: movie.title,
      poster: movie.poster,
      year: movie.year || '',
      addedAt: new Date().toISOString()
    };

    collectionsService.addToWatchlist(item);
    analyticsService.trackEvent('recommendation_watchlist_add', {
      tmdbId: movie.id,
      title: movie.title
    });
    setToast({ type: 'success', message: `${movie.title} added to Watchlist! 🎬` });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <section className="smart-recommendations">
        <div className="smart-header">
          <div className="smart-title">
            <Sparkles size={24} className="smart-icon" />
            <h2>Recommended For You</h2>
          </div>
        </div>
        <div className="smart-loading">
          <div className="loading-spinner-smart"></div>
          <p>Finding perfect matches...</p>
        </div>
      </section>
    );
  }

  if (!recommendations.length) {
    return null;
  }

  return (
    <section className="smart-recommendations">
      {/* Header */}
      <div className="smart-header">
        <div className="smart-title">
          <Sparkles size={24} className="smart-icon" />
          <h2>
            {basedOnMovie ? (
              <>
                Because you watched <span className="highlight">{basedOnMovie.title}</span>
              </>
            ) : (
              'Popular Right Now'
            )}
          </h2>
        </div>
        {basedOnMovie && (
          <div className="smart-badge">
            <TrendingUp size={16} />
            <span>Smart Pick</span>
          </div>
        )}
      </div>

      {/* Cards Grid */}
      <div className="smart-grid">
        {recommendations.map((movie) => (
          <Link
            key={movie.id}
            to="/search"
            className="smart-card"
            onClick={(e) => {
              e.preventDefault();
              setToast({ type: 'success', message: 'Search integration coming soon!' });
              setTimeout(() => setToast(null), 3000);
            }}
          >
            {/* Poster */}
            <div className="smart-poster-wrapper">
              {movie.poster ? (
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="smart-poster"
                  loading="lazy"
                />
              ) : (
                <div className="smart-poster-placeholder">
                  <Play size={48} opacity={0.3} />
                </div>
              )}
              
              {/* Hover Overlay */}
              <div className="smart-overlay">
                <button
                  className="btn-play-small"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <Play size={20} fill="currentColor" />
                </button>
                <button
                  className="btn-add-small"
                  onClick={(e) => handleAddToWatchlist(movie, e)}
                  title="Add to Watchlist"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="smart-info">
              <h4 className="smart-movie-title">{movie.title}</h4>
              <div className="smart-meta">
                <span className="smart-year">
                  {movie.year || 'N/A'}
                </span>
                {movie.rating > 0 && (
                  <span className="smart-rating">
                    <Star size={12} fill="currentColor" />
                    {movie.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`smart-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </section>
  );
};

export default SmartRecommendations;
