import React from 'react';
import { 
  Search, 
  Film, 
  FolderOpen, 
  Inbox,
  AlertCircle,
  WifiOff,
  FileQuestion,
  PlayCircle
} from 'lucide-react';
import './EmptyState.css';

const icons = {
  search: Search,
  film: Film,
  folder: FolderOpen,
  inbox: Inbox,
  alert: AlertCircle,
  offline: WifiOff,
  question: FileQuestion,
  play: PlayCircle
};

const EmptyState = ({ 
  icon = 'inbox',
  title = 'No items found',
  description = 'There are no items to display',
  action = null,
  actionLabel = 'Get Started',
  onAction = null,
  className = ''
}) => {
  const IconComponent = icons[icon] || icons.inbox;

  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-content">
        <div className="empty-state-icon">
          <IconComponent size={48} strokeWidth={1.5} />
        </div>
        <h3 className="empty-state-title">{title}</h3>
        <p className="empty-state-description">{description}</p>
        {(action || onAction) && (
          <button 
            className="empty-state-button"
            onClick={onAction}
          >
            {action || actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

// Preset empty states
export const NoSearchResults = ({ query, onClear }) => (
  <EmptyState
    icon="search"
    title="No results found"
    description={query ? `No torrents match "${query}". Try different keywords.` : 'Try searching for movies or TV shows.'}
    action={query ? 'Clear Search' : 'Start Searching'}
    onAction={onClear}
  />
);

export const NoTorrents = ({ onAddTorrent }) => (
  <EmptyState
    icon="film"
    title="No torrents yet"
    description="Add your first torrent to start streaming instantly"
    action="Add Torrent"
    onAction={onAddTorrent}
  />
);

export const NoRecentVideos = ({ onBrowse }) => (
  <EmptyState
    icon="play"
    title="No recent videos"
    description="Start watching to build your viewing history"
    action="Browse Library"
    onAction={onBrowse}
  />
);

export const EmptyCache = () => (
  <EmptyState
    icon="folder"
    title="Cache is empty"
    description="No cached files found. Start streaming to populate the cache."
  />
);

export const NetworkError = ({ onRetry }) => (
  <EmptyState
    icon="offline"
    title="Connection error"
    description="Unable to connect to the server. Check your network and try again."
    action="Retry"
    onAction={onRetry}
  />
);

export const NotFound = () => (
  <EmptyState
    icon="question"
    title="Not found"
    description="The page or resource you're looking for doesn't exist."
  />
);

export const LoadingError = ({ error, onRetry }) => (
  <EmptyState
    icon="alert"
    title="Failed to load"
    description={error || "Something went wrong while loading the data."}
    action="Try Again"
    onAction={onRetry}
  />
);

export default EmptyState;
