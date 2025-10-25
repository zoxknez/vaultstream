/**
 * SubtitleSearch Component
 * 
 * UI for searching and selecting subtitles from OpenSubtitles
 * Can be embedded in video player overlay or used standalone
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Globe,
  Star,
  Users,
  Calendar,
  Loader,
  X
} from 'lucide-react';
import opensubtitlesService from '../services/opensubtitlesService';
import tmdbService from '../services/tmdbService';
import './SubtitleSearch.css';

function SubtitleSearch({ 
  torrentTitle, 
  imdbId, 
  onSubtitleSelect, 
  onClose,
  compact = false,
  autoSearch = true 
}) {
  const [subtitles, setSubtitles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState(['en', 'sr']);
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Available languages
  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
    { code: 'bs', name: 'Bosnian', flag: '🇧🇦' },
    { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' }
  ];

  /**
   * Auto-search using IMDB ID or torrent title
   */
  const handleAutoSearch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let results = [];

      // Try IMDB ID first (most accurate)
      if (imdbId) {
        results = await opensubtitlesService.searchByImdbId(
          imdbId,
          selectedLanguages
        );
      } 
      // Fallback to searching by torrent title
      else if (torrentTitle) {
        // Try to get IMDB ID from TMDB
        const tmdbData = await tmdbService.searchContent(torrentTitle);
        
        if (tmdbData?.imdbId) {
          results = await opensubtitlesService.searchByImdbId(
            tmdbData.imdbId,
            selectedLanguages
          );
        } else {
          // Last resort: search by title
          const cleanTitle = tmdbService.parseTorrentTitle(torrentTitle).cleanName;
          results = await opensubtitlesService.searchByQuery(
            cleanTitle,
            selectedLanguages
          );
        }
      }

      setSubtitles(results);

      // Auto-select best subtitle
      if (results.length > 0) {
        const best = opensubtitlesService.selectBestSubtitle(results, {
          language: selectedLanguages[0],
          hearingImpaired: false
        });
        setSelectedSubtitle(best);
      }
    } catch (err) {
      console.error('Subtitle search error:', err);
      setError('Failed to search subtitles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [imdbId, torrentTitle, selectedLanguages]);

  // Auto-search on mount if enabled
  useEffect(() => {
    if (autoSearch) {
      handleAutoSearch();
    }
  }, [autoSearch, handleAutoSearch]);

  /**
   * Manual search by query
   */
  const handleManualSearch = async (e) => {
    e?.preventDefault();
    
    if (!searchQuery.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await opensubtitlesService.searchByQuery(
        searchQuery,
        selectedLanguages
      );
      setSubtitles(results);
    } catch (err) {
      console.error('Subtitle search error:', err);
      setError('Failed to search subtitles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle language selection
   */
  const toggleLanguage = (languageCode) => {
    setSelectedLanguages(prev => {
      if (prev.includes(languageCode)) {
        return prev.filter(code => code !== languageCode);
      } else {
        return [...prev, languageCode];
      }
    });
  };

  /**
   * Download and apply subtitle
   */
  const handleDownloadSubtitle = async (subtitle) => {
    if (!subtitle || !subtitle.fileId) {
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      // Fetch and convert subtitle to VTT
      const vttContent = await opensubtitlesService.fetchAndConvertSubtitle(
        subtitle.fileId
      );

      // Create blob URL
      const blob = new Blob([vttContent], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);

      // Pass to parent component
      if (onSubtitleSelect) {
        onSubtitleSelect({
          url,
          language: subtitle.languageCode,
          label: subtitle.languageName,
          fileName: subtitle.fileName
        });
      }

      // Close modal if in overlay mode
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Subtitle download error:', err);
      setError('Failed to download subtitle. Please try another one.');
    } finally {
      setDownloading(false);
    }
  };

  /**
   * Render subtitle item
   */
  const renderSubtitleItem = (subtitle) => {
    const isSelected = selectedSubtitle?.id === subtitle.id;

    return (
      <div
        key={subtitle.id}
        className={`subtitle-item ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedSubtitle(subtitle)}
      >
        <div className="subtitle-header">
          <div className="subtitle-language">
            {languages.find(l => l.code === subtitle.languageCode)?.flag || '🌐'}
            <span className="language-name">{subtitle.languageName}</span>
          </div>
          
          <div className="subtitle-badges">
            {subtitle.movieHashMatch && (
              <span className="badge badge-success" title="Perfect sync">
                <CheckCircle2 size={12} />
                Match
              </span>
            )}
            {subtitle.fromTrusted && (
              <span className="badge badge-trusted" title="Trusted uploader">
                <Star size={12} />
                Trusted
              </span>
            )}
            {subtitle.hearingImpaired && (
              <span className="badge badge-hi" title="Hearing impaired">
                CC
              </span>
            )}
          </div>
        </div>

        <div className="subtitle-filename">{subtitle.fileName}</div>
        
        {subtitle.release && (
          <div className="subtitle-release">{subtitle.release}</div>
        )}

        <div className="subtitle-meta">
          <span className="meta-item">
            <Users size={14} />
            {subtitle.downloadCount.toLocaleString()} downloads
          </span>
          <span className="meta-item">
            <Star size={14} />
            {subtitle.rating.toFixed(1)}
          </span>
          {subtitle.fps && (
            <span className="meta-item">
              {subtitle.fps} FPS
            </span>
          )}
        </div>

        <div className="subtitle-footer">
          <span className="uploader">by {subtitle.uploader}</span>
          <span className="upload-date">
            <Calendar size={12} />
            {new Date(subtitle.uploadDate).toLocaleDateString()}
          </span>
        </div>

        {isSelected && (
          <button
            className="btn-download-subtitle"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadSubtitle(subtitle);
            }}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Loader className="spin" size={16} />
                Downloading...
              </>
            ) : (
              <>
                <Download size={16} />
                Download & Use
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`subtitle-search ${compact ? 'compact' : ''}`}>
      <div className="subtitle-search-header">
        <h3>
          <Globe size={20} />
          Subtitle Search
        </h3>
        {onClose && (
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Language selector */}
      <div className="language-selector">
        <label>Languages:</label>
        <div className="language-chips">
          {languages.map(lang => (
            <button
              key={lang.code}
              className={`language-chip ${selectedLanguages.includes(lang.code) ? 'active' : ''}`}
              onClick={() => toggleLanguage(lang.code)}
            >
              <span className="flag">{lang.flag}</span>
              {lang.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search input */}
      <form className="subtitle-search-form" onSubmit={handleManualSearch}>
        <div className="search-input-group">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by movie/show name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn-search" disabled={loading}>
            {loading ? <Loader className="spin" size={18} /> : 'Search'}
          </button>
        </div>
      </form>

      {/* Error message */}
      {error && (
        <div className="subtitle-error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="subtitle-loading">
          <Loader className="spin" size={32} />
          <p>Searching subtitles...</p>
        </div>
      )}

      {/* Subtitle results */}
      {!loading && subtitles.length > 0 && (
        <div className="subtitle-results">
          <div className="results-header">
            <span>Found {subtitles.length} subtitles</span>
            {selectedSubtitle && (
              <span className="selected-indicator">
                <CheckCircle2 size={16} />
                1 selected
              </span>
            )}
          </div>
          <div className="subtitle-list">
            {subtitles.map(renderSubtitleItem)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && subtitles.length === 0 && !error && (
        <div className="subtitle-empty">
          <Globe size={48} />
          <p>No subtitles found</p>
          <p className="empty-hint">
            Try searching manually or check your language selection
          </p>
        </div>
      )}
    </div>
  );
}

export default SubtitleSearch;
