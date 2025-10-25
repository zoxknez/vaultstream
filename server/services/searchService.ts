import { logger } from '../utils/logger';
import { cacheService } from './cacheService';

export interface SearchResult {
  id: string;
  title: string;
  year?: number;
  size: number;
  seeds: number;
  peers: number;
  magnet: string;
  category: string;
  quality?: string;
  type: 'movie' | 'series' | 'episode';
  imdbId?: string;
  tmdbId?: string;
  poster?: string;
  description?: string;
  source: string;
}

export interface SearchOptions {
  query: string;
  category?: string;
  quality?: string;
  year?: number;
  limit?: number;
  sortBy?: 'seeds' | 'size' | 'date' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResponse {
  success: boolean;
  results?: SearchResult[];
  total?: number;
  sources?: string[];
  error?: string;
}

export class SearchService {
  private availableSources = [
    'apibay',
    'yts',
    '1337x',
    'eztv',
    'torrentgalaxy'
  ];

  /**
   * Search for torrents
   */
  async searchTorrents(options: SearchOptions): Promise<SearchResponse> {
    try {
      logger.info(`Searching torrents: ${options.query}`, {
        category: options.category,
        quality: options.quality,
        limit: options.limit
      });

      // Check cache first
      const cacheKey = `search:${JSON.stringify(options)}`;
      const cachedResults = await cacheService.get(cacheKey);
      
      if (cachedResults) {
        logger.info('Search results found in cache');
        return {
          success: true,
          results: cachedResults.results,
          total: cachedResults.total,
          sources: cachedResults.sources
        };
      }

      const results: SearchResult[] = [];
      const sources: string[] = [];

      // Search each source
      for (const source of this.availableSources) {
        try {
          const sourceResults = await this.searchSource(source, options);
          results.push(...sourceResults);
          sources.push(source);
        } catch (error) {
          logger.warn(`Search failed for source ${source}:`, error);
        }
      }

      // Sort results
      const sortedResults = this.sortResults(results, options.sortBy, options.sortOrder);

      // Limit results
      const limitedResults = sortedResults.slice(0, options.limit || 50);

      // Cache results
      await cacheService.set(cacheKey, {
        results: limitedResults,
        total: results.length,
        sources
      }, 300); // Cache for 5 minutes

      logger.info(`Search completed: ${limitedResults.length} results from ${sources.length} sources`);

      return {
        success: true,
        results: limitedResults,
        total: results.length,
        sources
      };
    } catch (error) {
      logger.error('Search torrents error:', error);
      return {
        success: false,
        error: 'Failed to search torrents'
      };
    }
  }

  /**
   * Get available search sources
   */
  async getAvailableSources(): Promise<{
    success: boolean;
    sources?: string[];
    error?: string;
  }> {
    try {
      return {
        success: true,
        sources: this.availableSources
      };
    } catch (error) {
      logger.error('Get available sources error:', error);
      return {
        success: false,
        error: 'Failed to get available sources'
      };
    }
  }

  /**
   * Search a specific source
   */
  private async searchSource(source: string, options: SearchOptions): Promise<SearchResult[]> {
    switch (source) {
      case 'apibay':
        return this.searchApibay(options);
      case 'yts':
        return this.searchYts(options);
      case '1337x':
        return this.search1337x(options);
      case 'eztv':
        return this.searchEztv(options);
      case 'torrentgalaxy':
        return this.searchTorrentGalaxy(options);
      default:
        return [];
    }
  }

  /**
   * Search Apibay
   */
  private async searchApibay(options: SearchOptions): Promise<SearchResult[]> {
    try {
      // Mock implementation - replace with actual API call
      const mockResults: SearchResult[] = [
        {
          id: 'apibay-1',
          title: `${options.query} (2023)`,
          year: 2023,
          size: 1500000000, // 1.5GB
          seeds: 45,
          peers: 12,
          magnet: `magnet:?xt=urn:btih:${this.generateHash()}&dn=${encodeURIComponent(options.query)}`,
          category: options.category || 'movies',
          quality: options.quality || '1080p',
          type: 'movie',
          source: 'apibay'
        }
      ];

      return mockResults;
    } catch (error) {
      logger.error('Apibay search error:', error);
      return [];
    }
  }

  /**
   * Search YTS
   */
  private async searchYts(options: SearchOptions): Promise<SearchResult[]> {
    try {
      // Mock implementation - replace with actual API call
      const mockResults: SearchResult[] = [
        {
          id: 'yts-1',
          title: `${options.query} (2023)`,
          year: 2023,
          size: 2000000000, // 2GB
          seeds: 78,
          peers: 23,
          magnet: `magnet:?xt=urn:btih:${this.generateHash()}&dn=${encodeURIComponent(options.query)}`,
          category: 'movies',
          quality: '1080p',
          type: 'movie',
          source: 'yts'
        }
      ];

      return mockResults;
    } catch (error) {
      logger.error('YTS search error:', error);
      return [];
    }
  }

  /**
   * Search 1337x
   */
  private async search1337x(options: SearchOptions): Promise<SearchResult[]> {
    try {
      // Mock implementation - replace with actual API call
      const mockResults: SearchResult[] = [
        {
          id: '1337x-1',
          title: `${options.query} (2023)`,
          year: 2023,
          size: 1800000000, // 1.8GB
          seeds: 56,
          peers: 18,
          magnet: `magnet:?xt=urn:btih:${this.generateHash()}&dn=${encodeURIComponent(options.query)}`,
          category: options.category || 'movies',
          quality: options.quality || '1080p',
          type: 'movie',
          source: '1337x'
        }
      ];

      return mockResults;
    } catch (error) {
      logger.error('1337x search error:', error);
      return [];
    }
  }

  /**
   * Search EZTV
   */
  private async searchEztv(options: SearchOptions): Promise<SearchResult[]> {
    try {
      // Mock implementation - replace with actual API call
      const mockResults: SearchResult[] = [
        {
          id: 'eztv-1',
          title: `${options.query} S01E01`,
          year: 2023,
          size: 800000000, // 800MB
          seeds: 34,
          peers: 8,
          magnet: `magnet:?xt=urn:btih:${this.generateHash()}&dn=${encodeURIComponent(options.query)}`,
          category: 'tv',
          quality: '720p',
          type: 'episode',
          source: 'eztv'
        }
      ];

      return mockResults;
    } catch (error) {
      logger.error('EZTV search error:', error);
      return [];
    }
  }

  /**
   * Search TorrentGalaxy
   */
  private async searchTorrentGalaxy(options: SearchOptions): Promise<SearchResult[]> {
    try {
      // Mock implementation - replace with actual API call
      const mockResults: SearchResult[] = [
        {
          id: 'tg-1',
          title: `${options.query} (2023)`,
          year: 2023,
          size: 2200000000, // 2.2GB
          seeds: 89,
          peers: 31,
          magnet: `magnet:?xt=urn:btih:${this.generateHash()}&dn=${encodeURIComponent(options.query)}`,
          category: options.category || 'movies',
          quality: options.quality || '1080p',
          type: 'movie',
          source: 'torrentgalaxy'
        }
      ];

      return mockResults;
    } catch (error) {
      logger.error('TorrentGalaxy search error:', error);
      return [];
    }
  }

  /**
   * Sort search results
   */
  private sortResults(results: SearchResult[], sortBy?: string, sortOrder?: string): SearchResult[] {
    if (!sortBy) return results;

    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'seeds':
          comparison = a.seeds - b.seeds;
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'date':
          comparison = (a.year || 0) - (b.year || 0);
          break;
        case 'relevance':
          // Simple relevance based on title match
          comparison = a.title.localeCompare(b.title);
          break;
        default:
          return 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Generate mock hash
   */
  private generateHash(): string {
    return Math.random().toString(36).substr(2, 40);
  }
}

export const searchService = new SearchService();
export default searchService;