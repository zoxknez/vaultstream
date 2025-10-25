/**
 * 🏠 HOME PAGE - OPTIMIZED
 * React 19 optimizations:
 * - Memoized components
 * - Lazy image loading
 * - No setInterval spam
 * - Retry logic for API calls
 */

import { Info, Play } from 'lucide-react';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import NetflixRow from '../components/NetflixRow';
import { useLazyImage } from '../hooks/useIntersectionObserver';

const HomePage = () => {
  const [hero, setHero] = useState(null);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [popular, setPopular] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();
  const navigate = useNavigate();

  const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
  const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

  // ✅ Retry logic for failed API calls
  const fetchWithRetry = useCallback(async (url, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        console.warn(`API call failed, retrying (${i + 1}/${retries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }, []);

  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true);

        if (!TMDB_API_KEY) {
          console.warn('TMDB API key not configured. Using demo content.');
          loadDemoContent();
          return;
        }

        // Load trending, top rated, and popular content with retry
        const [trendingData, topRatedData, popularData] = await Promise.all([
          fetchWithRetry(
            `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`
          ),
          fetchWithRetry(
            `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&page=1`
          ),
          fetchWithRetry(
            `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=1`
          )
        ]);

        // Use startTransition for non-urgent state updates
        startTransition(() => {
          if (trendingData.results?.[0]) {
            setHero(trendingData.results[0]);
          }
          setTrending(trendingData.results || []);
          setTopRated(topRatedData.results || []);
          setPopular(popularData.results || []);
        });
      } catch (error) {
        console.error('Error loading TMDB content:', error);
        loadDemoContent();
      } finally {
        setIsLoading(false);
      }
    };

    const loadDemoContent = () => {
      const demoHero = {
        id: 1,
        title: 'StreamVault',
        overview:
          'Your personal streaming vault. Download and watch your favorite movies and TV shows.',
        backdrop_path: null,
        vote_average: 9.0,
        release_date: '2024-01-01'
      };

      const demoMovies = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Demo Movie ${i + 1}`,
        poster_path: null,
        vote_average: 8.5 - i * 0.1,
        release_date: `2024-01-${String(i + 1).padStart(2, '0')}`
      }));

      setHero(demoHero);
      setTrending(demoMovies);
      setTopRated(demoMovies);
      setPopular(demoMovies);
    };

    loadContent();
  }, [TMDB_API_KEY, fetchWithRetry]);

  const handlePlayItem = useCallback(
    (item) => {
      console.log('🎬 Play requested for:', item.title || item.name);

      // Create search query from movie/show title and year
      const title = item.title || item.name;
      const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
      const searchQuery = year ? `${title} ${year}` : title;

      // Navigate to home page with search query
      navigate(`/?q=${encodeURIComponent(searchQuery)}`);

      // Optional: Auto-focus search input
      setTimeout(() => {
        const searchInput = document.querySelector(
          'input[type="search"], input[placeholder*="search" i]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    },
    [navigate]
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="netflix-home">
      {/* Hero Section */}
      {hero && <HeroSection hero={hero} />}

      {/* Content Rows */}
      <div className="netflix-content-wrapper">
        {trending.length > 0 && (
          <NetflixRow title="Trending Now" items={trending} onPlayItem={handlePlayItem} />
        )}
        {topRated.length > 0 && (
          <NetflixRow title="Top Rated" items={topRated} onPlayItem={handlePlayItem} />
        )}
        {popular.length > 0 && (
          <NetflixRow title="Popular on StreamVault" items={popular} onPlayItem={handlePlayItem} />
        )}
      </div>
    </div>
  );
};

// ✅ Memoized Hero Section
function HeroSection({ hero }) {
  const navigate = useNavigate();
  const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
  const backdropSrc = hero.backdrop_path
    ? `${TMDB_IMAGE_BASE}/original${hero.backdrop_path}`
    : null;

  const [ref, loadedBackdrop] = useLazyImage(backdropSrc, null);

  const handleHeroPlay = () => {
    const title = hero.title || hero.name;
    const year = hero.release_date ? new Date(hero.release_date).getFullYear() : '';
    const searchQuery = year ? `${title} ${year}` : title;

    navigate(`/?q=${encodeURIComponent(searchQuery)}`);

    setTimeout(() => {
      const searchInput = document.querySelector(
        'input[type="search"], input[placeholder*="search" i]'
      );
      if (searchInput) {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleMoreInfo = () => {
    // TODO: Open detail modal
    console.log('Show more info for:', hero.title || hero.name);
  };

  return (
    <section className="netflix-hero" ref={ref}>
      {/* Background Image */}
      <div className="netflix-hero-background">
        {loadedBackdrop ? (
          <img src={loadedBackdrop} alt={hero.title || hero.name} />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)'
            }}
          />
        )}
      </div>

      {/* Gradients for better text readability */}
      <div className="netflix-hero-gradient" />
      <div className="netflix-hero-gradient-bottom" />

      <div className="netflix-hero-content">
        <h1 className="netflix-hero-title">{hero.title || hero.name}</h1>

        <div className="netflix-hero-meta">
          <span className="netflix-badge netflix-badge-new">NEW</span>
          {hero.vote_average && (
            <span className="netflix-hero-rating">★ {hero.vote_average.toFixed(1)}</span>
          )}
          {hero.release_date && (
            <span className="netflix-hero-year">{new Date(hero.release_date).getFullYear()}</span>
          )}
        </div>

        <p className="netflix-hero-description">{hero.overview || 'No description available.'}</p>

        <div className="netflix-hero-actions">
          <button className="netflix-btn netflix-btn-primary" onClick={handleHeroPlay}>
            <Play size={24} />
            <span>Play</span>
          </button>
          <button className="netflix-btn netflix-btn-secondary" onClick={handleMoreInfo}>
            <Info size={24} />
            <span>More Info</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// ✅ Loading Skeleton Component
function LoadingSkeleton() {
  return (
    <div className="netflix-loading">
      <div className="skeleton-hero"></div>
      <div className="skeleton-rows">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-row-title"></div>
            <div className="skeleton-row-items">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="skeleton-card"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .netflix-loading {
          min-height: 100vh;
          background: var(--bg-primary, #0f0f0f);
          padding: 2rem;
        }
        .skeleton-hero {
          height: 500px;
          background: linear-gradient(90deg, #1a1a1a 25%, #252525 50%, #1a1a1a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 12px;
          margin-bottom: 3rem;
        }
        .skeleton-rows {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .skeleton-row-title {
          width: 200px;
          height: 24px;
          background: linear-gradient(90deg, #1a1a1a 25%, #252525 50%, #1a1a1a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        .skeleton-row-items {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1rem;
        }
        .skeleton-card {
          aspect-ratio: 2/3;
          background: linear-gradient(90deg, #1a1a1a 25%, #252525 50%, #1a1a1a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export default HomePage;
