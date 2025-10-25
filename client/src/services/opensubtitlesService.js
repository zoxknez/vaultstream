/**
 * OpenSubtitles API Service
 *
 * Deep integration for automatic subtitle download and management
 * Uses OpenSubtitles.com REST API v1
 *
 * Features:
 * - Auto-match by IMDB ID (from TMDB)
 * - Multi-language support
 * - FPS/duration sync checking
 * - Download and convert to VTT format
 * - Caching for better performance
 */

const OPENSUBTITLES_API_URL = 'https://api.opensubtitles.com/api/v1';
const OPENSUBTITLES_USER_AGENT = 'StreamVault v1.0'; // Required by OpenSubtitles API

class OpenSubtitlesService {
  constructor() {
    this.apiKey = import.meta.env.VITE_OPENSUBTITLES_API_KEY;
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hour
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Login to OpenSubtitles API and get auth token
   */
  async login() {
    // Check if we have a valid token
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await fetch(`${OPENSUBTITLES_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.apiKey,
          'User-Agent': OPENSUBTITLES_USER_AGENT
        },
        body: JSON.stringify({
          username: import.meta.env.VITE_OPENSUBTITLES_USERNAME || '',
          password: import.meta.env.VITE_OPENSUBTITLES_PASSWORD || ''
        })
      });

      if (!response.ok) {
        console.warn('OpenSubtitles login failed, using anonymous access');
        return null;
      }

      const data = await response.json();
      this.token = data.token;
      // Token expires in 24 hours, we'll refresh after 23 hours
      this.tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;

      return this.token;
    } catch (error) {
      console.error('OpenSubtitles login error:', error);
      return null;
    }
  }

  /**
   * Get headers for API requests
   */
  async getHeaders() {
    const token = await this.login();

    const headers = {
      'Content-Type': 'application/json',
      'Api-Key': this.apiKey,
      'User-Agent': OPENSUBTITLES_USER_AGENT
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Search subtitles by IMDB ID
   * @param {string} imdbId - IMDB ID (e.g., "tt1234567")
   * @param {string|string[]} languages - Language codes (e.g., "en", "sr", ["en", "sr"])
   * @param {Object} options - Additional search options
   */
  async searchByImdbId(imdbId, languages = 'en', options = {}) {
    if (!this.apiKey) {
      console.warn('OpenSubtitles API key not configured');
      return [];
    }

    // Normalize IMDB ID (remove "tt" prefix if present)
    const cleanImdbId = imdbId.replace(/^tt/, '');

    // Create cache key
    const languageArray = Array.isArray(languages) ? languages : [languages];
    const cacheKey = `imdb:${cleanImdbId}:${languageArray.join(',')}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('OpenSubtitles cache hit:', cacheKey);
        return cached.data;
      }
    }

    try {
      const headers = await this.getHeaders();

      // Build query params
      const params = new URLSearchParams({
        imdb_id: cleanImdbId,
        languages: languageArray.join(','),
        order_by: 'download_count' // Most popular first
      });

      // Add optional params
      if (options.seasonNumber) {
        params.append('season_number', options.seasonNumber);
      }
      if (options.episodeNumber) {
        params.append('episode_number', options.episodeNumber);
      }
      if (options.movieHash) {
        params.append('moviehash', options.movieHash);
      }

      const response = await fetch(`${OPENSUBTITLES_API_URL}/subtitles?${params}`, { headers });

      if (!response.ok) {
        throw new Error(`OpenSubtitles API error: ${response.status}`);
      }

      const data = await response.json();
      const subtitles = this.formatSubtitles(data.data || []);

      // Cache results
      this.cache.set(cacheKey, {
        data: subtitles,
        timestamp: Date.now()
      });

      return subtitles;
    } catch (error) {
      console.error('OpenSubtitles search error:', error);
      return [];
    }
  }

  /**
   * Search subtitles by query (movie/show name)
   * @param {string} query - Movie or show name
   * @param {string|string[]} languages - Language codes
   */
  async searchByQuery(query, languages = 'en') {
    if (!this.apiKey) {
      console.warn('OpenSubtitles API key not configured');
      return [];
    }

    const languageArray = Array.isArray(languages) ? languages : [languages];
    const cacheKey = `query:${query}:${languageArray.join(',')}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const headers = await this.getHeaders();

      const params = new URLSearchParams({
        query: query,
        languages: languageArray.join(','),
        order_by: 'download_count'
      });

      const response = await fetch(`${OPENSUBTITLES_API_URL}/subtitles?${params}`, { headers });

      if (!response.ok) {
        throw new Error(`OpenSubtitles API error: ${response.status}`);
      }

      const data = await response.json();
      const subtitles = this.formatSubtitles(data.data || []);

      // Cache results
      this.cache.set(cacheKey, {
        data: subtitles,
        timestamp: Date.now()
      });

      return subtitles;
    } catch (error) {
      console.error('OpenSubtitles search error:', error);
      return [];
    }
  }

  /**
   * Format subtitle data for UI consumption
   */
  formatSubtitles(subtitles) {
    return subtitles.map((sub) => ({
      id: sub.attributes.subtitle_id,
      language: sub.attributes.language,
      languageCode: sub.attributes.language,
      languageName: this.getLanguageName(sub.attributes.language),
      fileName: sub.attributes.files?.[0]?.file_name || 'Unknown',
      downloadCount: sub.attributes.download_count || 0,
      uploadDate: sub.attributes.upload_date,
      uploader: sub.attributes.uploader?.name || 'Anonymous',
      rating: sub.attributes.ratings || 0,
      fps: sub.attributes.fps,
      movieHashMatch: sub.attributes.moviehash_match || false,
      hearingImpaired: sub.attributes.hearing_impaired || false,
      foreignPartsOnly: sub.attributes.foreign_parts_only || false,
      fileId: sub.attributes.files?.[0]?.file_id,
      downloadUrl: sub.attributes.files?.[0]?.file_id,
      fromTrusted: sub.attributes.from_trusted || false,
      aiTranslated: sub.attributes.ai_translated || false,
      machineTranslated: sub.attributes.machine_translated || false,
      release: sub.attributes.release || '',
      comments: sub.attributes.comments || '',
      relatedLinks: sub.attributes.related_links || []
    }));
  }

  /**
   * Download subtitle file
   * @param {string} fileId - Subtitle file ID
   */
  async downloadSubtitle(fileId) {
    if (!this.apiKey) {
      throw new Error('OpenSubtitles API key not configured');
    }

    try {
      const headers = await this.getHeaders();

      const response = await fetch(`${OPENSUBTITLES_API_URL}/download`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ file_id: fileId })
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const data = await response.json();
      return data.link; // Direct download URL
    } catch (error) {
      console.error('OpenSubtitles download error:', error);
      throw error;
    }
  }

  /**
   * Convert SRT subtitle to VTT format (for HTML5 video)
   * @param {string} srtContent - SRT subtitle content
   */
  convertSrtToVtt(srtContent) {
    // Add WEBVTT header
    let vtt = 'WEBVTT\n\n';

    // Replace comma with dot in timestamps (SRT uses comma, VTT uses dot)
    vtt += srtContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

    return vtt;
  }

  /**
   * Fetch and convert subtitle to VTT format
   * @param {string} fileId - Subtitle file ID
   */
  async fetchAndConvertSubtitle(fileId) {
    try {
      // Download subtitle
      const downloadUrl = await this.downloadSubtitle(fileId);

      // Fetch the subtitle content
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch subtitle file');
      }

      let content = await response.text();

      // Detect format and convert if needed
      if (content.startsWith('WEBVTT')) {
        return content; // Already VTT
      } else {
        // Assume SRT and convert
        return this.convertSrtToVtt(content);
      }
    } catch (error) {
      console.error('Subtitle fetch/convert error:', error);
      throw error;
    }
  }

  /**
   * Get language name from code
   */
  getLanguageName(code) {
    const languages = {
      en: 'English',
      sr: 'Serbian',
      bs: 'Bosnian',
      hr: 'Croatian',
      sl: 'Slovenian',
      mk: 'Macedonian',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ru: 'Russian',
      ar: 'Arabic',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean'
    };

    return languages[code] || code.toUpperCase();
  }

  /**
   * Get popular subtitle languages for region
   */
  getPopularLanguages(region = 'balkan') {
    const regions = {
      balkan: ['sr', 'bs', 'hr', 'sl', 'mk', 'en'],
      europe: ['en', 'de', 'fr', 'es', 'it', 'pt'],
      asia: ['zh', 'ja', 'ko', 'en'],
      all: ['en', 'sr', 'es', 'fr', 'de', 'pt', 'it', 'ru', 'ar']
    };

    return regions[region] || regions.all;
  }

  /**
   * Auto-select best subtitle based on criteria
   * @param {Array} subtitles - Array of subtitle objects
   * @param {Object} preferences - User preferences
   */
  selectBestSubtitle(subtitles, preferences = {}) {
    if (!subtitles || subtitles.length === 0) {
      return null;
    }

    // Score each subtitle
    const scored = subtitles.map((sub) => {
      let score = 0;

      // Prefer user's language
      if (preferences.language && sub.languageCode === preferences.language) {
        score += 100;
      }

      // Download count (popularity)
      score += Math.min(sub.downloadCount / 100, 50);

      // Rating
      score += (sub.rating || 0) * 10;

      // Movie hash match (perfect sync)
      if (sub.movieHashMatch) {
        score += 30;
      }

      // From trusted uploader
      if (sub.fromTrusted) {
        score += 20;
      }

      // Penalize machine/AI translated
      if (sub.aiTranslated || sub.machineTranslated) {
        score -= 30;
      }

      // Hearing impaired preference
      if (preferences.hearingImpaired === sub.hearingImpaired) {
        score += 10;
      }

      // FPS match
      if (preferences.fps && Math.abs(sub.fps - preferences.fps) < 0.1) {
        score += 15;
      }

      return { ...sub, score };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    return scored[0];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
const opensubtitlesService = new OpenSubtitlesService();
export default opensubtitlesService;
