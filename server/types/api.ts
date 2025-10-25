/**
 * API Request/Response Types
 */

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: APIMetadata;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

export interface APIMetadata {
  page?: number;
  pageSize?: number;
  total?: number;
  hasMore?: boolean;
  timestamp?: string;
  requestId?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  query: string;
  type?: 'movie' | 'tv' | 'all';
  year?: number;
  genre?: string;
}

export interface SearchResult {
  id: string;
  type: 'movie' | 'tv';
  title: string;
  year?: number;
  poster?: string;
  overview?: string;
  rating?: number;
}

export interface CleanedTorrentName {
  title: string;
  year: string | null;
}

export interface MetadataResult {
  Title: string;
  Year?: string;
  imdbRating?: string | null;
  imdbVotes?: string | null;
  Plot?: string;
  Director?: string;
  Actors?: string;
  Poster?: string | null;
  Backdrop?: string | null;
  Genre?: string;
  Runtime?: string | null;
  Rated?: string;
  imdbID?: string;
  tmdbID?: number;
  Type?: string;
  source?: string;
}
