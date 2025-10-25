/**
 * Subtitle Service - TypeScript Migration (Sprint 2.1)
 * Subtitle upload, download, conversion (SRT/VTT), OpenSubtitles integration
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const zlib = require('zlib');

const gunzip = promisify(zlib.gunzip);

const SUBTITLE_DIR = path.join(__dirname, '..', 'uploads', 'subtitles');
const SUPPORTED_SUBTITLE_EXTENSIONS = ['.srt', '.vtt'];

const fetchFn: any = global.fetch || ((...args: any[]) => import('node-fetch').then(({ default: fetch }: any) => fetch(...args)));

const languageMap: Record<string, string> = {
  eng: 'English',
  spa: 'Spanish',
  fre: 'French',
  ger: 'German',
  ita: 'Italian',
  por: 'Portuguese',
  rus: 'Russian',
  jpn: 'Japanese',
  kor: 'Korean',
  chi: 'Chinese',
  ara: 'Arabic',
  hin: 'Hindi',
  tha: 'Thai',
  tur: 'Turkish',
  dut: 'Dutch',
  swe: 'Swedish',
  nor: 'Norwegian',
  dan: 'Danish',
  fin: 'Finnish',
  pol: 'Polish',
  cze: 'Czech',
  hun: 'Hungarian',
  gre: 'Greek',
  heb: 'Hebrew',
  rum: 'Romanian',
  sdh: 'English (SDH)',
  srp: 'Serbian',
  hrv: 'Croatian',
  bos: 'Bosnian',
  mkd: 'Macedonian',
  slo: 'Slovenian'
};

const ensureDirectory = async (dirPath: string): Promise<string> => {
  await fs.promises.mkdir(dirPath, { recursive: true });
  return dirPath;
};

const slugify = (input: string): string => {
  return (
    input
      .replace(/[\s]+/g, '-')
      .replace(/[^a-z0-9-_.]/gi, '')
      .replace(/-+/g, '-')
      .replace(/^[-_.]+|[-_.]+$/g, '')
      .toLowerCase() || 'subtitle'
  );
};

const guessLanguageFromFilename = (filename: string = ''): string => {
  const lower = filename.toLowerCase();
  for (const [code, language] of Object.entries(languageMap)) {
    if (lower.includes(code) || lower.includes(language.toLowerCase())) {
      return language;
    }
  }
  return 'Unknown';
};

const convertSrtToVtt = (content: string): string => {
  const normalized = content
    .replace(/\r+/g, '')
    .trim();

  const converted = normalized
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

  return `WEBVTT\n\n${converted}`;
};

const normalizeSubtitleContent = (buffer: Buffer, extension: string): { content: string; format: string } => {
  const ext = extension.toLowerCase();
  const content = buffer.toString('utf8');

  if (ext === '.vtt') {
    return { content, format: 'vtt' };
  }

  if (ext === '.srt') {
    return { content: convertSrtToVtt(content), format: 'vtt' };
  }

  throw new Error('Unsupported subtitle format');
};

const getSubtitleDirectory = async (hash: string, fileIndex: number | null = null): Promise<string> => {
  if (!hash) {
    throw new Error('Torrent hash is required for subtitle operations');
  }

  const safeHash = hash.toLowerCase();
  
  let dir: string;
  if (fileIndex !== null && fileIndex !== undefined) {
    dir = path.join(SUBTITLE_DIR, safeHash, String(fileIndex));
  } else {
    dir = path.join(SUBTITLE_DIR, safeHash);
  }
  
  await ensureDirectory(dir);
  return dir;
};

export async function listLocalSubtitles(hash: string, fileIndex: number | null = null): Promise<any[]> {
  try {
    const dir = await getSubtitleDirectory(hash, fileIndex);
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    const subtitles = await Promise.all(entries
      .filter((entry: any) => entry.isFile() && SUPPORTED_SUBTITLE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase()))
      .map(async (entry: any) => {
        const filePath = path.join(dir, entry.name);
        const stats = await fs.promises.stat(filePath);
        const language = guessLanguageFromFilename(entry.name);

        const urlPath = fileIndex !== null && fileIndex !== undefined
          ? `/api/subtitles/${hash}/${fileIndex}/files/${encodeURIComponent(entry.name)}`
          : `/api/subtitles/${hash}/files/${encodeURIComponent(entry.name)}`;

        return {
          id: entry.name,
          filename: entry.name,
          language,
          label: language === 'Unknown' ? entry.name : language,
          size: stats.size,
          updatedAt: stats.mtime.toISOString(),
          url: urlPath,
          source: 'upload',
          format: path.extname(entry.name).toLowerCase().replace('.', ''),
          fileIndex: fileIndex !== null && fileIndex !== undefined ? fileIndex : undefined
        };
      }));

    return subtitles;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function saveSubtitleFile(hash: string, file: any, fileIndex: number | null = null): Promise<any> {
  const dir = await getSubtitleDirectory(hash, fileIndex);
  const originalExt = path.extname(file.originalname).toLowerCase();

  if (!SUPPORTED_SUBTITLE_EXTENSIONS.includes(originalExt)) {
    throw new Error('Unsupported subtitle file format');
  }

  const baseName = slugify(path.basename(file.originalname, originalExt));
  const { content, format } = normalizeSubtitleContent(file.buffer, originalExt);

  let filename = `${baseName}.${format}`;
  let counter = 1;

  while (fs.existsSync(path.join(dir, filename))) {
    filename = `${baseName}-${counter}.${format}`;
    counter += 1;
  }

  const filePath = path.join(dir, filename);
  await fs.promises.writeFile(filePath, content, 'utf8');

  const urlPath = fileIndex !== null && fileIndex !== undefined
    ? `/api/subtitles/${hash}/${fileIndex}/files/${encodeURIComponent(filename)}`
    : `/api/subtitles/${hash}/files/${encodeURIComponent(filename)}`;

  const savedSubtitle = {
    id: filename,
    filename,
    language: guessLanguageFromFilename(filename),
    label: guessLanguageFromFilename(filename),
    size: Buffer.byteLength(content, 'utf8'),
    updatedAt: new Date().toISOString(),
    url: urlPath,
    source: 'upload',
    format,
    fileIndex: fileIndex !== null && fileIndex !== undefined ? fileIndex : undefined
  };

  return savedSubtitle;
}

export async function deleteSubtitleFile(hash: string, filename: string, fileIndex: number | null = null): Promise<void> {
  const dir = await getSubtitleDirectory(hash, fileIndex);
  const filePath = path.join(dir, filename);
  await fs.promises.unlink(filePath);
}

export async function getSubtitleFileStream(hash: string, filename: string, fileIndex: number | null = null): Promise<any> {
  const dir = await getSubtitleDirectory(hash, fileIndex);
  const filePath = path.join(dir, filename);
  return fs.createReadStream(filePath, { encoding: 'utf8' });
}

const detectFormatFromUrl = (url: string = ''): string => {
  const cleaned = url.split('?')[0];
  const ext = path.extname(cleaned).toLowerCase();

  if (ext === '.gz') {
    return path.extname(cleaned.slice(0, -3)).toLowerCase() || '.srt';
  }

  if (SUPPORTED_SUBTITLE_EXTENSIONS.includes(ext)) {
    return ext;
  }

  return '.srt';
};

export async function downloadSubtitleFromUrl(url: string): Promise<any> {
  const response = await fetchFn(url, {
    headers: {
      'User-Agent': process.env.OPENSUBTITLES_USER_AGENT || 'SeedboxLite/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download subtitle (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer);
  const contentEncoding = response.headers.get('content-encoding');

  if ((contentEncoding && contentEncoding.includes('gzip')) || url.endsWith('.gz')) {
    buffer = await gunzip(buffer);
  }

  const detectedFormat = detectFormatFromUrl(url);
  const { content, format } = normalizeSubtitleContent(buffer, detectedFormat);

  const rawFilename = path.basename(url.split('?')[0]).replace(/\.gz$/i, '');
  const baseFilename = rawFilename.replace(path.extname(rawFilename), '') || 'subtitle';

  return {
    content,
    format,
    filename: baseFilename
  };
}

export async function searchOnlineSubtitles({ query, filename, languages }: { query?: string; filename?: string; languages?: string[] }): Promise<any[]> {
  const apiBaseUrl = process.env.OPENSUBTITLES_API_URL || 'https://rest.opensubtitles.org';
  const userAgent = process.env.OPENSUBTITLES_USER_AGENT || 'SeedboxLite/1.0';

  const searchTerms: string[] = [];

  if (query) {
    searchTerms.push(`query-${encodeURIComponent(query)}`);
  }

  if (filename) {
    searchTerms.push(`filename-${encodeURIComponent(filename)}`);
  }

  if (languages && Array.isArray(languages) && languages.length > 0) {
    searchTerms.push(`sublanguageid-${languages.map((lang) => lang.toLowerCase()).join(',')}`);
  }

  if (searchTerms.length === 0) {
    throw new Error('Subtitle search requires search terms');
  }

  const url = `${apiBaseUrl}/search/${searchTerms.join('/')}`;

  const response = await fetchFn(url, {
    headers: {
      'User-Agent': userAgent
    }
  });

  if (!response.ok) {
    throw new Error(`OpenSubtitles search failed (${response.status})`);
  }

  const data: any = await response.json();

  if (!Array.isArray(data)) {
    return [];
  }

  return data.slice(0, 20).map((item: any) => ({
    id: item.IDSubtitleFile,
    language: languageMap[item.SubLanguageID?.toLowerCase()] || item.LanguageName || item.SubLanguageID,
    languageCode: item.SubLanguageID,
    url: item.SubDownloadLink,
    filename: item.SubFileName,
    release: item.MovieReleaseName,
    score: item.Score,
    downloads: item.SubDownloadsCnt,
    source: 'OpenSubtitles',
    encoding: item.SubEncoding
  }));
}

// CommonJS compatibility
module.exports = {
  listLocalSubtitles,
  saveSubtitleFile,
  deleteSubtitleFile,
  getSubtitleFileStream,
  searchOnlineSubtitles,
  downloadSubtitleFromUrl
};
