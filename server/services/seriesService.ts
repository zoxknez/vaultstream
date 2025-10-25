/**
 * Series Service - TypeScript Migration (Sprint 2.1)
 * Episode parsing and series analysis from torrent files
 */

const path = require('path');
const { cleanTorrentName } = require('./metadataService');

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
const QUALITY_REGEX = /(2160p|1080p|720p|480p|4k|hdr|uhd|webrip|web-dl|bdrip|bluray|hdtv|dvdrip|x264|x265|hevc|10bit|dv|hmax|amzn|nf|dsnp)/gi;

interface EpisodePattern {
  regex: RegExp;
  seasonIdx: number | null;
  episodeIdx: number;
}

const episodePatterns: EpisodePattern[] = [
  { regex: /S(\d{1,2})E(\d{1,3})(?:E(\d{1,3}))?/i, seasonIdx: 1, episodeIdx: 2 },
  { regex: /(\d{1,2})x(\d{1,3})/i, seasonIdx: 1, episodeIdx: 2 },
  { regex: /Season[\s._-]*(\d{1,2}).{0,10}Episode[\s._-]*(\d{1,3})/i, seasonIdx: 1, episodeIdx: 2 },
  { regex: /S(\d{1,2})[\s._-]*Ep?(\d{1,3})/i, seasonIdx: 1, episodeIdx: 2 },
  { regex: /Ep(?:isode)?[\s._-]*(\d{1,3})/i, seasonIdx: null, episodeIdx: 1 },
  { regex: /Part[\s._-]*(\d{1,2})/i, seasonIdx: null, episodeIdx: 1 }
];

const isVideoFile = (fileName: string = ''): boolean => {
  const ext = path.extname(fileName).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
};

const toNumber = (value: any, fallback: number | null = null): number | null => {
  if (value == null) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const prettifyTitle = (rawTitle: string = '', fallback: string = ''): string => {
  const cleaned = rawTitle
    .replace(QUALITY_REGEX, ' ')
    .replace(/\b(Proper|Repack|Extended|Directors|Cut|Complete|READNFO|Multi|Subs)\b/gi, ' ')
    .replace(/\b(AMZN|NF|DSNP|WEB-DL|WEBRip|BluRay|HDRip|x264|x265|HEVC|AAC|DDP?5?\.\d)\b/gi, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^\)]*\)/g, ' ')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return fallback;
  }

  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

interface ParsedEpisode {
  isVideo: boolean;
  isEpisode?: boolean;
  season?: number;
  episodeNumber?: number | null;
  title?: string;
  quality?: string | null;
  fileName?: string;
  fileIndex?: number;
  size?: number;
  downloaded?: number;
  progress?: number;
}

const parseEpisodeFromFilename = (file: any): ParsedEpisode => {
  const fileName = file.name || '';
  if (!isVideoFile(fileName)) {
    return { isVideo: false };
  }

  const baseName = path.basename(fileName, path.extname(fileName));
  let detectedSeason: number | null = null;
  let detectedEpisode: number | null = null;
  let matchedPattern: RegExp | null = null;

  for (const pattern of episodePatterns) {
    const match = baseName.match(pattern.regex);
    if (match) {
      matchedPattern = pattern.regex;
      detectedSeason = pattern.seasonIdx != null ? toNumber(match[pattern.seasonIdx], 1) : null;
      detectedEpisode = toNumber(match[pattern.episodeIdx]);
      if (detectedSeason == null) {
        detectedSeason = 1;
      }
      break;
    }
  }

  const qualityMatch = baseName.match(QUALITY_REGEX);
  const titleBase = matchedPattern ? baseName.replace(matchedPattern, ' ') : baseName;
  const title = prettifyTitle(titleBase, detectedEpisode != null ? `Episode ${detectedEpisode}` : baseName);

  return {
    isVideo: true,
    isEpisode: detectedEpisode != null,
    season: detectedSeason != null ? detectedSeason : 1,
    episodeNumber: detectedEpisode,
    title,
    quality: qualityMatch ? qualityMatch[0].toUpperCase() : null,
    fileName,
    fileIndex: file.index,
    size: file.size || 0,
    downloaded: file.downloaded || 0,
    progress: file.progress || 0
  };
};

const buildDisplayTitle = (season: number, episode: number | null, title: string): string => {
  if (episode == null) {
    return title;
  }
  const seasonPrefix = season > 0 ? `S${String(season).padStart(2, '0')}` : 'S??';
  const episodePrefix = `E${String(episode).padStart(2, '0')}`;
  return `${seasonPrefix}${episodePrefix} • ${title}`;
};

export function analyzeSeriesFromFiles(torrentName: string = '', files: any[] = []): any {
  if (!files.length) {
    return {
      isSeries: false,
      videoCount: 0,
      detectedEpisodes: 0,
      seasons: [],
      extras: [],
      unmatched: []
    };
  }

  const videoFiles = files.filter((file) => isVideoFile(file.name));
  if (!videoFiles.length) {
    return {
      isSeries: false,
      videoCount: 0,
      detectedEpisodes: 0,
      seasons: [],
      extras: [],
      unmatched: []
    };
  }

  const parsed = videoFiles.map((file) => parseEpisodeFromFilename(file));
  const episodeEntries = parsed.filter((item) => item.isEpisode);
  const nonEpisodeEntries = parsed.filter((item) => item.isVideo && !item.isEpisode);

  const detectedEpisodes = episodeEntries.length;
  const totalVideos = videoFiles.length;

  const seriesIndicators = [
    detectedEpisodes >= 2,
    totalVideos >= 4,
    /(S\d{1,2}|Season\s*\d{1,2}|Complete)/i.test(torrentName)
  ];

  const isSeries = seriesIndicators.some(Boolean);

  if (!isSeries) {
    return {
      isSeries: false,
      videoCount: totalVideos,
      detectedEpisodes,
      seasons: [],
      extras: nonEpisodeEntries.map((entry) => ({
        fileIndex: entry.fileIndex,
        fileName: entry.fileName,
        size: entry.size,
        title: prettifyTitle(path.basename(entry.fileName!, path.extname(entry.fileName!)), entry.fileName!)
      })),
      unmatched: []
    };
  }

  const seasonsMap = new Map<number, any[]>();
  const seasonCounters = new Map<number, number>();

  episodeEntries
    .sort((a, b) => {
      if (a.season !== b.season) return (a.season || 0) - (b.season || 0);
      if (a.episodeNumber != null && b.episodeNumber != null) {
        return a.episodeNumber - b.episodeNumber;
      }
      if (a.episodeNumber != null) return -1;
      if (b.episodeNumber != null) return 1;
      return (a.fileName || '').localeCompare(b.fileName || '', undefined, { sensitivity: 'base' });
    })
    .forEach((entry) => {
      const seasonNumber = entry.season || 1;
      const seasonKey = seasonNumber;

      if (!seasonsMap.has(seasonKey)) {
        seasonsMap.set(seasonKey, []);
        seasonCounters.set(seasonKey, 0);
      }

      const currentCount = (seasonCounters.get(seasonKey) || 0) + 1;
      seasonCounters.set(seasonKey, currentCount);

      const episodeNumber = entry.episodeNumber != null ? entry.episodeNumber : currentCount;

      seasonsMap.get(seasonKey)!.push({
        season: seasonNumber,
        episodeNumber,
        displayTitle: buildDisplayTitle(seasonNumber, episodeNumber, entry.title!),
        title: entry.title,
        quality: entry.quality,
        fileIndex: entry.fileIndex,
        fileName: entry.fileName,
        size: entry.size,
        downloaded: entry.downloaded,
        progress: entry.progress
      });
    });

  const seasons = Array.from(seasonsMap.entries())
    .map(([seasonNumber, episodes]) => ({
      season: seasonNumber,
      label: `Sezona ${seasonNumber}`,
      episodeCount: episodes.length,
      episodes
    }))
    .sort((a, b) => a.season - b.season);

  const extras = nonEpisodeEntries.map((entry) => ({
    fileIndex: entry.fileIndex,
    fileName: entry.fileName,
    size: entry.size,
    title: prettifyTitle(path.basename(entry.fileName!, path.extname(entry.fileName!)), entry.fileName!),
    quality: entry.quality || null
  }));

  const unmatched = files
    .filter((file) => !isVideoFile(file.name))
    .map((file) => ({
      fileIndex: file.index,
      fileName: file.name,
      size: file.size
    }));

  return {
    isSeries,
    videoCount: totalVideos,
    detectedEpisodes,
    seasons,
    extras,
    unmatched,
    defaultSeason: seasons[0]?.season || 1,
    title: cleanTorrentName(torrentName).title
  };
}

// CommonJS compatibility
module.exports = {
  analyzeSeriesFromFiles
};
