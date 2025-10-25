import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Flame, Star, Play, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import collectionsService from '../services/collectionsService';
import './TrendingSection.css';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const IS_TMDB_CONFIGURED = Boolean(TMDB_API_KEY);
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

const TrendingSection = () => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState(null);
  const [toast, setToast] = useState(null);
  const [configError, setConfigError] = useState(null);
  const autoPlayRef = useRef(null);

  useEffect(() => {
    if (!IS_TMDB_CONFIGURED) {
      setLoading(false);
      setConfigError('TMDB API key nije konfigurisan. Postavite VITE_TMDB_API_KEY u okruženju frontenda.');
      return;
    }

    fetchTrending();
  }, []);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (!IS_TMDB_CONFIGURED) {
      return () => undefined;
    }

    if (trending.length > 0 && !hoveredId) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % trending.length);
      }, 5000);

      return () => {
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current);
        }
      };
    }
  }, [trending.length, hoveredId]);

  const fetchTrending = async () => {
    if (!IS_TMDB_CONFIGURED) {
      return;
    }

    try {
      setLoading(true);
      setConfigError(null);
      const response = await fetch(
        `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`
      );
      const data = await response.json();
      setTrending(data.results?.slice(0, 10) || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching trending:', error);
      setConfigError('Neuspelo učitavanje trendova. Proverite TMDB API ključ i mrežu.');
      setLoading(false);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + trending.length) % trending.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % trending.length);
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

  if (configError) {
    return (
      <section className="trending-section">
        <div className="trending-header">
          <div className="trending-title">
            <Flame size={24} className="trending-flame" />
            <h2>Trending This Week</h2>
          </div>
        </div>
        <div className="trending-loading">
          <div className="loading-spinner-large"></div>
          <p>{configError}</p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="trending-section">
        <div className="trending-header">
          <div className="trending-title">
            <Flame size={24} className="trending-flame" />
            <h2>Trending This Week</h2>
          </div>
        </div>
        <div className="trending-loading">
          <div className="loading-spinner-large"></div>
          <p>Loading trending movies...</p>
        </div>
      </section>
    );
  }

  if (!trending.length) {
    return null;
  }

  const currentMovie = trending[currentIndex];

  return (
    <section className="trending-section">
      {/* Header */}
      <div className="trending-header">
        <div className="trending-title">
          <Flame size={24} className="trending-flame" />
          <h2>Trending This Week</h2>
        </div>
        <div className="trending-counter">
          {currentIndex + 1} / {trending.length}
        </div>
      </div>

      {/* Hero Showcase */}
      <div 
        className="trending-hero"
        onMouseEnter={() => setHoveredId(currentMovie.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        {/* Background */}
        <div className="trending-backdrop">
          <img
            src={currentMovie.backdrop_path 
              ? `${TMDB_BACKDROP_BASE}${currentMovie.backdrop_path}` 
              : `${TMDB_IMAGE_BASE}${currentMovie.poster_path}`
            }
            alt={currentMovie.title}
            className="backdrop-image"
          />
          <div className="backdrop-gradient"></div>
        </div>

        {/* Content */}
        <div className="trending-content">
          <div className="trending-badge">
            <Flame size={16} />
            <span>#{currentIndex + 1} Trending</span>
          </div>

          <h3 className="trending-movie-title">{currentMovie.title}</h3>

          <div className="trending-meta">
            <span className="trending-year">
              {currentMovie.release_date?.split('-')[0]}
            </span>
            {currentMovie.vote_average > 0 && (
              <span className="trending-rating">
                <Star size={14} fill="currentColor" />
                {currentMovie.vote_average.toFixed(1)}
              </span>
            )}
            <span className="trending-popularity">
              {Math.round(currentMovie.popularity)} views
            </span>
          </div>

          <p className="trending-overview">
            {currentMovie.overview?.length > 200
              ? `${currentMovie.overview.substring(0, 200)}...`
              : currentMovie.overview}
          </p>

          {/* Actions */}
          <div className="trending-actions">
            <Link 
              to="/search" 
              className="btn-trending-play"
              onClick={(e) => {
                // Future: Direct play functionality
                e.preventDefault();
                setToast({ type: 'success', message: 'Search integration coming soon!' });
                setTimeout(() => setToast(null), 3000);
              }}
            >
              <Play size={20} fill="currentColor" />
              <span>Watch Now</span>
            </Link>
            <button
              className="btn-trending-watchlist"
              onClick={(e) => handleAddToWatchlist(currentMovie, e)}
            >
              <Plus size={20} />
              <span>Add to Watchlist</span>
            </button>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button 
          className="trending-nav trending-nav-prev" 
          onClick={handlePrev}
          aria-label="Previous"
        >
          <ChevronLeft size={32} />
        </button>
        <button 
          className="trending-nav trending-nav-next" 
          onClick={handleNext}
          aria-label="Next"
        >
          <ChevronRight size={32} />
        </button>

        {/* Dots Indicator */}
        <div className="trending-dots">
          {trending.slice(0, 5).map((_, index) => (
            <button
              key={index}
              className={`trending-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Thumbnail Strip */}
      <div className="trending-strip">
        {trending.map((movie, index) => (
          <div
            key={movie.id}
            className={`trending-thumb ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          >
            <img
              src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : '/placeholder.png'}
              alt={movie.title}
            />
            <div className="trending-thumb-overlay">
              <span className="trending-thumb-rank">#{index + 1}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`trending-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </section>
  );
};

export default TrendingSection;
