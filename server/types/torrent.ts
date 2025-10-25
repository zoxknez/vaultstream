/**
 * Torrent Types
 */

export interface TorrentInfo {
  infoHash: string;
  name: string;
  length: number;
  files: TorrentFile[];
  created?: Date;
  createdBy?: string;
  comment?: string;
  announce?: string[];
  urlList?: string[];
}

export interface TorrentFile {
  name: string;
  length: number;
  path: string;
  offset: number;
}

export interface TorrentStats {
  downloaded: number;
  uploaded: number;
  downloadSpeed: number;
  uploadSpeed: number;
  progress: number;
  ratio: number;
  numPeers: number;
  timeRemaining: number;
}

export interface TorrentMetadata {
  infoHash: string;
  name: string;
  size: number;
  files: number;
  createdAt: string;
  metadata?: MovieMetadata | TVShowMetadata;
}

export interface MovieMetadata {
  type: 'movie';
  title: string;
  year?: number;
  tmdbId?: string;
  imdbId?: string;
  poster?: string;
  backdrop?: string;
  overview?: string;
  rating?: number;
  genres?: string[];
  runtime?: number;
  releaseDate?: string;
}

export interface TVShowMetadata {
  type: 'tv';
  title: string;
  season?: number;
  episode?: number;
  tmdbId?: string;
  imdbId?: string;
  poster?: string;
  backdrop?: string;
  overview?: string;
  rating?: number;
  genres?: string[];
  episodeTitle?: string;
  airDate?: string;
}

export type Metadata = MovieMetadata | TVShowMetadata;

export interface TorrentUploadOptions {
  file?: Express.Multer.File;
  magnetUri?: string;
  skipMetadata?: boolean;
}

export interface TorrentAddResult {
  success: boolean;
  infoHash?: string;
  name?: string;
  error?: string;
}
