/**
 * Subtitle Routes - TypeScript Migration (Sprint 2.1 Phase 5)
 * Subtitle upload, download, search, and management endpoints
 */

import { Router, Request, Response } from 'express';
const multer = require('multer');
const path = require('path');
const {
  listLocalSubtitles,
  saveSubtitleFile,
  deleteSubtitleFile,
  getSubtitleFileStream,
  searchOnlineSubtitles,
  downloadSubtitleFromUrl
} = require('../services/subtitleService');

const router = Router();

const SUPPORTED_SUBTITLE_EXTENSIONS = ['.srt', '.vtt'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!SUPPORTED_SUBTITLE_EXTENSIONS.includes(ext)) {
      return cb(new Error('Only .srt and .vtt subtitle files are supported'));
    }
    return cb(null, true);
  }
});

router.post('/search', async (req: Request, res: Response) => {
  const { query, filename, languages } = req.body || {};

  if (!query && !filename) {
    return res.status(400).json({ error: 'Subtitle search requires a query or filename' });
  }

  try {
    const results = await searchOnlineSubtitles({ query, filename, languages });
    return res.json(results);
  } catch (error: any) {
    console.error('❌ Subtitle search failed:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to search for subtitles' });
  }
});

router.get('/download', async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Subtitle download requires a url parameter' });
  }

  try {
    const { content, format, filename } = await downloadSubtitleFromUrl(url as string);
    const safeFilename = `${filename || 'subtitle'}.${format}`;

    res.setHeader('Content-Type', `text/${format}; charset=utf-8`);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    return res.send(content);
  } catch (error: any) {
    console.error('❌ Subtitle download failed:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to download subtitle' });
  }
});

// Per-episode subtitle file retrieval: GET /api/subtitles/:hash/:fileIndex/files/:filename
router.get('/:hash/:fileIndex/files/:filename', async (req: Request, res: Response) => {
  const { hash, fileIndex, filename } = req.params;
  const parsedFileIndex = parseInt(fileIndex, 10);

  if (isNaN(parsedFileIndex)) {
    return res.status(400).json({ error: 'Invalid file index' });
  }

  try {
    const stream = await getSubtitleFileStream(hash, filename, parsedFileIndex);

    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    stream.on('error', (error: Error) => {
      console.error('❌ Subtitle stream error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream subtitle file' });
      }
    });

    return stream.pipe(res);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Subtitle file not found' });
    }

    console.error('❌ Failed to retrieve subtitle file:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to load subtitle file' });
  }
});

// Legacy: Per-torrent subtitle file retrieval (backward compatibility)
router.get('/:hash/files/:filename', async (req: Request, res: Response) => {
  const { hash, filename } = req.params;

  try {
    const stream = await getSubtitleFileStream(hash, filename, null);

    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    stream.on('error', (error: Error) => {
      console.error('❌ Subtitle stream error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream subtitle file' });
      }
    });

    return stream.pipe(res);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Subtitle file not found' });
    }

    console.error('❌ Failed to retrieve subtitle file:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to load subtitle file' });
  }
});

// Per-episode subtitle upload: POST /api/subtitles/:hash/:fileIndex/upload
router.post('/:hash/:fileIndex/upload', upload.single('subtitle'), async (req: Request, res: Response) => {
  const { hash, fileIndex } = req.params;
  const parsedFileIndex = parseInt(fileIndex, 10);

  if (isNaN(parsedFileIndex)) {
    return res.status(400).json({ error: 'Invalid file index' });
  }

  if (!(req as any).file) {
    return res.status(400).json({ error: 'No subtitle file provided' });
  }

  try {
    const subtitle = await saveSubtitleFile(hash, (req as any).file, parsedFileIndex);
    console.log(`✅ Subtitle uploaded for ${hash}/${fileIndex}: ${subtitle.filename}`);
    return res.status(201).json(subtitle);
  } catch (error: any) {
    console.error('❌ Failed to upload subtitle:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to upload subtitle' });
  }
});

// Legacy: Per-torrent subtitle upload (backward compatibility)
router.post('/:hash/upload', upload.single('subtitle'), async (req: Request, res: Response) => {
  const { hash } = req.params;

  if (!(req as any).file) {
    return res.status(400).json({ error: 'No subtitle file provided' });
  }

  try {
    const subtitle = await saveSubtitleFile(hash, (req as any).file, null);
    console.log(`✅ Subtitle uploaded for ${hash}: ${subtitle.filename}`);
    return res.status(201).json(subtitle);
  } catch (error: any) {
    console.error('❌ Failed to upload subtitle:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to upload subtitle' });
  }
});

// Per-episode subtitle delete: DELETE /api/subtitles/:hash/:fileIndex/files/:filename
router.delete('/:hash/:fileIndex/files/:filename', async (req: Request, res: Response) => {
  const { hash, fileIndex, filename } = req.params;
  const parsedFileIndex = parseInt(fileIndex, 10);

  if (isNaN(parsedFileIndex)) {
    return res.status(400).json({ error: 'Invalid file index' });
  }

  try {
    await deleteSubtitleFile(hash, filename, parsedFileIndex);
    console.log(`✅ Subtitle deleted: ${hash}/${fileIndex}/${filename}`);
    return res.status(204).send();
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Subtitle file not found' });
    }

    console.error('❌ Failed to delete subtitle:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to delete subtitle' });
  }
});

// Legacy: Per-torrent subtitle delete (backward compatibility)
router.delete('/:hash/files/:filename', async (req: Request, res: Response) => {
  const { hash, filename } = req.params;

  try {
    await deleteSubtitleFile(hash, filename, null);
    console.log(`✅ Subtitle deleted: ${hash}/${filename}`);
    return res.status(204).send();
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Subtitle file not found' });
    }

    console.error('❌ Failed to delete subtitle:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to delete subtitle' });
  }
});

// Per-episode subtitle list: GET /api/subtitles/:hash/:fileIndex
router.get('/:hash/:fileIndex', async (req: Request, res: Response) => {
  const { hash, fileIndex } = req.params;
  const parsedFileIndex = parseInt(fileIndex, 10);

  if (isNaN(parsedFileIndex)) {
    return res.status(400).json({ error: 'Invalid file index' });
  }

  try {
    const subtitles = await listLocalSubtitles(hash, parsedFileIndex);
    return res.json({ subtitles });
  } catch (error: any) {
    console.error('❌ Failed to list subtitles:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to list subtitles' });
  }
});

// Legacy: Per-torrent subtitle list (backward compatibility)
router.get('/:hash', async (req: Request, res: Response) => {
  const { hash } = req.params;

  try {
    const subtitles = await listLocalSubtitles(hash, null);
    return res.json({ subtitles });
  } catch (error: any) {
    console.error('❌ Failed to list subtitles:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to list subtitles' });
  }
});

export default router;

// CommonJS compatibility
module.exports = router;
