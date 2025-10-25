import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  Globe,
  Loader2,
  Magnet,
  Search,
  Settings,
  X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import searchService from '../services/searchService';
import torrentHistoryService from '../services/torrentHistoryService';
import { extractRequestId, formatErrorMessage } from '../utils/errorUtils';
import Footer from './Footer';
import './SearchSourcesPage.css';

const SearchSourcesPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchPage, setSearchPage] = useState(1);
  const [searchMeta, setSearchMeta] = useState(null);
  const [availableSearchSources, setAvailableSearchSources] = useState([]);
  const [selectedSearchSources, setSelectedSearchSources] = useState([]);
  const [addingTorrentId, setAddingTorrentId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const searchQueryRef = useRef('');

  searchQueryRef.current = searchQuery;

  useEffect(() => {
    const fetchSearchSources = async () => {
      try {
        const backendSources = await searchService.listSources();
        setAvailableSearchSources(backendSources);
        setSelectedSearchSources(backendSources.map((source) => source.id));
      } catch (error) {
        console.warn('Backend sources not available, using fallback sources:', {
          error,
          requestId: extractRequestId(error)
        });
        const fallbackSources = [
          { id: 'yts', name: 'YTS', enabled: true, category: 'movies' },
          { id: '1337x', name: '1337x', enabled: true, category: 'general' },
          { id: 'thepiratebay', name: 'The Pirate Bay', enabled: true, category: 'general' },
          { id: 'rarbg', name: 'RARBG', enabled: true, category: 'general' },
          { id: 'eztv', name: 'EZTV', enabled: true, category: 'tv' },
          { id: 'torrentgalaxy', name: 'TorrentGalaxy', enabled: true, category: 'general' }
        ];
        setAvailableSearchSources(fallbackSources);
        setSelectedSearchSources(fallbackSources.map((source) => source.id));
        setSearchError(
          formatErrorMessage(
            error,
            'Backend not available - using offline mode with limited sources'
          )
        );
      }
    };

    fetchSearchSources();
  }, []);

  const formatFileSize = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (!bytes || Number.isNaN(bytes)) return 'Unknown';
    const exponent = Math.floor(Math.log(bytes) / Math.log(1024));
    if (!Number.isFinite(exponent) || exponent < 0) return `${bytes} B`;
    const value = bytes / Math.pow(1024, exponent);
    return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${sizes[exponent]}`;
  };

  const formatUploadedAt = (value) => {
    if (!value) return 'Unknown date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const executeSearch = useCallback(
    async ({ page = 1, preserveStatus = false, query } = {}) => {
      const activeQuery = typeof query === 'string' ? query : searchQueryRef.current;
      const trimmedQuery = activeQuery.trim();

      if (trimmedQuery.length < 2) {
        setSearchError('Enter at least 2 characters to search.');
        setSearchResults([]);
        setSearchMeta(null);
        return;
      }

      setSearchLoading(true);
      setSearchError('');
      if (!preserveStatus) {
        setStatusMessage('');
      }

      try {
        const payload = await searchService.search(trimmedQuery, {
          page,
          sources: selectedSearchSources.length ? selectedSearchSources : undefined
        });

        setSearchResults(payload.results || []);
        setSearchMeta({
          page: payload.page || 1,
          limit: payload.limit || 25,
          cached: Boolean(payload.cached),
          errors: payload.errors || [],
          sources: payload.sources || []
        });
        setSearchPage(payload.page || 1);
      } catch (error) {
        setSearchResults([]);
        setSearchMeta(null);
        setSearchError(formatErrorMessage(error, 'Search failed'));
        console.error('Search execution failed', {
          error,
          requestId: extractRequestId(error)
        });
      } finally {
        setSearchLoading(false);
      }
    },
    [selectedSearchSources]
  );

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    executeSearch({ page: 1 });
  };

  const handleAddTorrent = async (result) => {
    if (!result?.magnetLink) {
      setStatusMessage('✗ No magnet link available for this torrent');
      return;
    }

    setAddingTorrentId(result.id || result.magnetLink);
    setStatusMessage('');

    try {
      await torrentHistoryService.addTorrentFromMagnet(result.magnetLink, result.title);
      setStatusMessage(`✓ Added: ${result.title}`);

      setTimeout(() => {
        navigate('/cache');
      }, 1500);
    } catch (error) {
      const message = formatErrorMessage(error, 'Failed to add torrent');
      console.error('Failed to add torrent:', {
        error,
        requestId: extractRequestId(error)
      });
      setStatusMessage(`✗ Failed to add torrent: ${message}`);
    } finally {
      setAddingTorrentId(null);
    }
  };

  const handleSourceToggle = (sourceId) => {
    setSelectedSearchSources((prev) => {
      if (prev.includes(sourceId)) {
        return prev.filter((id) => id !== sourceId);
      }
      return [...prev, sourceId];
    });
  };

  const handleSelectAll = () => {
    setSelectedSearchSources(availableSearchSources.map((s) => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedSearchSources([]);
  };

  const hasExecutedSearch = Boolean(searchMeta);
  const hasQuery = searchQuery.trim().length >= 2;
  const showResults = !searchLoading && searchResults.length > 0;
  const showEmptyAfterSearch =
    !searchLoading && !searchError && hasExecutedSearch && searchResults.length === 0;
  const showInitialPrompt = !searchLoading && !searchError && !hasExecutedSearch && !hasQuery;

  return (
    <div className="page-shell search-page">
      <div className="page-shell-content">
        <div className="page-hero search-hero">
          <div className="search-header">
            <div className="search-icon-box">
              <Search size={28} />
            </div>
            <div className="search-title-box">
              <h1>Torrent Search</h1>
              <p>Find and download torrents from multiple sources</p>
            </div>
          </div>

          <form className="search-input-wrapper" onSubmit={handleSearchSubmit}>
            <div className="search-input-box">
              <Search size={20} className="search-input-icon" />
              <input
                type="text"
                id="torrent-search-input"
                name="torrent-search"
                className="search-input"
                placeholder="Search torrents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={searchLoading}
                autoComplete="off"
                aria-label="Search torrents"
              />
              <button
                type="submit"
                className="search-submit-btn"
                disabled={searchLoading || searchQuery.trim().length < 2}
              >
                {searchLoading ? <Loader2 size={20} className="spin" /> : 'Search'}
              </button>
            </div>
          </form>

          <div className="sources-summary-bar">
            <div className="sources-summary-content">
              <div className="sources-summary-info">
                <Globe size={18} />
                <span className="sources-count">
                  {selectedSearchSources.length} of {availableSearchSources.length} sources selected
                </span>
              </div>

              {selectedSearchSources.length > 0 && (
                <div className="selected-sources-chips">
                  {selectedSearchSources.slice(0, 5).map((sourceId) => {
                    const source = availableSearchSources.find((s) => s.id === sourceId);
                    return source ? (
                      <div key={sourceId} className="selected-source-chip">
                        <Globe size={12} />
                        <span>{source.name}</span>
                      </div>
                    ) : null;
                  })}
                  {selectedSearchSources.length > 5 && (
                    <div className="selected-source-chip more">
                      +{selectedSearchSources.length - 5} more
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              className="sources-manage-btn"
              onClick={() => setShowSourcesPanel(!showSourcesPanel)}
              type="button"
            >
              <Settings size={16} />
              <span>Manage Sources</span>
            </button>
          </div>

          {showSourcesPanel && (
            <div className="sources-panel">
              <div className="sources-panel-header">
                <h3>Search Sources</h3>
                <div className="sources-panel-actions">
                  <button className="panel-action-btn" onClick={handleSelectAll} type="button">
                    <Check size={14} />
                    <span>Select All</span>
                  </button>
                  <button className="panel-action-btn" onClick={handleDeselectAll} type="button">
                    <X size={14} />
                    <span>Deselect All</span>
                  </button>
                </div>
              </div>

              <div className="sources-grid">
                {availableSearchSources.map((source) => {
                  const isSelected = selectedSearchSources.includes(source.id);
                  return (
                    <div
                      key={source.id}
                      className={`source-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSourceToggle(source.id)}
                    >
                      <div className="source-item-icon">
                        {isSelected ? (
                          <CheckCircle2 size={20} className="check-icon" />
                        ) : (
                          <Globe size={20} className="globe-icon" />
                        )}
                      </div>
                      <div className="source-item-info">
                        <h4>{source.name}</h4>
                        <p>{source.url || 'Torrent source'}</p>
                      </div>
                      <div className={`source-item-status ${isSelected ? 'active' : 'inactive'}`}>
                        {isSelected ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="sources-panel-footer">
                <div className="footer-info">
                  <AlertTriangle size={16} />
                  <p>To add new sources, configure them in your backend settings</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="page-main">
          <div className="page-panels search-panels">
            {statusMessage && (
              <div
                className={`page-status search-status ${
                  statusMessage.startsWith('✓') ? 'success' : 'error'
                }`}
              >
                {statusMessage.startsWith('✓') ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <AlertTriangle size={18} />
                )}
                <span>{statusMessage}</span>
              </div>
            )}

            {searchError && (
              <div className="page-status error search-error">
                <AlertTriangle size={20} />
                <span>{searchError}</span>
              </div>
            )}

            {searchLoading && (
              <div className="page-panel search-loading-panel">
                <div className="search-loading">
                  <Loader2 size={32} className="spin" />
                  <p>Searching torrents...</p>
                </div>
              </div>
            )}

            {!searchLoading && (showResults || showEmptyAfterSearch || showInitialPrompt) && (
              <div className="page-panel search-results-panel">
                {showResults ? (
                  <>
                    <div className="results-header">
                      <h2>Search Results</h2>
                      <p>{searchResults.length} torrents found</p>
                    </div>

                    <div className="search-results">
                      {searchResults.map((result, index) => (
                        <div key={result.id || result.magnetLink || index} className="result-card">
                          <div className="result-content">
                            <div className="result-icon">
                              <Magnet size={24} />
                            </div>

                            <div className="result-info">
                              <h3 className="result-title">{result.title}</h3>

                              <div className="result-meta">
                                <span className="result-size">{formatFileSize(result.size)}</span>
                                <span className="result-separator">•</span>
                                <span className="result-seeders">
                                  {result.seeders || 0} seeders
                                </span>
                                <span className="result-separator">•</span>
                                <span className="result-date">
                                  {formatUploadedAt(result.uploadedAt)}
                                </span>
                              </div>

                              {result.source && (
                                <div className="result-source">
                                  <Globe size={12} />
                                  <span>{result.source}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            className="result-download-btn"
                            onClick={() => handleAddTorrent(result)}
                            disabled={addingTorrentId === (result.id || result.magnetLink)}
                            type="button"
                          >
                            {addingTorrentId === (result.id || result.magnetLink) ? (
                              <Loader2 size={20} className="spin" />
                            ) : (
                              <>
                                <Download size={20} />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>

                    {searchMeta && searchMeta.page && (
                      <div className="search-pagination">
                        <button
                          className="pagination-btn"
                          onClick={() => executeSearch({ page: searchPage - 1 })}
                          disabled={searchPage <= 1 || searchLoading}
                          type="button"
                        >
                          Previous
                        </button>
                        <span className="pagination-info">Page {searchPage}</span>
                        <button
                          className="pagination-btn"
                          onClick={() => executeSearch({ page: searchPage + 1 })}
                          disabled={searchLoading}
                          type="button"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="search-empty page-empty-state">
                    <Search size={48} />
                    {showEmptyAfterSearch ? (
                      <>
                        <h3>No results found</h3>
                        <p>Try different search terms or check your source filters</p>
                      </>
                    ) : (
                      <>
                        <h3>Start searching</h3>
                        <p>Enter at least 2 characters to search for torrents</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default SearchSourcesPage;
