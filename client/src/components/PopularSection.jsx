import React, { useState, useEffect } from 'react';
import { Star, Plus, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import collectionsService from '../services/collectionsService';
import './PopularSection.css';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '5a2876e7f1442bb3cb793b278e1de1bf';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const PopularSection = () => {
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchPopular();
  }, []);

  const fetchPopular = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
      );
      const data = await response.json();
      setPopular(data.results?.slice(0, 12) || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching popular movies:', error);
      setLoading(false);
    }
  };

  const handleAddToWatchlist = (movie, e) => {
    e.preventDefault();
    e.stopPropagation();

    const item = {
      id: movie.id.toString(),
      title: movie.title,
      poster: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : '',
      year: movie.release_date?.split('-')[0] || '',
      addedAt: new Date().toISOString()
    };

    collectionsService.addToWatchlist(item);
    setToast({ type: 'success', message: `${movie.title} added to Watchlist! 🎬` });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <section className="popular-section">
        <div className="popular-header">
          <div className="popular-title">
            <Star size={24} className="popular-star" />
            <h2>Popular Right Now</h2>
          </div>
        </div>
        <div className="popular-loading">
          <div className="loading-spinner-large"></div>
          <p>Loading popular movies...</p>
        </div>
      </section>
    );
  }

  if (!popular.length) {
    return null;
  }

  return (
    <section className="popular-section">
      {/* Header */}
      <div className="popular-header">
        <div className="popular-title">
          <Star size={24} className="popular-star" />
          <h2>Popular Right Now</h2>
        </div>
        <p className="popular-subtitle">Most watched movies this month</p>
      </div>

      {/* Grid of Popular Movies */}
      <div className="popular-grid">
        {popular.map((movie) => (
          <div key={movie.id} className="popular-card">
            <div className="popular-poster">
              <img
                src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : '/placeholder.png'}
                alt={movie.title}
                loading="lazy"
              />
              <div className="popular-overlay">
                <div className="popular-actions">
                  <Link 
                    to="/search" 
                    className="popular-btn popular-btn-play"
                    onClick={(e) => {
                      e.preventDefault();
                      setToast({ type: 'info', message: 'Search integration coming soon!' });
                      setTimeout(() => setToast(null), 2000);
                    }}
                  >
                    <Play size={18} fill="currentColor" />
                  </Link>
                  <button
                    className="popular-btn popular-btn-add"
                    onClick={(e) => handleAddToWatchlist(movie, e)}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="popular-info">
                  <h3 className="popular-movie-title">{movie.title}</h3>
                  <div className="popular-meta">
                    <span className="popular-rating">
                      <Star size={12} fill="currentColor" />
                      {movie.vote_average.toFixed(1)}
                    </span>
                    <span className="popular-year">
                      {movie.release_date?.split('-')[0] || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`popular-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </section>
  );
};

export default PopularSection;
