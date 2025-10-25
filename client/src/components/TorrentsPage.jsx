import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clipboard,
  Download,
  FileUp,
  Grid3x3,
  History,
  Link2,
  Loader2,
  Magnet,
  Plus,
  Search,
  Sliders,
  Upload,
  X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useServerSession } from '../contexts/ServerSessionContext.jsx';
import { addTorrent, uploadTorrentFile } from '../services/api';
import collectionsService from '../services/collectionsService';
import searchService from '../services/searchService';
import { markServerSessionInvalid } from '../services/serverAuthService';
import torrentHistoryService from '../services/torrentHistoryService';
import ApiError from '../utils/ApiError';
import { extractRequestId, formatErrorMessage, notifyError } from '../utils/errorUtils';
import ServerSessionStatus from './ServerSessionStatus';
import TMDBCard from './TMDBCard';
import { useToast } from './Toast';
import TorrentList from './TorrentList';
import './TorrentsPage.css';
// 🚀 OPTIMIZATION: Import concurrent hooks for smooth UX
import { useDeferredList, useDeferredSearch } from '../hooks/useConcurrent';

const formatBytes = (bytes) => {
  if (!bytes || Number.isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
};

const formatRelativeTime = (value) => {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'a few seconds ago';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return `${months} mo. ago`;
};

const TorrentsPage = () => {
  const fileInputRef = useRef(null);
  const toast = useToast();
  const [listRefreshSignal, setListRefreshSignal] = useState(0);
  const [activeTab, setActiveTab] = useState('upload'); // upload, magnet, url, search
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [magnetValue, setMagnetValue] = useState('');
  const [isAddingMagnet, setIsAddingMagnet] = useState(false);
  const [torrentUrl, setTorrentUrl] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  // 🚀 OPTIMIZATION: Use deferred search for non-blocking typing
  const {
    query: searchTerm,
    setQuery: setSearchTerm,
    isPending: isSearchPending
  } = useDeferredSearch('');

  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // 🚀 OPTIMIZATION: Use deferred list for smooth search results rendering
  const { deferredItems: deferredSearchResults, isPending: isResultsPending } =
    useDeferredList(searchResults);

  const [searchError, setSearchError] = useState('');
  const [searchWarnings, setSearchWarnings] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchActionId, setSearchActionId] = useState(null);

  // Advanced Search Filters
  const [selectedQuality, setSelectedQuality] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('seeders'); // seeders, date, size
  const [showFilters, setShowFilters] = useState(false);
  const [recentHistory, setRecentHistory] = useState(() =>
    torrentHistoryService.getRecentTorrents(6)
  );

  // Collection & Watchlist states
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedTorrent, setSelectedTorrent] = useState(null);
  const [collections, setCollections] = useState([]);
  const { session } = useServerSession();
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (session.authenticated) {
      setAuthError(null);
    }
  }, [session.authenticated]);

  const handleUnauthorized = useCallback(
    (message) => {
      markServerSessionInvalid();
      setAuthError(message);
      toast.error(message);
    },
    [toast]
  );

  const triggerListRefresh = () => {
    setListRefreshSignal((prev) => prev + 1);
  };

  // Load collections
  useEffect(() => {
    setCollections(collectionsService.getCollections());
  }, []);

  const refreshHistory = () => {
    setRecentHistory(torrentHistoryService.getRecentTorrents(6));
  };

  const recordTorrent = (result, source, originalInput, displayName) => {
    if (!result?.infoHash) return;
    torrentHistoryService.addTorrent({
      infoHash: result.infoHash,
      name: result.name || displayName || result.infoHash,
      size: result.size || 0,
      source,
      originalInput
    });
    refreshHistory();
  };

  const buildSuccessMessage = (result, fallback) => {
    if (result?.message) return result.message;
    switch (result?.status) {
      case 'existing':
      case 'duplicate':
        return 'Torrent already added – refreshing data.';
      case 'uploaded':
        return 'Torrent file uploaded successfully.';
      case 'found':
      case 'loaded':
        return 'Torrent added to download list.';
      default:
        return fallback;
    }
  };

  const handleTorrentUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.torrent')) {
      toast.error('Only .torrent files are supported.');
      return;
    }

    setIsUploading(true);
    setUploadFileName(file.name);

    try {
      const result = await uploadTorrentFile(file);
      const message = buildSuccessMessage(result, `Dodato: ${result?.name || file.name}`);
      toast.success(message);
      triggerListRefresh();
      recordTorrent(result, 'file', file.name, result?.name || file.name);
      setUploadFileName('');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        handleUnauthorized('Administrator authentication required to upload torrents.');
      } else {
        await notifyError(toast, error, 'Upload failed.', {
          logMessage: 'Error uploading torrent file'
        });
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length) {
      handleTorrentUpload(event.dataTransfer.files[0]);
      event.dataTransfer.clearData();
    }
  };

  const handleMagnetSubmit = async (event) => {
    event.preventDefault();
    const trimmed = magnetValue.trim();
    if (!trimmed) {
      toast.error('Enter magnet link or info hash.');
      return;
    }

    setIsAddingMagnet(true);
    try {
      const result = await addTorrent(trimmed);
      const message = buildSuccessMessage(result, 'Torrent added.');
      toast.success(message);
      triggerListRefresh();
      recordTorrent(result, 'magnet', trimmed, result?.name || trimmed);
      setMagnetValue('');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        handleUnauthorized('Session expired. Authenticate again to add torrents.');
      } else {
        await notifyError(toast, error, 'Adding torrent failed.', {
          logMessage: 'Error adding magnet link'
        });
      }
    } finally {
      setIsAddingMagnet(false);
    }
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) {
      setSearchResults([]);
      setSearchWarnings([]);
      setSearchError('Unesi pojam za pretragu.');
      setHasSearched(true);
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setHasSearched(true);

    try {
      const data = await searchService.search(query, { limit: 50 });
      let results = data.results || [];

      // Apply quality filter
      if (selectedQuality !== 'all') {
        results = results.filter((item) => {
          const title = (item.title || '').toLowerCase();
          if (selectedQuality === '4k') return title.includes('2160p') || title.includes('4k');
          if (selectedQuality === '1080p') return title.includes('1080p');
          if (selectedQuality === '720p') return title.includes('720p');
          if (selectedQuality === 'sd')
            return (
              !title.includes('1080p') &&
              !title.includes('720p') &&
              !title.includes('2160p') &&
              !title.includes('4k')
            );
          return true;
        });
      }

      // Apply category filter
      if (selectedCategory !== 'all') {
        results = results.filter((item) => {
          const title = (item.title || '').toLowerCase();
          if (selectedCategory === 'movies') {
            // Exclude TV patterns
            return !/s\d{2}e\d{2}|season|episode/i.test(title);
          }
          if (selectedCategory === 'tv') {
            // Include TV patterns
            return /s\d{2}e\d{2}|season|episode|complete series/i.test(title);
          }
          if (selectedCategory === 'anime') {
            return /anime|jpn|japanese|dubbed|subbed/i.test(title);
          }
          return true;
        });
      }

      // Apply sorting
      results.sort((a, b) => {
        if (sortBy === 'seeders') {
          return (b.seeders || 0) - (a.seeders || 0);
        }
        if (sortBy === 'size') {
          return (b.size || 0) - (a.size || 0);
        }
        if (sortBy === 'date') {
          const dateA = new Date(a.uploadDate || 0).getTime();
          const dateB = new Date(b.uploadDate || 0).getTime();
          return dateB - dateA;
        }
        return 0;
      });

      setSearchResults(results.slice(0, 24)); // Limit to 24 after filtering
      setSearchWarnings(data.errors || []);
      if (results.length === 0) {
        setSearchError('Nema rezultata za zadatu pretragu i filtere.');
      }
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        handleUnauthorized('Administrator authentication required to search torrent sources.');
        setSearchResults([]);
        setSearchWarnings([]);
        setSearchError('Search access requires authentication.');
      } else {
        setSearchResults([]);
        setSearchWarnings([]);
        const message = formatErrorMessage(error, 'Search failed.');
        setSearchError(message);
        console.error('Search request failed', {
          error,
          requestId: extractRequestId(error)
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromSearch = async (item) => {
    if (!item?.magnet && !item?.infoHash) return;
    setSearchActionId(item.id);
    try {
      const input = item.magnet || item.infoHash;
      const result = await addTorrent(input);
      const message = buildSuccessMessage(result, `Added: ${item.title}`);
      toast.success(message);
      triggerListRefresh();
      recordTorrent(result, 'search', item.title, item.title);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        handleUnauthorized('Session expired. Authenticate again to add torrents from search.');
      } else {
        await notifyError(toast, error, 'Adding from search failed.', {
          logMessage: 'Error adding torrent from search'
        });
      }
    } finally {
      setSearchActionId(null);
    }
  };

  const handlePasteFromClipboard = async () => {
    if (!navigator?.clipboard) {
      toast.error('Clipboard nije dostupan u ovom okruženju.');
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setMagnetValue(text.trim());
        toast.success('Paste-ovano iz clipboard-a.');
      } else {
        toast.warning('Clipboard je prazan.');
      }
    } catch {
      toast.error('Nije moguće pročitati clipboard. Daj dozvolu browseru.');
    }
  };

  const handleAddFromUrl = async () => {
    const trimmed = torrentUrl.trim();
    if (!trimmed) {
      toast.error('Unesi URL do torrent fajla.');
      return;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      toast.error('URL mora počinjati sa http:// ili https://');
      return;
    }

    setIsAddingUrl(true);
    try {
      const response = await fetch(trimmed);
      if (!response.ok) {
        throw new Error(`Failed to fetch torrent: ${response.status}`);
      }

      const blob = await response.blob();
      const file = new File([blob], 'downloaded.torrent', { type: 'application/x-bittorrent' });

      const result = await uploadTorrentFile(file);
      const message = buildSuccessMessage(result, 'Torrent dodat sa URL!');
      toast.success(message);
      triggerListRefresh();
      recordTorrent(result, 'url', trimmed, result?.name || 'downloaded.torrent');
      setTorrentUrl('');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        handleUnauthorized('Administrator authentication required to add torrents.');
      } else if (trimmed.startsWith('magnet:')) {
        try {
          const result = await addTorrent(trimmed);
          const message = buildSuccessMessage(result, 'Magnet link dodat!');
          toast.success(message);
          triggerListRefresh();
          recordTorrent(result, 'magnet', trimmed, result?.name || trimmed);
          setTorrentUrl('');
        } catch (magnetError) {
          if (
            magnetError instanceof ApiError &&
            (magnetError.status === 401 || magnetError.status === 403)
          ) {
            handleUnauthorized('Session expired. Authenticate again to add torrents.');
          } else {
            await notifyError(toast, magnetError, 'Magnet link nije validan.', {
              logMessage: 'Magnet fallback from URL failed'
            });
          }
        }
      } else {
        await notifyError(toast, error, 'Nije moguće preuzeti torrent fajl sa URL-a.', {
          logMessage: 'Failed to download torrent from URL'
        });
      }
    } finally {
      setIsAddingUrl(false);
    }
  };

  // Add to Collection
  const handleAddToCollection = (torrent) => {
    setSelectedTorrent(torrent);
    setShowCollectionModal(true);
  };

  const handleSelectCollection = (collectionId) => {
    if (!selectedTorrent) return;

    const item = {
      id: selectedTorrent.magnetURI || selectedTorrent.id,
      name: selectedTorrent.title,
      type: 'movie', // Default to movie, can be improved with TMDB detection
      magnetLink: selectedTorrent.magnetURI,
      size: selectedTorrent.size,
      seeders: selectedTorrent.seeders,
      addedAt: new Date().toISOString()
    };

    collectionsService.addToCollection(collectionId, item);
    toast.success(`Added to collection!`);
    setShowCollectionModal(false);
    setSelectedTorrent(null);
  };

  // Add to Watchlist
  const handleAddToWatchlist = (torrent) => {
    const item = {
      id: torrent.magnetURI || torrent.id,
      name: torrent.title,
      type: 'movie', // Default to movie
      magnetLink: torrent.magnetURI,
      size: torrent.size,
      seeders: torrent.seeders,
      addedAt: new Date().toISOString()
    };

    collectionsService.addToWatchlist(item);
    toast.success(`Added to watchlist!`);
  };

  if (!session.authenticated) {
    return (
      <div className="page-shell torrents-page">
        <div className="page-shell-content torrents-page-guard-wrapper">
          <ServerSessionStatus />
          <div className="torrents-guard page-card accent-coral">
            <ServerSessionStatus.Alert />
            {authError && <div className="torrents-alert">{authError}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell torrents-page">
      <ServerSessionStatus compact />
      <div className="page-shell-content torrents-container">
        {/* Tab Navigation */}
        <div className="torrents-tabs page-card">
          <button
            className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload size={18} />
            <span>Upload Fajla</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'magnet' ? 'active' : ''}`}
            onClick={() => setActiveTab('magnet')}
          >
            <Magnet size={18} />
            <span>Magnet Link</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'url' ? 'active' : ''}`}
            onClick={() => setActiveTab('url')}
          >
            <Link2 size={18} />
            <span>URL Link</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search size={18} />
            <span>Search</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="torrents-tab-content page-card">
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="tab-panel">
              <div
                className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="upload-icon">
                  <FileUp size={48} />
                </div>
                <h3>Drag .torrent file here</h3>
                <p>or click to select file from computer</p>
                <button
                  type="button"
                  className="btn-upload"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="spin" size={18} />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      <span>Select File</span>
                    </>
                  )}
                </button>
                {uploadFileName && (
                  <div className="upload-filename">
                    <CheckCircle2 size={16} />
                    <span>{uploadFileName}</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  id="torrent-file-upload"
                  name="torrent-file"
                  accept=".torrent"
                  className="hidden-input"
                  onChange={(event) => handleTorrentUpload(event.target.files?.[0])}
                  disabled={isUploading}
                  aria-label="Upload torrent file"
                />
              </div>
            </div>
          )}

          {/* Magnet Tab */}
          {activeTab === 'magnet' && (
            <div className="tab-panel">
              <form onSubmit={handleMagnetSubmit} className="input-form">
                <label>Magnet Link ili Info Hash</label>
                <div className="input-with-button">
                  <textarea
                    rows={4}
                    id="magnet-link-input"
                    name="magnet-link"
                    placeholder="magnet:?xt=urn:btih:... ili samo info hash"
                    value={magnetValue}
                    onChange={(e) => setMagnetValue(e.target.value)}
                    disabled={isAddingMagnet}
                    autoComplete="off"
                    aria-label="Enter magnet link or info hash"
                    className="text-input"
                  />
                  <button
                    type="button"
                    className="btn-paste"
                    onClick={handlePasteFromClipboard}
                    disabled={isAddingMagnet}
                    title="Paste from clipboard"
                  >
                    <Clipboard size={18} />
                  </button>
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isAddingMagnet || !magnetValue.trim()}
                >
                  {isAddingMagnet ? (
                    <>
                      <Loader2 className="spin" size={18} />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      <span>Add Torrent</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* URL Tab */}
          {activeTab === 'url' && (
            <div className="tab-panel">
              <div className="input-form">
                <label>URL do .torrent fajla</label>
                <input
                  type="url"
                  id="torrent-url-input"
                  name="torrent-url"
                  placeholder="https://example.com/file.torrent"
                  value={torrentUrl}
                  onChange={(e) => setTorrentUrl(e.target.value)}
                  disabled={isAddingUrl}
                  className="text-input"
                  autoComplete="url"
                  aria-label="Torrent file URL"
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAddFromUrl}
                  disabled={isAddingUrl || !torrentUrl.trim()}
                >
                  {isAddingUrl ? (
                    <>
                      <Loader2 className="spin" size={18} />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>Download and Add</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="tab-panel">
              <form onSubmit={handleSearchSubmit} className="input-form">
                <label>Search torrents</label>
                <div className="search-input-wrapper">
                  <input
                    type="text"
                    id="torrent-search-term"
                    name="search-term"
                    placeholder="npr. Dune Part Two 2160p"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={isSearching}
                    className="text-input"
                    autoComplete="off"
                    aria-label="Search torrents"
                  />
                  <button
                    type="button"
                    className={`btn-filter ${showFilters ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                    title="Filteri"
                  >
                    <Sliders size={20} />
                    {(selectedQuality !== 'all' ||
                      selectedCategory !== 'all' ||
                      sortBy !== 'seeders') && <span className="filter-badge">•</span>}
                  </button>
                  <button type="submit" className="btn-search" disabled={isSearching}>
                    {isSearching ? <Loader2 className="spin" size={20} /> : <Search size={20} />}
                  </button>
                </div>
              </form>

              {/* Advanced Filters Panel */}
              {showFilters && (
                <div className="filters-panel">
                  <div className="filter-group">
                    <label className="filter-label">Kvalitet</label>
                    <div className="filter-buttons">
                      <button
                        type="button"
                        className={`filter-btn ${selectedQuality === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedQuality('all')}
                      >
                        Sve
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${selectedQuality === '4k' ? 'active' : ''}`}
                        onClick={() => setSelectedQuality('4k')}
                      >
                        4K
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${selectedQuality === '1080p' ? 'active' : ''}`}
                        onClick={() => setSelectedQuality('1080p')}
                      >
                        1080p
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${selectedQuality === '720p' ? 'active' : ''}`}
                        onClick={() => setSelectedQuality('720p')}
                      >
                        720p
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${selectedQuality === 'sd' ? 'active' : ''}`}
                        onClick={() => setSelectedQuality('sd')}
                      >
                        SD
                      </button>
                    </div>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Kategorija</label>
                    <div className="filter-buttons">
                      <button
                        type="button"
                        className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('all')}
                      >
                        Sve
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${selectedCategory === 'movies' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('movies')}
                      >
                        Filmovi
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${selectedCategory === 'tv' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('tv')}
                      >
                        TV Serije
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${selectedCategory === 'anime' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('anime')}
                      >
                        Anime
                      </button>
                    </div>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Sortiraj po</label>
                    <div className="filter-buttons">
                      <button
                        type="button"
                        className={`filter-btn ${sortBy === 'seeders' ? 'active' : ''}`}
                        onClick={() => setSortBy('seeders')}
                      >
                        Seeders ↓
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${sortBy === 'date' ? 'active' : ''}`}
                        onClick={() => setSortBy('date')}
                      >
                        Datum ↓
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${sortBy === 'size' ? 'active' : ''}`}
                        onClick={() => setSortBy('size')}
                      >
                        Veličina ↓
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searchError && hasSearched && (
                <div className="search-message error">
                  <AlertCircle size={18} />
                  <span>{searchError}</span>
                </div>
              )}

              {searchWarnings.length > 0 && (
                <div className="search-message warning">
                  <AlertCircle size={18} />
                  <span>
                    Some sources unavailable:{' '}
                    {searchWarnings.map((w) => w.source || 'unknown').join(', ')}
                  </span>
                </div>
              )}

              {(isSearching || isSearchPending || isResultsPending) && (
                <div
                  className="search-results search-results--skeleton"
                  aria-live="polite"
                  aria-busy="true"
                >
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`search-skeleton-${index}`}
                      className="search-result-card-enhanced skeleton"
                    >
                      <div className="skeleton-thumbnail" />
                      <div className="skeleton-info">
                        <div className="skeleton-line skeleton-line--wide" />
                        <div className="skeleton-line skeleton-line--medium" />
                        <div className="skeleton-line skeleton-line--short" />
                      </div>
                      <div className="skeleton-actions">
                        <span className="skeleton-chip" />
                        <span className="skeleton-chip" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 🚀 OPTIMIZATION: Use deferred results for smooth rendering */}
              {deferredSearchResults.length > 0 && (
                <div className="search-results">
                  {deferredSearchResults.map((item) => {
                    const sourceColors = {
                      apibay: 'purple',
                      yts: 'green',
                      jackett: 'blue',
                      '1337x': 'orange',
                      eztv: 'red',
                      torrentgalaxy: 'cyan'
                    };
                    const sourceLabels = {
                      apibay: 'TPB',
                      yts: 'YTS',
                      jackett: 'Jackett',
                      '1337x': '1337x',
                      eztv: 'EZTV',
                      torrentgalaxy: 'TGx'
                    };
                    const color = sourceColors[item.source] || 'gray';
                    const label =
                      sourceLabels[item.source] || item.source?.toUpperCase?.() || 'IZVOR';

                    return (
                      <div key={item.id} className="search-result-card-enhanced">
                        <div className="result-tmdb-section">
                          <TMDBCard torrentTitle={item.title} compact={true} />
                        </div>
                        <div className="result-torrent-info">
                          <h4 className="result-title">{item.title}</h4>
                          <div className="result-meta">
                            <span className={`result-source source-${color}`}>{label}</span>
                            <span className="result-stat">
                              <CheckCircle2 size={14} />
                              {item.seeders ?? 0} seeders
                            </span>
                            <span className="result-stat">{formatBytes(item.size)}</span>
                          </div>
                        </div>
                        <div className="result-actions">
                          <button
                            type="button"
                            className="btn-action btn-watchlist"
                            onClick={() => handleAddToWatchlist(item)}
                            title="Add to Watchlist"
                          >
                            <Bookmark size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-action btn-collection"
                            onClick={() => handleAddToCollection(item)}
                            title="Add to Collection"
                          >
                            <Grid3x3 size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-add"
                            onClick={() => handleAddFromSearch(item)}
                            disabled={searchActionId === item.id}
                          >
                            {searchActionId === item.id ? (
                              <Loader2 className="spin" size={18} />
                            ) : (
                              <Plus size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent History */}
        {recentHistory.length > 0 && (
          <div className="torrents-recent page-card">
            <div className="recent-header">
              <History size={20} />
              <h3>Nedavno dodato</h3>
            </div>
            <div className="recent-list">
              {recentHistory.map((item) => (
                <Link
                  key={`${item.infoHash}-${item.addedAt}`}
                  to={`/torrent/${item.infoHash}`}
                  className="recent-item"
                >
                  <div className="recent-info">
                    <span className="recent-name">{item.name}</span>
                    <span className="recent-meta">
                      {formatBytes(item.size)} • {formatRelativeTime(item.addedAt)}
                    </span>
                  </div>
                  <ArrowRight size={18} className="recent-arrow" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Active Torrents List */}
        <div className="torrents-list-section page-card">
          <div className="list-header">
            <h2>Aktivni torrenti</h2>
            <p>Svi torrenti se automatski osvežavaju u realnom vremenu</p>
          </div>
          <TorrentList refreshSignal={listRefreshSignal} />
        </div>
      </div>

      {/* Collection Selection Modal */}
      {showCollectionModal && (
        <div className="modal-overlay" onClick={() => setShowCollectionModal(false)}>
          <div
            className="modal-content collection-select-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Add to Collection</h2>
              <button className="btn-close" onClick={() => setShowCollectionModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {collections.length === 0 ? (
                <div className="no-collections">
                  <Grid3x3 size={48} />
                  <p>No collections yet</p>
                  <button
                    className="btn-create"
                    onClick={() => {
                      setShowCollectionModal(false);
                      window.location.href = '/collections';
                    }}
                  >
                    Create Collection
                  </button>
                </div>
              ) : (
                <div className="collections-list">
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      className="collection-item"
                      onClick={() => handleSelectCollection(collection.id)}
                    >
                      <div className="collection-icon">
                        <Grid3x3 size={20} />
                      </div>
                      <div className="collection-info">
                        <div className="collection-name">{collection.name}</div>
                        <div className="collection-count">
                          {collection.items?.length || 0} items
                        </div>
                      </div>
                      <ArrowRight size={18} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TorrentsPage;
