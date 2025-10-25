import { Download, HardDrive, Search, SlidersHorizontal, Star, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TorrentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    quality: 'all',
    minSeeders: 0,
    maxSize: 'all',
    category: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Load demo data on mount
    loadDemoResults();
  }, []);

  const loadDemoResults = () => {
    const demoResults = [
      {
        id: 1,
        name: 'Inception (2010) [1080p BluRay x265 HEVC]',
        size: '2.4 GB',
        seeders: 1234,
        leechers: 89,
        quality: '1080p',
        source: 'YTS',
        uploadDate: '2024-01-15',
        rating: 8.8
      },
      {
        id: 2,
        name: 'The Dark Knight (2008) [2160p UHD BluRay x265 HDR]',
        size: '5.8 GB',
        seeders: 892,
        leechers: 45,
        quality: '4K',
        source: '1337x',
        uploadDate: '2024-01-10',
        rating: 9.0
      },
      {
        id: 3,
        name: 'Interstellar (2014) [720p WEB-DL x264]',
        size: '1.2 GB',
        seeders: 654,
        leechers: 32,
        quality: '720p',
        source: 'RARBG',
        uploadDate: '2024-01-12',
        rating: 8.6
      },
      {
        id: 4,
        name: 'The Matrix (1999) [1080p BluRay REMUX]',
        size: '18.5 GB',
        seeders: 445,
        leechers: 23,
        quality: 'REMUX',
        source: 'TorrentGalaxy',
        uploadDate: '2024-01-08',
        rating: 8.7
      },
      {
        id: 5,
        name: 'Pulp Fiction (1994) [1080p BluRay x264]',
        size: '2.1 GB',
        seeders: 567,
        leechers: 41,
        quality: '1080p',
        source: 'YTS',
        uploadDate: '2024-01-14',
        rating: 8.9
      },
      {
        id: 6,
        name: 'The Shawshank Redemption (1994) [2160p UHD]',
        size: '6.2 GB',
        seeders: 1089,
        leechers: 67,
        quality: '4K',
        source: '1337x',
        uploadDate: '2024-01-11',
        rating: 9.3
      }
    ];
    setResults(demoResults);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      // Filter demo results based on search query
      const filtered = results.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setResults(filtered.length > 0 ? filtered : results);
      setLoading(false);
    }, 500);
  };

  const handleDownload = (torrent) => {
    console.log('Downloading:', torrent.name);
    // TODO: Integrate with backend download API
    alert(`Starting download: ${torrent.name}`);
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case '4K':
      case 'REMUX':
        return 'var(--netflix-red)';
      case '1080p':
        return '#00ff00';
      case '720p':
        return '#ffaa00';
      default:
        return '#888';
    }
  };

  const getHealthColor = (seeders) => {
    if (seeders > 500) return '#00ff00';
    if (seeders > 100) return '#ffaa00';
    return '#ff4444';
  };

  return (
    <div className="netflix-torrents-page">
      {/* Search Header */}
      <div className="torrents-search-header">
        <div className="search-header-content">
          <h1>Search Torrents</h1>
          <p>Find and download movies from multiple sources</p>

          <form onSubmit={handleSearch} className="torrents-search-form">
            <div className="search-input-wrapper">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search for movies, TV shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="torrents-search-input"
              />
              <button
                type="button"
                className="filter-toggle-btn"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal size={20} />
              </button>
              <button type="submit" className="netflix-btn netflix-btn-primary">
                Search
              </button>
            </div>
          </form>

          {/* Filters Panel */}
          {showFilters && (
            <div className="torrents-filters">
              <div className="filter-group">
                <label>Quality</label>
                <select
                  value={filters.quality}
                  onChange={(e) => setFilters({ ...filters, quality: e.target.value })}
                >
                  <option value="all">All Qualities</option>
                  <option value="4k">4K UHD</option>
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                  <option value="remux">REMUX</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Min Seeders</label>
                <input
                  type="number"
                  min="0"
                  value={filters.minSeeders}
                  onChange={(e) => setFilters({ ...filters, minSeeders: e.target.value })}
                />
              </div>

              <div className="filter-group">
                <label>Max Size</label>
                <select
                  value={filters.maxSize}
                  onChange={(e) => setFilters({ ...filters, maxSize: e.target.value })}
                >
                  <option value="all">Any Size</option>
                  <option value="2gb">Under 2GB</option>
                  <option value="5gb">Under 5GB</option>
                  <option value="10gb">Under 10GB</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <option value="all">All Categories</option>
                  <option value="movies">Movies</option>
                  <option value="tv">TV Shows</option>
                  <option value="anime">Anime</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="torrents-results">
        <div className="results-header">
          <h2>Results ({results.length})</h2>
          <div className="results-sources">
            <span className="source-badge">YTS</span>
            <span className="source-badge">1337x</span>
            <span className="source-badge">RARBG</span>
            <span className="source-badge">TorrentGalaxy</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching torrents...</p>
          </div>
        ) : (
          <div className="torrents-list">
            {results.map((torrent) => (
              <div key={torrent.id} className="torrent-item">
                <div className="torrent-main">
                  <div className="torrent-info">
                    <h3>{torrent.name}</h3>
                    <div className="torrent-meta">
                      <span className="torrent-source">{torrent.source}</span>
                      <span>•</span>
                      <span>{torrent.uploadDate}</span>
                      {torrent.rating && (
                        <>
                          <span>•</span>
                          <span className="torrent-rating">
                            <Star size={14} fill="#ffd700" color="#ffd700" />
                            {torrent.rating}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="torrent-stats">
                    <div className="stat">
                      <Users size={16} />
                      <span style={{ color: getHealthColor(torrent.seeders) }}>
                        {torrent.seeders}
                      </span>
                      <span className="stat-label">Seeders</span>
                    </div>
                    <div className="stat">
                      <Users size={16} />
                      <span>{torrent.leechers}</span>
                      <span className="stat-label">Leechers</span>
                    </div>
                    <div className="stat">
                      <HardDrive size={16} />
                      <span>{torrent.size}</span>
                    </div>
                  </div>
                </div>

                <div className="torrent-actions">
                  <span
                    className="quality-badge"
                    style={{ backgroundColor: getQualityColor(torrent.quality) }}
                  >
                    {torrent.quality}
                  </span>
                  <button
                    className="netflix-btn netflix-btn-primary netflix-btn-sm"
                    onClick={() => handleDownload(torrent)}
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
