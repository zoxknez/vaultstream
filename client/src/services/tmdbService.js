/**
 * TMDB (The Movie Database) API Service
 * Fetches movie/TV show metadata: posters, ratings, descriptions, cast
 */

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'demo_key';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Image sizes
const IMAGE_SIZES = {
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original'
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original'
  },
  profile: {
    small: 'w45',
    medium: 'w185',
    large: 'h632',
    original: 'original'
  }
};

class TMDBService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hour
  }

  /**
   * Generic API request with caching
   */
  async request(endpoint, params = {}) {
    const queryParams = new URLSearchParams({
      api_key: TMDB_API_KEY,
      ...params
    });
    
    const url = `${TMDB_BASE_URL}${endpoint}?${queryParams}`;
    const cacheKey = url;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('🎬 TMDB: Cache hit for', endpoint);
        return cached.data;
      }
    }

    try {
      console.log('🎬 TMDB: Fetching', endpoint);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('🎬 TMDB: Request failed', error);
      throw error;
    }
  }

  /**
   * Parse torrent title to extract movie/TV show name and year
   * Examples:
   * - "Dune Part Two 2024 2160p BluRay" → { name: "Dune Part Two", year: 2024 }
   * - "Breaking.Bad.S01E01.720p" → { name: "Breaking Bad", season: 1, episode: 1 }
   */
  parseTorrentTitle(title) {
    if (!title) return null;

    // Clean title
    let cleanTitle = title
      .replace(/\.(mkv|mp4|avi|mov|wmv|flv)$/i, '') // Remove extensions
      .replace(/\b(1080p|720p|480p|2160p|4k|bluray|webrip|web-dl|hdtv|brrip|dvdrip|x264|x265|hevc|aac|dts|dd5\.1|10bit)\b/gi, '') // Remove quality tags
      .replace(/\[.*?\]/g, '') // Remove bracketed text
      .replace(/\(.*?\)/g, '') // Remove parentheses
      .trim();

    // Try to extract year (4 digits)
    const yearMatch = cleanTitle.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1]) : null;
    if (yearMatch) {
      cleanTitle = cleanTitle.replace(yearMatch[0], '').trim();
    }

    // Check if it's a TV show (S01E01 pattern)
    const tvMatch = cleanTitle.match(/s(\d{1,2})e(\d{1,2})/i);
    if (tvMatch) {
      const name = cleanTitle.replace(/s\d{1,2}e\d{1,2}.*/i, '').replace(/[._-]/g, ' ').trim();
      return {
        name,
        year,
        type: 'tv',
        season: parseInt(tvMatch[1]),
        episode: parseInt(tvMatch[2])
      };
    }

    // It's a movie
    const name = cleanTitle.replace(/[._-]/g, ' ').trim();
    return {
      name,
      year,
      type: 'movie'
    };
  }

  /**
   * Search for movie by title
   */
  async searchMovie(query, year = null) {
    const params = {
      query,
      language: 'en-US',
      include_adult: false
    };
    
    if (year) {
      params.year = year;
    }

    const data = await this.request('/search/movie', params);
    return data.results || [];
  }

  /**
   * Search for TV show by title
   */
  async searchTV(query, year = null) {
    const params = {
      query,
      language: 'en-US',
      include_adult: false
    };
    
    if (year) {
      params.first_air_date_year = year;
    }

    const data = await this.request('/search/tv', params);
    return data.results || [];
  }

  /**
   * Get movie details by ID
   */
  async getMovieDetails(movieId) {
    return await this.request(`/movie/${movieId}`, {
      append_to_response: 'credits,videos,similar,recommendations'
    });
  }

  /**
   * Get TV show details by ID
   */
  async getTVDetails(tvId) {
    return await this.request(`/tv/${tvId}`, {
      append_to_response: 'credits,videos,similar,recommendations'
    });
  }

  /**
   * Get TV season details
   */
  async getTVSeasonDetails(tvId, seasonNumber) {
    return await this.request(`/tv/${tvId}/season/${seasonNumber}`);
  }

  /**
   * Get TV episode details
   */
  async getTVEpisodeDetails(tvId, seasonNumber, episodeNumber) {
    return await this.request(`/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`);
  }

  /**
   * Search for content (auto-detect movie vs TV)
   */
  async searchContent(title) {
    const parsed = this.parseTorrentTitle(title);
    if (!parsed) return null;

    console.log('🎬 TMDB: Parsed title:', parsed);

    try {
      if (parsed.type === 'tv') {
        const results = await this.searchTV(parsed.name, parsed.year);
        if (results.length > 0) {
          const details = await this.getTVDetails(results[0].id);
          
          // Get episode details if available
          if (parsed.season && parsed.episode) {
            try {
              const episode = await this.getTVEpisodeDetails(
                results[0].id, 
                parsed.season, 
                parsed.episode
              );
              return {
                ...details,
                currentEpisode: episode,
                season: parsed.season,
                episode: parsed.episode,
                type: 'tv'
              };
            } catch (error) {
              console.warn('🎬 TMDB: Episode details not found', error);
            }
          }
          
          return { ...details, type: 'tv' };
        }
      } else {
        const results = await this.searchMovie(parsed.name, parsed.year);
        if (results.length > 0) {
          const details = await this.getMovieDetails(results[0].id);
          return { ...details, type: 'movie' };
        }
      }

      return null;
    } catch (error) {
      console.error('🎬 TMDB: Search failed', error);
      return null;
    }
  }

  /**
   * Get full image URL
   */
  getImageUrl(path, type = 'poster', size = 'medium') {
    if (!path) return null;
    
    const sizeKey = IMAGE_SIZES[type]?.[size] || IMAGE_SIZES[type]?.medium || 'w500';
    return `${TMDB_IMAGE_BASE_URL}/${sizeKey}${path}`;
  }

  /**
   * Get poster URL
   */
  getPosterUrl(posterPath, size = 'medium') {
    return this.getImageUrl(posterPath, 'poster', size);
  }

  /**
   * Get backdrop URL
   */
  getBackdropUrl(backdropPath, size = 'large') {
    return this.getImageUrl(backdropPath, 'backdrop', size);
  }

  /**
   * Get profile URL (for actors)
   */
  getProfileUrl(profilePath, size = 'medium') {
    return this.getImageUrl(profilePath, 'profile', size);
  }

  /**
   * Format content data for display
   */
  formatForDisplay(tmdbData) {
    if (!tmdbData) return null;

    const isTV = tmdbData.type === 'tv';
    
    return {
      id: tmdbData.id,
      type: tmdbData.type,
      title: isTV ? tmdbData.name : tmdbData.title,
      originalTitle: isTV ? tmdbData.original_name : tmdbData.original_title,
      year: isTV 
        ? new Date(tmdbData.first_air_date).getFullYear() 
        : new Date(tmdbData.release_date).getFullYear(),
      rating: tmdbData.vote_average,
      voteCount: tmdbData.vote_count,
      overview: tmdbData.overview,
      poster: this.getPosterUrl(tmdbData.poster_path, 'large'),
      posterSmall: this.getPosterUrl(tmdbData.poster_path, 'small'),
      backdrop: this.getBackdropUrl(tmdbData.backdrop_path),
      genres: tmdbData.genres?.map(g => g.name) || [],
      runtime: tmdbData.runtime || (isTV ? tmdbData.episode_run_time?.[0] : null),
      
      // TV specific
      ...(isTV && {
        numberOfSeasons: tmdbData.number_of_seasons,
        numberOfEpisodes: tmdbData.number_of_episodes,
        status: tmdbData.status,
        networks: tmdbData.networks?.map(n => n.name) || [],
        currentSeason: tmdbData.season,
        currentEpisode: tmdbData.episode,
        episodeTitle: tmdbData.currentEpisode?.name,
        episodeOverview: tmdbData.currentEpisode?.overview,
        episodeStillPath: tmdbData.currentEpisode?.still_path 
          ? this.getImageUrl(tmdbData.currentEpisode.still_path, 'backdrop', 'medium')
          : null
      }),
      
      // Cast (top 5)
      cast: tmdbData.credits?.cast?.slice(0, 5).map(person => ({
        id: person.id,
        name: person.name,
        character: person.character,
        profilePath: this.getProfileUrl(person.profile_path, 'small')
      })) || [],
      
      // Director/Creator
      director: tmdbData.credits?.crew?.find(c => c.job === 'Director')?.name,
      creators: tmdbData.created_by?.map(c => c.name) || [],
      
      // Similar content
      similar: tmdbData.similar?.results?.slice(0, 6).map(item => ({
        id: item.id,
        title: item.title || item.name,
        poster: this.getPosterUrl(item.poster_path, 'small')
      })) || []
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🎬 TMDB: Cache cleared');
  }
}

// Export singleton instance
const tmdbService = new TMDBService();
export default tmdbService;
