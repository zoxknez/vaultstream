import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Subtitles,
  Languages,
  Loader2,
  Upload,
  AlertCircle,
  Trash2,
  Search,
  Globe,
  Download,
  Star,
  Plus,
  Minus,
  RotateCcw
} from 'lucide-react';

const SubtitleMenu = ({
  isOpen,
  onToggle,
  currentSubtitle,
  localSubtitles,
  torrentSubtitles,
  onlineSubtitles,
  onLoadSubtitle,
  onLoadOnlineSubtitle,
  onSearchOnline,
  isSearchingOnline,
  isUploadingSubtitle,
  onTriggerUpload,
  onUploadFile,
  uploadError,
  deleteError,
  deletingSubtitleId,
  onDeleteSubtitle,
  subtitlesEnabled,
  onToggleSubtitles,
  subtitleFileInputRef,
  mediaTitle = '',
  subtitleOffset = 0,
  onAdjustOffset
}) => {
  const [activeTab, setActiveTab] = useState('local');
  const [searchQuery, setSearchQuery] = useState(mediaTitle);
  
  const hasNoSubtitles =
    !isSearchingOnline &&
    onlineSubtitles.length === 0 &&
    localSubtitles.length === 0 &&
    torrentSubtitles.length === 0;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchOnline(searchQuery);
    }
  };

  return (
    <div className="subtitle-menu">
      <button
        onClick={onToggle}
        className={`control-button ${currentSubtitle ? 'active' : ''}`}
        title="Subtitles"
      >
        <Subtitles size={20} />
      </button>

      {isOpen && (
        <div className="subtitle-dropdown">
          {/* Tab Navigation */}
          <div className="subtitle-tabs">
            <button 
              className={`subtitle-tab ${activeTab === 'local' ? 'active' : ''}`}
              onClick={() => setActiveTab('local')}
            >
              <Upload size={14} />
              My Subtitles
            </button>
            <button 
              className={`subtitle-tab ${activeTab === 'torrent' ? 'active' : ''}`}
              onClick={() => setActiveTab('torrent')}
            >
              <Languages size={14} />
              From Torrent
            </button>
            <button 
              className={`subtitle-tab ${activeTab === 'online' ? 'active' : ''}`}
              onClick={() => setActiveTab('online')}
            >
              <Globe size={14} />
              Search Online
            </button>
          </div>

          {/* Local Subtitles Tab */}
          {activeTab === 'local' && (
            <>
              <div className="subtitle-section">
                <button
                  onClick={() => onLoadSubtitle(null)}
                  className={`subtitle-option ${!currentSubtitle ? 'active' : ''}`}
                >
                  <Languages size={16} />
                  Off
                </button>

                {localSubtitles.map((subtitle) => (
                  <div key={subtitle.id} className="subtitle-option-row">
                    <button
                      onClick={() => onLoadSubtitle(subtitle)}
                      className={`subtitle-option ${currentSubtitle?.id === subtitle.id ? 'active' : ''}`}
                    >
                      <Languages size={16} />
                      {subtitle.label || subtitle.language || subtitle.name}
                    </button>
                    <button
                      className="subtitle-delete-button"
                      onClick={(event) => onDeleteSubtitle(event, subtitle)}
                      disabled={deletingSubtitleId === subtitle.id}
                      title="Delete subtitle"
                    >
                      {deletingSubtitleId === subtitle.id ? (
                        <Loader2 size={14} className="spinning" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                ))}

                {localSubtitles.length === 0 && (
                  <div className="no-subtitles">No uploaded subtitles yet</div>
                )}

                {deleteError && (
                  <div className="subtitle-error">
                    <AlertCircle size={14} />
                    <span>{deleteError}</span>
                  </div>
                )}

                <button
                  onClick={onTriggerUpload}
                  className="subtitle-option upload-option"
                  disabled={isUploadingSubtitle}
                >
                  {isUploadingSubtitle ? (
                    <Loader2 size={16} className="spinning" />
                  ) : (
                    <Upload size={16} />
                  )}
                  {isUploadingSubtitle ? 'Uploading...' : 'Upload Subtitle'}
                </button>

                <input
                  type="file"
                  accept=".srt,.vtt"
                  ref={subtitleFileInputRef}
                  style={{ display: 'none' }}
                  onChange={onUploadFile}
                />

                {uploadError && (
                  <div className="subtitle-error">
                    <AlertCircle size={14} />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {currentSubtitle && (
                <>
                  <div className="subtitle-section">
                    <span>Display</span>
                    <button
                      onClick={onToggleSubtitles}
                      className={`subtitle-option ${subtitlesEnabled ? 'active' : ''}`}
                    >
                      <Subtitles size={16} />
                      {subtitlesEnabled ? 'Hide' : 'Show'} Subtitles
                    </button>
                  </div>

                  <div className="subtitle-section">
                    <span>Sync</span>
                    <div className="subtitle-sync-controls">
                      <button
                        onClick={() => onAdjustOffset && onAdjustOffset(-500)}
                        className="subtitle-sync-button"
                        title="Delay subtitle by 0.5s"
                      >
                        <Minus size={14} />
                        -0.5s
                      </button>
                      <div className="subtitle-offset-display">
                        {subtitleOffset === 0 ? 'In Sync' : `${subtitleOffset > 0 ? '+' : ''}${(subtitleOffset / 1000).toFixed(1)}s`}
                      </div>
                      <button
                        onClick={() => onAdjustOffset && onAdjustOffset(500)}
                        className="subtitle-sync-button"
                        title="Advance subtitle by 0.5s"
                      >
                        <Plus size={14} />
                        +0.5s
                      </button>
                      {subtitleOffset !== 0 && (
                        <button
                          onClick={() => onAdjustOffset && onAdjustOffset(-subtitleOffset)}
                          className="subtitle-sync-button reset-button"
                          title="Reset sync"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                    <div className="subtitle-sync-hint">
                      Use [ and ] keys for quick sync
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Torrent Subtitles Tab */}
          {activeTab === 'torrent' && (
            <div className="subtitle-section">
              <button
                onClick={() => onLoadSubtitle(null)}
                className={`subtitle-option ${!currentSubtitle ? 'active' : ''}`}
              >
                <Languages size={16} />
                Off
              </button>

              {torrentSubtitles.map((subtitle) => (
                <button
                  key={subtitle.id}
                  onClick={() => onLoadSubtitle(subtitle)}
                  className={`subtitle-option ${currentSubtitle?.id === subtitle.id ? 'active' : ''}`}
                >
                  <Languages size={16} />
                  {subtitle.label || subtitle.language || subtitle.name}
                </button>
              ))}

              {torrentSubtitles.length === 0 && (
                <div className="no-subtitles">Torrent has no subtitle files</div>
              )}

              {currentSubtitle && (
                <>
                  <div className="subtitle-divider" />
                  <button
                    onClick={onToggleSubtitles}
                    className={`subtitle-option ${subtitlesEnabled ? 'active' : ''}`}
                  >
                    <Subtitles size={16} />
                    {subtitlesEnabled ? 'Hide' : 'Show'} Subtitles
                  </button>
                </>
              )}
            </div>
          )}

          {/* Online Search Tab */}
          {activeTab === 'online' && (
            <div className="subtitle-section">
              <form onSubmit={handleSearchSubmit} className="subtitle-search-form">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for subtitles..."
                  className="subtitle-search-input"
                  disabled={isSearchingOnline}
                />
                <button
                  type="submit"
                  className="subtitle-search-button"
                  disabled={isSearchingOnline || !searchQuery.trim()}
                >
                  {isSearchingOnline ? (
                    <Loader2 size={16} className="spinning" />
                  ) : (
                    <Search size={16} />
                  )}
                </button>
              </form>

              {isSearchingOnline && (
                <div className="subtitle-loading">
                  <Loader2 size={20} className="spinning" />
                  <span>Searching online databases...</span>
                </div>
              )}

              {!isSearchingOnline && onlineSubtitles.length > 0 && (
                <div className="online-subtitles-list">
                  {onlineSubtitles.map((subtitle, index) => {
                    const onlineIdentifier = `online-${subtitle.id || subtitle.url}`;
                    return (
                      <button
                        key={`online-${index}`}
                        onClick={() => onLoadOnlineSubtitle(subtitle)}
                        className={`subtitle-option online-subtitle-option ${currentSubtitle?.id === onlineIdentifier ? 'active' : ''}`}
                      >
                        <div className="online-subtitle-main">
                          <Globe size={16} />
                          <div className="online-subtitle-info">
                            <span className="online-subtitle-language">{subtitle.language}</span>
                            <span className="online-subtitle-source">{subtitle.source}</span>
                          </div>
                        </div>
                        {subtitle.downloads && (
                          <div className="online-subtitle-meta">
                            <Download size={12} />
                            <span>{subtitle.downloads.toLocaleString()}</span>
                          </div>
                        )}
                        {subtitle.score && (
                          <div className="online-subtitle-meta">
                            <Star size={12} />
                            <span>{subtitle.score}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {!isSearchingOnline && onlineSubtitles.length === 0 && !hasNoSubtitles && (
                <div className="no-subtitles">
                  <AlertCircle size={20} />
                  <p>No subtitles found</p>
                  <small>Try a different search term</small>
                </div>
              )}

              {hasNoSubtitles && !isSearchingOnline && (
                <div className="no-subtitles">
                  <Search size={20} />
                  <p>Search for subtitles online</p>
                  <small>Enter movie or show name above</small>
                </div>
              )}

              {currentSubtitle && onlineSubtitles.length > 0 && (
                <>
                  <div className="subtitle-divider" />
                  <button
                    onClick={onToggleSubtitles}
                    className={`subtitle-option ${subtitlesEnabled ? 'active' : ''}`}
                  >
                    <Subtitles size={16} />
                    {subtitlesEnabled ? 'Hide' : 'Show'} Subtitles
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

SubtitleMenu.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  currentSubtitle: PropTypes.object,
  localSubtitles: PropTypes.arrayOf(PropTypes.object).isRequired,
  torrentSubtitles: PropTypes.arrayOf(PropTypes.object).isRequired,
  onlineSubtitles: PropTypes.arrayOf(PropTypes.object).isRequired,
  onLoadSubtitle: PropTypes.func.isRequired,
  onLoadOnlineSubtitle: PropTypes.func.isRequired,
  onSearchOnline: PropTypes.func.isRequired,
  isSearchingOnline: PropTypes.bool.isRequired,
  isUploadingSubtitle: PropTypes.bool,
  onTriggerUpload: PropTypes.func.isRequired,
  onUploadFile: PropTypes.func.isRequired,
  uploadError: PropTypes.string,
  deleteError: PropTypes.string,
  deletingSubtitleId: PropTypes.string,
  onDeleteSubtitle: PropTypes.func.isRequired,
  subtitlesEnabled: PropTypes.bool.isRequired,
  onToggleSubtitles: PropTypes.func.isRequired,
  subtitleFileInputRef: PropTypes.object.isRequired,
  mediaTitle: PropTypes.string,
  subtitleOffset: PropTypes.number,
  onAdjustOffset: PropTypes.func
};

SubtitleMenu.defaultProps = {
  currentSubtitle: null,
  isUploadingSubtitle: false,
  uploadError: null,
  deleteError: null,
  deletingSubtitleId: null,
  mediaTitle: '',
  subtitleOffset: 0,
  onAdjustOffset: null
};

export default SubtitleMenu;
