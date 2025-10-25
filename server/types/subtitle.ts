/**
 * Subtitle Types
 */

export interface Subtitle {
  id: string;
  language: string;
  fileName: string;
  url?: string;
  downloadCount?: number;
  rating?: number;
  format?: 'srt' | 'vtt' | 'ass' | 'ssa';
}

export interface SubtitleSearchParams {
  query?: string;
  imdbId?: string;
  tmdbId?: string;
  season?: number;
  episode?: number;
  language?: string;
}

export interface SubtitleSearchResult {
  subtitles: Subtitle[];
  count: number;
  source: string;
}

export interface SubtitleDownloadResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
}
