/**
 * 🔍 STREAMVAULT SEARCH ROUTES
 * Advanced search and discovery endpoints
 */

const express = require('express');
const { z } = require('zod');
const { logger } = require('../utils/logger');
const { searchService } = require('../services/searchService');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// Validation schemas
const searchSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
    category: z.string().optional(),
    sort: z.enum(['relevance', 'date', 'size', 'seeds', 'downloads']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    quality: z.enum(['720p', '1080p', '4K', '8K']).optional(),
    year: z.string().regex(/^\d{4}$/).optional(),
    genre: z.string().optional()
  })
});

const advancedSearchSchema = z.object({
  body: z.object({
    query: z.string().min(1, 'Search query is required'),
    filters: z.object({
      category: z.string().optional(),
      quality: z.enum(['720p', '1080p', '4K', '8K']).optional(),
      year: z.number().min(1900).max(new Date().getFullYear()).optional(),
      genre: z.string().optional(),
      size: z.object({
        min: z.number().optional(),
        max: z.number().optional()
      }).optional(),
      seeds: z.object({
        min: z.number().optional(),
        max: z.number().optional()
      }).optional()
    }).optional(),
    sort: z.enum(['relevance', 'date', 'size', 'seeds', 'downloads']).optional(),
    page: z.number().min(1).optional(),
    limit: z.number().min(1).max(100).optional()
  })
});

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search torrents
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [relevance, date, size, seeds, downloads]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: quality
 *         schema:
 *           type: string
 *           enum: [720p, 1080p, 4K, 8K]
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 */
router.get('/', validateRequest(searchSchema), async (req, res, next) => {
  try {
    const { q, category, sort, page, limit, quality, year, genre } = req.query;
    
    const searchOptions = {
      category,
      sort: sort || 'relevance',
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      quality,
      year: year ? parseInt(year) : undefined,
      genre
    };
    
    const result = await searchService.search(q, searchOptions);
    
    if (result.success) {
      res.json({
        success: true,
        results: result.results,
        pagination: result.pagination,
        filters: result.filters,
        suggestions: result.suggestions
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Search error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/search/advanced:
 *   post:
 *     summary: Advanced search with filters
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *               filters:
 *                 type: object
 *                 properties:
 *                   category:
 *                     type: string
 *                   quality:
 *                     type: string
 *                     enum: [720p, 1080p, 4K, 8K]
 *                   year:
 *                     type: integer
 *                   genre:
 *                     type: string
 *                   size:
 *                     type: object
 *                     properties:
 *                       min:
 *                         type: number
 *                       max:
 *                         type: number
 *                   seeds:
 *                     type: object
 *                     properties:
 *                       min:
 *                         type: number
 *                       max:
 *                         type: number
 *               sort:
 *                 type: string
 *                 enum: [relevance, date, size, seeds, downloads]
 *               page:
 *                 type: integer
 *               limit:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Advanced search results retrieved successfully
 */
router.post('/advanced', validateRequest(advancedSearchSchema), async (req, res, next) => {
  try {
    const { query, filters, sort, page, limit } = req.body;
    
    const searchOptions = {
      filters,
      sort: sort || 'relevance',
      page: page || 1,
      limit: limit || 20
    };
    
    const result = await searchService.advancedSearch(query, searchOptions);
    
    if (result.success) {
      res.json({
        success: true,
        results: result.results,
        pagination: result.pagination,
        appliedFilters: result.appliedFilters,
        suggestions: result.suggestions
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Advanced search error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search suggestions retrieved successfully
 */
router.get('/suggestions', async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        suggestions: []
      });
    }
    
    const result = await searchService.getSuggestions(q, parseInt(limit) || 10);
    
    if (result.success) {
      res.json({
        success: true,
        suggestions: result.suggestions
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get suggestions error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/search/trending:
 *   get:
 *     summary: Get trending searches
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Trending searches retrieved successfully
 */
router.get('/trending', async (req, res, next) => {
  try {
    const { limit } = req.query;
    
    const result = await searchService.getTrendingSearches(parseInt(limit) || 20);
    
    if (result.success) {
      res.json({
        success: true,
        trending: result.trending
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get trending searches error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/search/categories:
 *   get:
 *     summary: Get available categories
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', async (req, res, next) => {
  try {
    const result = await searchService.getCategories();
    
    if (result.success) {
      res.json({
        success: true,
        categories: result.categories
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get categories error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/search/genres:
 *   get:
 *     summary: Get available genres
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Genres retrieved successfully
 */
router.get('/genres', async (req, res, next) => {
  try {
    const result = await searchService.getGenres();
    
    if (result.success) {
      res.json({
        success: true,
        genres: result.genres
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get genres error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/search/history:
 *   get:
 *     summary: Get user search history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search history retrieved successfully
 */
router.get('/history', async (req, res, next) => {
  try {
    const { limit } = req.query;
    
    const result = await searchService.getSearchHistory(req.user.id, parseInt(limit) || 50);
    
    if (result.success) {
      res.json({
        success: true,
        history: result.history
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get search history error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/search/history:
 *   delete:
 *     summary: Clear user search history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search history cleared successfully
 */
router.delete('/history', async (req, res, next) => {
  try {
    const result = await searchService.clearSearchHistory(req.user.id);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Search history cleared successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Clear search history error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/search/recommendations:
 *   get:
 *     summary: Get personalized recommendations
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 */
router.get('/recommendations', async (req, res, next) => {
  try {
    const { limit } = req.query;
    
    const result = await searchService.getRecommendations(req.user.id, parseInt(limit) || 20);
    
    if (result.success) {
      res.json({
        success: true,
        recommendations: result.recommendations
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get recommendations error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/search/autocomplete:
 *   get:
 *     summary: Get autocomplete suggestions
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Autocomplete suggestions retrieved successfully
 */
router.get('/autocomplete', async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    
    if (!q || q.length < 1) {
      return res.json({
        success: true,
        suggestions: []
      });
    }
    
    const result = await searchService.getAutocomplete(q, parseInt(limit) || 10);
    
    if (result.success) {
      res.json({
        success: true,
        suggestions: result.suggestions
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Get autocomplete error:', error);
    next(error);
  }
});

module.exports = router;
