/**
 * Metadata Service (TypeScript)
 * - Fetches movie/series metadata from OMDb and TMDB
 * - Node 18+ (uses global fetch). Za starije Node verzije ubaciti `undici` ili `node-fetch`.
 */

import { LRUCache } from 'lru-cache';
import { config as rawConfig } from '../config';

// Ako metricsService nije tipiziran u projektu, ovi minimalni tipovi pokrivaju upotrebu ovde.
interface MetricsService {
  incCacheHit: (ns: 'imdb') => void;
  incCacheMiss: (ns: 'imdb') => void;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const metrics = require('./metricsService') as MetricsService;

// Minimalni prikaz očekivanog shape-a config-a; ako već imate tipove za config, slobodno zamenite.
type AppConfig = {
  metrics?: { enabled?: boolean };
  omdb?: { apiKey?: string };
  tmdb?: { apiKey?: string };
  production?: { cache?: { imdbDataTTL?: number } };
};
const config = (rawConfig || {}) as unknown as AppConfig;

type MediaType = 'movie' | 'series';

export type Metadata = {
  Title: string;
  Year: string | null;
  imdbRating: string | null;   // string (npr. "7.8") radi uniformnosti sa OMDb
  imdbVotes: string | null;    // formatirano npr. "12,345"
  Plot: string | null;
  Director?: string | null;
  Actors?: string | null;
  Poster: string | null;
  Backdrop: string | null;
  Genre?: string | null;
  Runtime?: string | null;
  Rated?: string | null;
  imdbID?: string | null;
  tmdbID?: number | null;
  Type: MediaType;
  source: 'omdb' | 'tmdb-tv' | 'tmdb-movie';
};

type CleanedName = { title: string; year: string | null };

// --- OMDb / TMDB wire tipovi (samo polja koja koristimo) ---
type OmdbSearchItem = {
  Title: string;
  Year: string;
  imdbID: string;
  Type: MediaType;
  Poster: string;
};
type OmdbSearchResponse =
  | { Response: 'True'; Search: OmdbSearchItem[] }
  | { Response: 'False'; Error?: string };

type OmdbTitleResponse =
  | (OmdbSearchItem & {
      Rated?: string;
      Released?: string;
      Runtime?: string;
      Genre?: string;
      Director?: string;
      Writer?: string;
      Actors?: string;
      Plot?: string;
      Language?: string;
      Country?: string;
      Awards?: string;
      Ratings?: unknown[];
      Metascore?: string;
      imdbRating?: string;
      imdbVotes?: string;
      DVD?: string;
      BoxOffice?: string;
      Production?: string;
      Website?: string;
      Response: 'True';
    })
  | { Response: 'False'; Error?: string };

type TmdbSearchItem = {
  id: number;
  name?: string;             // TV
  title?: string;            // Movie
  backdrop_path?: string | null;
  poster_path?: string | null;
  first_air_date?: string | null;
  release_date?: string | null;
};
type TmdbSearchResponse = { results: TmdbSearchItem[] };

type TmdbCredit = { job?: string; name?: string };
type TmdbCast = { name: string };

type TmdbMovieDetails = {
  id: number;
  title: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: { id: number; name: string }[];
  runtime?: number | null;
  release_date?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
  credits?: {
    cast?: TmdbCast[];
    crew?: TmdbCredit[];
  };
};

type TmdbTvDetails = {
  id: number;
  name: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: { id: number; name: string }[];
  first_air_date?: string | null;
  episode_run_time?: number[];
  vote_average?: number | null;
  vote_count?: number | null;
  created_by?: { name: string }[];
  credits?: {
    cast?: TmdbCast[];
  };
};

// --- Keš ---
const imdbCache = new LRUCache<string, Metadata>({
  max: Number.parseInt(process.env.IMDB_CACHE_SIZE ?? '500', 10),
  ttl:
    Number.parseInt(process.env.IMDB_CACHE_TTL ?? '', 10) ||
    config.production?.cache?.imdbDataTTL ||
    (1000 * 60 * 60 * 24), // default 24h ako nije definisano
  updateAgeOnGet: true,
});

let hasLoggedMissingOmdbKey = false;
let hasLoggedMissingTmdbKey = false;

// --- Helpers ---
const TMDB_IMG = {
  poster: (p: string) => `https://image.tmdb.org/t/p/w500${p}`,
  backdrop: (p: string) => `https://image.tmdb.org/t/p/w1280${p}`,
};

async function fetchJson<T>(url: string, timeoutMs = 10000): Promise<T> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SeedboxLite/1.0',
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(id);
  }
}

function isLikelySeries(name: string): boolean {
  return /\b(S\d+|Season|SEASON|series|Series|SERIES|E\d+|EP\d+|Episode|EPISODE|COMPLETE|Complete|complete)\b/i.test(
    name,
  );
}

export const cleanTorrentName = (torrentName: string): CleanedName => {
  // eslint-disable-next-line no-console
  console.log(`🔍 Cleaning torrent name: "${torrentName}"`);

  const yearMatch = torrentName.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : null;

  const series = isLikelySeries(torrentName);
  // eslint-disable-next-line no-console
  console.log(`📺 Series detection: ${series ? 'YES' : 'NO'}`);

  let cleaned = torrentName
    .replace(/\[(.*?)\]/g, '')
    .replace(/\((.*?)\)/g, '')
    .replace(/\.(720p|1080p|480p|2160p|4K)/gi, '')
    .replace(/\.(BluRay|WEBRip|WEB-DL|DVDRip|CAMRip|TS|TC|WEB)/gi, '')
    .replace(/\.(x264|x265|H264|H265|HEVC|AVC)/gi, '')
    .replace(/\.(AAC|MP3|AC3|DTS|FLAC)/gi, '')
    .replace(/\.(mkv|mp4|avi|mov|flv)/gi, '')
    .replace(/\b(REPACK|PROPER|EXTENDED|UNRATED|DIRECTORS|CUT)\b/gi, '')
    .replace(/\b\d+CH\b/gi, '')
    .replace(/\b(PSA|YTS|YIFY|RARBG|EZTV|TGx)\b/gi, '')
    .replace(/\./g, ' ')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // eslint-disable-next-line no-console
  console.log(`🧹 After basic cleaning: "${cleaned}"`);

  if (series) {
    // eslint-disable-next-line no-console
    console.log('📺 Applying series-specific cleaning');
    cleaned = cleaned
      .replace(/\b(S\d+.*)/gi, '')
      .replace(/\b(Season\s*\d+.*)/gi, '')
      .replace(/\b(SEASON\s*\d+.*)/gi, '')
      .replace(/\b(E\d+.*)/gi, '')
      .replace(/\b(Episode\s*\d+.*)/gi, '')
      .replace(/\b(EPISODE\s*\d+.*)/gi, '')
      .replace(/\b(COMPLETE.*)/gi, '')
      .replace(/\b(Complete.*)/gi, '')
      .replace(/\b(complete.*)/gi, '')
      .replace(/\bSERIES\b/gi, '')
      .replace(/\bSeries\b/gi, '')
      .replace(/\bseries\b/gi, '')
      .replace(/\bWEB\b/gi, '')
      .replace(/\b\d+CH\b/gi, '')
      .replace(/\b(PSA|YTS|YIFY|RARBG|EZTV|TGx)\b/gi, '')
      .trim();
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // eslint-disable-next-line no-console
  console.log(`✨ Final cleaned result: title="${cleaned}", year=${year}`);
  return { title: cleaned, year };
};

function buildOmdbUrls(title: string, year: string | null, asSeries: boolean, apiKey: string): string[] {
  const urls: Array<string | null> = [];

  if (asSeries) {
    urls.push(
      year ? `https://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(title)}&y=${year}&type=series` : null,
      `https://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(title)}&type=series`,
      `https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(title)}&type=series`,
    );
  }

  urls.push(
    year ? `https://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(title)}&y=${year}` : null,
    `https://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(title)}`,
    `https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(title)}&type=movie`,
    `https://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent('The ' + title)}`,
  );

  return urls.filter((u): u is string => u !== null);
}

function formatVotes(n?: number | null): string | null {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return n.toLocaleString();
}

function formatAvg(avg?: number | null): string | null {
  if (typeof avg !== 'number' || !Number.isFinite(avg)) return null;
  return avg.toFixed(1);
}

// --- Glavna funkcija ---
export async function fetchIMDBData(torrentName: string): Promise<Metadata | null> {
  // eslint-disable-next-line no-console
  console.log(`🎬 Fetching IMDB/TMDB data for: "${torrentName}"`);

  const cached = imdbCache.get(torrentName);
  if (cached) {
    // eslint-disable-next-line no-console
    console.log(`📋 Using cached IMDB data for: ${torrentName}`);
    if (config.metrics?.enabled) metrics.incCacheHit('imdb');
    return cached;
  }
  if (config.metrics?.enabled) metrics.incCacheMiss('imdb');

  const { title, year } = cleanTorrentName(torrentName);
  if (!title || title.length < 2) {
    // eslint-disable-next-line no-console
    console.log(`❌ Title too short or empty: "${title}"`);
    return null;
  }

  const series = isLikelySeries(torrentName);
  // eslint-disable-next-line no-console
  console.log(`🔍 Likely series: ${series} for "${torrentName}"`);

  // --- OMDb (ako je key prisutan) ---
  const omdbKey = config.omdb?.apiKey;
  if (!omdbKey) {
    if (!hasLoggedMissingOmdbKey) {
      // eslint-disable-next-line no-console
      console.warn('⚠️ OMDb API key not configured. Skipping OMDb metadata enrichment.');
      hasLoggedMissingOmdbKey = true;
    }
  } else {
    const urls = buildOmdbUrls(title, year, series, omdbKey);

    for (const url of urls) {
      try {
        // eslint-disable-next-line no-console
        console.log(`🔍 Trying OMDb: ${url}`);
        const data = await fetchJson<OmdbTitleResponse | OmdbSearchResponse>(url, 12000);

        if ('Response' in data && data.Response === 'True') {
          const movieData: OmdbSearchItem | OmdbTitleResponse | undefined =
            'Search' in data && data.Search?.[0]
              ? data.Search[0]
              : 'Title' in data
                ? data
                : undefined;

          if (movieData && 'Title' in movieData && movieData.Title) {
            // eslint-disable-next-line no-console
            console.log(
              `✅ Found OMDb data: ${movieData.Title} (${movieData.Year}) - Type: ${
                (movieData as OmdbSearchItem).Type || 'movie'
              }`,
            );

            const base: Metadata = {
              Title: movieData.Title,
              Year: movieData.Year ?? null,
              imdbRating:
                'imdbRating' in movieData && typeof movieData.imdbRating === 'string'
                  ? movieData.imdbRating
                  : null,
              imdbVotes:
                'imdbVotes' in movieData && typeof movieData.imdbVotes === 'string'
                  ? movieData.imdbVotes
                  : null,
              Plot: ('Plot' in movieData && typeof movieData.Plot === 'string') ? movieData.Plot : null,
              Director: ('Director' in movieData && typeof movieData.Director === 'string') ? movieData.Director : null,
              Actors: ('Actors' in movieData && typeof movieData.Actors === 'string') ? movieData.Actors : null,
              Poster: (movieData.Poster && movieData.Poster !== 'N/A') ? movieData.Poster : null,
              Backdrop: null,
              Genre: ('Genre' in movieData && typeof movieData.Genre === 'string') ? movieData.Genre : null,
              Runtime: ('Runtime' in movieData && typeof movieData.Runtime === 'string') ? movieData.Runtime : null,
              Rated: ('Rated' in movieData && typeof movieData.Rated === 'string') ? movieData.Rated : null,
              imdbID: 'imdbID' in movieData ? movieData.imdbID ?? null : null,
              tmdbID: null,
              Type: (movieData as OmdbSearchItem).Type ?? (series ? 'series' : 'movie'),
              source: 'omdb',
            };

            // Pokušaj da obogatiš TMDB backdrop-om (ako je TMDB key prisutan)
            const tmdbKey = config.tmdb?.apiKey;
            if (!tmdbKey && !hasLoggedMissingTmdbKey) {
              // eslint-disable-next-line no-console
              console.warn('⚠️ TMDB API key not configured. Backdrop enhancement may be skipped.');
              hasLoggedMissingTmdbKey = true;
            }
            try {
              if (tmdbKey) {
                if (base.Type === 'series') {
                  const tvRes = await fetchJson<TmdbSearchResponse>(
                    `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(
                      base.Title,
                    )}`,
                    10000,
                  );
                  const show = tvRes.results?.[0];
                  if (show?.backdrop_path) {
                    base.Backdrop = TMDB_IMG.backdrop(show.backdrop_path);
                    // eslint-disable-next-line no-console
                    console.log(`🎨 Enhanced with TMDB backdrop: ${base.Backdrop}`);
                  }
                } else {
                  const mRes = await fetchJson<TmdbSearchResponse>(
                    `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(
                      base.Title,
                    )}`,
                    10000,
                  );
                  const mov = mRes.results?.[0];
                  if (mov?.backdrop_path) {
                    base.Backdrop = TMDB_IMG.backdrop(mov.backdrop_path);
                    // eslint-disable-next-line no-console
                    console.log(`🎨 Enhanced with TMDB backdrop: ${base.Backdrop}`);
                  }
                }
              }
            } catch (enhanceError) {
              // eslint-disable-next-line no-console
              console.log(`⚠️ Could not enhance with TMDB backdrop: ${(enhanceError as Error).message}`);
            }

            imdbCache.set(torrentName, base);
            return base;
          }
        } else {
          // eslint-disable-next-line no-console
          console.log(`❌ OMDb error: ${(data as { Error?: string })?.Error || 'Unknown error'}`);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(`❌ OMDb request error: ${(err as Error).message}`);
      }
    }
  }

  // --- TMDB fallback ---
  const tmdbKey = config.tmdb?.apiKey;
  if (!tmdbKey) {
    if (!hasLoggedMissingTmdbKey) {
      // eslint-disable-next-line no-console
      console.warn('⚠️ TMDB API key not configured. Cannot use TMDB fallback.');
      hasLoggedMissingTmdbKey = true;
    }
    // Bez TMDB ključa nema smisla nastavljati:
    return null;
  }

  // eslint-disable-next-line no-console
  console.log(`🎭 Trying TMDB as fallback for: ${title}`);

  if (series) {
    try {
      const tvQuery = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(
        title,
      )}${year ? `&first_air_date_year=${year}` : ''}`;
      // eslint-disable-next-line no-console
      console.log(`🔍 Trying TMDB TV: ${tvQuery}`);

      const searchData = await fetchJson<TmdbSearchResponse>(tvQuery, 15000);
      const show = searchData.results?.[0];
      if (show) {
        const detailsUrl = `https://api.themoviedb.org/3/tv/${show.id}?api_key=${tmdbKey}&append_to_response=credits`;
        const details = await fetchJson<TmdbTvDetails>(detailsUrl, 15000);

        // eslint-disable-next-line no-console
        console.log(
          `✅ Found TMDB TV data: ${details.name} (${details.first_air_date?.substring(0, 4) ?? 'N/A'})`,
        );

        const result: Metadata = {
          Title: details.name,
          Year: details.first_air_date?.substring(0, 4) ?? null,
          imdbRating: formatAvg(details.vote_average),
          imdbVotes: formatVotes(details.vote_count ?? null),
          Plot: details.overview ?? null,
          Director: details.created_by?.map((c) => c.name).join(', ') || null,
          Actors: details.credits?.cast?.slice(0, 4).map((a) => a.name).join(', ') || null,
          Poster: details.poster_path ? TMDB_IMG.poster(details.poster_path) : null,
          Backdrop: details.backdrop_path ? TMDB_IMG.backdrop(details.backdrop_path) : null,
          Genre: details.genres?.map((g) => g.name).join(', ') || null,
          Runtime: details.episode_run_time?.[0] ? `${details.episode_run_time[0]} min` : null,
          Rated: 'N/A',
          imdbID: null,
          tmdbID: details.id,
          Type: 'series',
          source: 'tmdb-tv',
        };

        imdbCache.set(torrentName, result);
        return result;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(`❌ TMDB TV error: ${(err as Error).message}`);
    }
  }

  try {
    const movieQuery = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(
      title,
    )}${year ? `&year=${year}` : ''}`;
    // eslint-disable-next-line no-console
    console.log(`🔍 Trying TMDB Movies: ${movieQuery}`);

    const searchData = await fetchJson<TmdbSearchResponse>(movieQuery, 15000);
    const movie = searchData.results?.[0];
    if (movie) {
      const detailsUrl = `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${tmdbKey}&append_to_response=credits`;
      const details = await fetchJson<TmdbMovieDetails>(detailsUrl, 15000);

      // eslint-disable-next-line no-console
      console.log(
        `✅ Found TMDB Movie data: ${details.title} (${details.release_date?.substring(0, 4) ?? 'N/A'})`,
      );

      const result: Metadata = {
        Title: details.title,
        Year: details.release_date?.substring(0, 4) ?? null,
        imdbRating: formatAvg(details.vote_average),
        imdbVotes: formatVotes(details.vote_count ?? null),
        Plot: details.overview ?? null,
        Director: details.credits?.crew?.find((p) => p.job === 'Director')?.name ?? null,
        Actors: details.credits?.cast?.slice(0, 4).map((a) => a.name).join(', ') || null,
        Poster: details.poster_path ? TMDB_IMG.poster(details.poster_path) : null,
        Backdrop: details.backdrop_path ? TMDB_IMG.backdrop(details.backdrop_path) : null,
        Genre: details.genres?.map((g) => g.name).join(', ') || null,
        Runtime: typeof details.runtime === 'number' ? `${details.runtime} min` : null,
        Rated: 'N/A',
        imdbID: null,
        tmdbID: details.id,
        Type: 'movie',
        source: 'tmdb-movie',
      };

      imdbCache.set(torrentName, result);
      return result;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(`❌ TMDB Movie error: ${(err as Error).message}`);
  }

  // eslint-disable-next-line no-console
  console.log(`❌ No movie/series data found for: ${title}`);
  return null;
}

export default {
  cleanTorrentName,
  fetchIMDBData,
};

// CommonJS kompatibilnost za postojeće .js fajlove
module.exports = {
  cleanTorrentName,
  fetchIMDBData,
};
