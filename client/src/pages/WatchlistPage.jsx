import { useState, useEffect } from 'react';
import { Bookmark, Play, Info, X, Star, Calendar, Filter } from 'lucide-react';

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dateAdded');

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = () => {
    const stored = localStorage.getItem('streamvault_watchlist');
    if (stored) {
      setWatchlist(JSON.parse(stored));
    } else {
      const demoWatchlist = [
        { id: 550, title: 'Fight Club', year: 1999, rating: 8.8, poster: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', overview: 'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.', genres: ['Drama', 'Thriller'], addedAt: '2024-01-15', watched: false },
        { id: 278, title: 'The Shawshank Redemption', year: 1994, rating: 9.3, poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', overview: 'Two imprisoned men bond over a number of years.', genres: ['Drama'], addedAt: '2024-01-12', watched: true }
      ];
      setWatchlist(demoWatchlist);
      localStorage.setItem('streamvault_watchlist', JSON.stringify(demoWatchlist));
    }
  };

  const handleRemove = (movieId) => {
    const updated = watchlist.filter(m => m.id !== movieId);
    setWatchlist(updated);
    localStorage.setItem('streamvault_watchlist', JSON.stringify(updated));
  };

  const handleToggleWatched = (movieId) => {
    const updated = watchlist.map(movie => movie.id === movieId ? { ...movie, watched: !movie.watched } : movie);
    setWatchlist(updated);
    localStorage.setItem('streamvault_watchlist', JSON.stringify(updated));
  };

  const getFilteredWatchlist = () => {
    let filtered = [...watchlist];
    if (filter === 'watched') filtered = filtered.filter(m => m.watched);
    else if (filter === 'unwatched') filtered = filtered.filter(m => !m.watched);
    if (sortBy === 'dateAdded') filtered.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    else if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);
    return filtered;
  };

  const filteredWatchlist = getFilteredWatchlist();
  const stats = { total: watchlist.length, watched: watchlist.filter(m => m.watched).length, unwatched: watchlist.filter(m => !m.watched).length };

  return (
    <div className='netflix-watchlist-page'><div className='watchlist-header'><div className='header-content'><div className='header-title'><Bookmark size={32}/><div><h1>My Watchlist</h1><p>Movies you want to watch later</p></div></div><div className='watchlist-stats'><div className='stat'><span className='stat-value'>{stats.total}</span><span className='stat-label'>Total</span></div><div className='stat'><span className='stat-value'>{stats.unwatched}</span><span className='stat-label'>To Watch</span></div></div></div></div><div className='watchlist-controls'><div className='filter-buttons'><button className={'filter-btn ' + (filter === 'all' ? 'active' : '')} onClick={() => setFilter('all')}>All ({stats.total})</button><button className={'filter-btn ' + (filter === 'unwatched' ? 'active' : '')} onClick={() => setFilter('unwatched')}>To Watch ({stats.unwatched})</button><button className={'filter-btn ' + (filter === 'watched' ? 'active' : '')} onClick={() => setFilter('watched')}>Watched ({stats.watched})</button></div><div className='sort-dropdown'><Filter size={18}/><select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value='dateAdded'>Date Added</option><option value='rating'>Rating</option></select></div></div>{filteredWatchlist.length > 0 ? <div className='watchlist-grid'>{filteredWatchlist.map((movie) => <div key={movie.id} className='watchlist-card'><div className='card-poster'><img src={movie.poster} alt={movie.title}/><div className='card-overlay'><button className='play-btn'><Play size={24} fill='white'/></button><button className='remove-btn' onClick={() => handleRemove(movie.id)}><X size={20}/></button></div>{movie.watched && <div className='watched-badge'> Watched</div>}</div><div className='card-info'><div className='card-header'><h3>{movie.title}</h3><button className={'watched-toggle ' + (movie.watched ? 'watched' : '')} onClick={() => handleToggleWatched(movie.id)}></button></div><div className='card-meta'><span><Calendar size={14}/>{movie.year}</span><span><Star size={14} fill='#ffd700' color='#ffd700'/>{movie.rating}</span></div><p className='card-overview'>{movie.overview}</p><div className='card-genres'>{movie.genres.map((g, i) => <span key={i} className='genre-tag'>{g}</span>)}</div></div></div>)}</div> : <div className='watchlist-empty'><Bookmark size={64}/><h2>No movies here</h2><p>Start adding movies to your watchlist</p></div>}</div>
  );
}
