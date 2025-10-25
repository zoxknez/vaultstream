/**
 * Analytics Routes - TypeScript Migration (Sprint 2.1 Phase 5)
 * Frontend event tracking and summary endpoints
 */

import { Router, Request, Response } from 'express';
const { z } = require('zod');
const analyticsService = require('../services/analyticsService');

interface BuildRouterOptions {
  requireAuth: any;
  csrfGuard: any;
}

const buildRouter = ({ requireAuth, csrfGuard }: BuildRouterOptions): Router => {
  const router = Router();

  router.use(requireAuth);

  const eventSchema = z.object({
    name: z.string().min(1).max(64),
    timestamp: z.string().optional(),
    payload: z.record(z.any()).optional()
  });

  const batchSchema = z.object({
    events: z.array(eventSchema).min(1).max(50),
    reason: z.string().optional()
  });

  router.post('/events', csrfGuard, (req: Request, res: Response) => {
    const parseResult = batchSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'INVALID_ANALYTICS_PAYLOAD',
        details: parseResult.error.issues
      });
    }

    const { events } = parseResult.data;
    analyticsService.recordBatch(events, 'frontend');

    return res.status(204).send();
  });

  router.get('/summary', (_req: Request, res: Response) => {
    const summary = analyticsService.getSummary();
    return res.json(summary);
  });

  return router;
};

export default buildRouter;

// CommonJS compatibility
module.exports = buildRouter;
