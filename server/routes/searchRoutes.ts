/**
 * Search Routes - TypeScript Migration (Sprint 2.1 Phase 5)
 * Torrent search API endpoints
 */

import { Router, Request, Response } from 'express';
const { searchTorrents, getAvailableSources } = require('../services/searchService');

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { q, query, page, limit, source, sources } = req.query;
  const searchQuery = (q || query) as string;

  if (!searchQuery) {
    return res.status(400).json({
      success: false,
      error: 'Parameter "q" is required'
    });
  }

  try {
    const requestedSources = sources
      ? (sources as string).split(',')
      : source
        ? (source as string).split(',')
        : [];

    const result = await searchTorrents(searchQuery, {
      page,
      limit,
      sources: requestedSources
    });

    return res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('❌ Search API error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/sources', (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      sources: getAvailableSources()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

// CommonJS compatibility
module.exports = router;
