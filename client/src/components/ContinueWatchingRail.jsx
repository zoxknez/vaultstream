import { useEffect, useMemo, useState, useCallback } from 'react';
import collectionsService from '../services/collectionsService';
import tmdbService from '../services/tmdbService';
import analyticsService from '../services/analyticsService';
import { addLocalEventListener } from '../services/localEvents';
import './ContinueWatchingRail.css';

const buildDisplayItem = (item) => {
  if (!item) {
    return null;
  }

  const duration = item.duration || 0;
  const position = Math.min(item.position || 0, duration);
  const progress = duration > 0 ? Math.round((position / duration) * 100) : 0;
  const tmdbData = item.tmdbData || {};

  return {
    id: item.id || `${item.torrentHash}-${progress}`,
    torrentHash: item.torrentHash,
    title: tmdbData.title || tmdbData.name || item.torrentName || 'Untitled',
    subtitle: tmdbData.media_type === 'tv'
      ? `${tmdbData.number_of_seasons ? 'Series' : 'Episode'} · ${tmdbData.original_name || ''}`.trim()
      : tmdbData.release_date?.split('-')[0] || tmdbData.first_air_date?.split('-')[0] || 'Movie',
    poster: tmdbData.poster_path ? tmdbService.getPosterUrl(tmdbData.poster_path, 'medium') : (tmdbData.poster || null),
    backdrop: tmdbData.backdrop_path ? tmdbService.getBackdropUrl(tmdbData.backdrop_path, 'small') : null,
    progress,
    position,
    duration,
    updatedAt: item.updatedAt
  };
};

const ContinueWatchingRail = () => {
  const [items, setItems] = useState(() => {
    const initial = collectionsService.getContinueWatching();
    return initial.map(buildDisplayItem).filter(Boolean);
  });

  const loadItems = useCallback(() => {
    const next = collectionsService.getContinueWatching();
    setItems(next.map(buildDisplayItem).filter(Boolean));
  }, []);

  useEffect(() => {
    const removeUpdate = addLocalEventListener('continueWatching:updated', loadItems);
    const removeSync = addLocalEventListener('continueWatching:sync', loadItems);

    loadItems();

    return () => {
      removeUpdate?.();
      removeSync?.();
    };
  }, [loadItems]);

  const hasItems = items.length > 0;

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [items]);

  if (!hasItems) {
    return null;
  }

  const handleResumeClick = (item) => {
    analyticsService.trackEvent('continue_resume_click', {
      torrentHash: item.torrentHash,
      title: item.title,
      progress: item.progress
    });
  };

  return (
    <section className="continue-rail">
      <div className="continue-header">
        <div>
          <h2>Continue Watching</h2>
          <p>Instant resume with cross-device sync</p>
        </div>
        <span className="continue-count">{sortedItems.length} in progress</span>
      </div>
      <div className="continue-scroller">
        {sortedItems.map((item) => (
          <article key={item.id} className="continue-card">
            <div className="continue-poster">
              {item.poster ? (
                <img src={item.poster} alt={item.title} loading="lazy" />
              ) : (
                <div className="continue-placeholder">🎬</div>
              )}
              <button
                type="button"
                className="continue-resume"
                onClick={() => handleResumeClick(item)}
                title="Resume playback"
              >
                Resume
              </button>
            </div>
            <div className="continue-info">
              <h3>{item.title}</h3>
              <span className="continue-meta">{item.subtitle}</span>
              <div className="continue-progress">
                <div className="continue-progress-bar">
                  <div
                    className="continue-progress-fill"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <span className="continue-progress-value">{item.progress}%</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ContinueWatchingRail;
