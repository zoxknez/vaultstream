/**
 * Torrent Service - TypeScript Migration (Sprint 2.1)
 * WebTorrent lifecycle, IMDb caching, system monitoring, stalled detection
 */

const { getClient } = require('./webTorrentClient');
const { config } = require('../config');

const getClientInstance = (): any => {
  const client = getClient();
  if (!client) {
    throw new Error('WebTorrent client not initialized. Call initializeClient() first.');
  }
  return client;
};

const torrents: Record<string, any> = {};
const torrentIds: Record<string, string> = {};
const torrentNames: Record<string, string> = {};
const hashToName: Record<string, string> = {};
const nameToHash: Record<string, string> = {};
const imdbCache = new Map<string, any>();
let hasLoggedMissingOmdbKey = false;

const registerTorrent = (torrent: any, sourceId?: string): void => {
  if (!torrent || !torrent.infoHash) {
    return;
  }

  const infoHash = torrent.infoHash;
  torrents[infoHash] = torrent;

  if (sourceId) {
    torrentIds[infoHash] = sourceId;
  }

  const torrentName = torrent.name || 'Loading...';
  torrentNames[infoHash] = torrentName;
  hashToName[infoHash] = torrentName;

  if (torrentName) {
    nameToHash[torrentName] = infoHash;
  }

  if (!torrent.addedAt) {
    torrent.addedAt = new Date().toISOString();
  }
};

function cleanTorrentName(torrentName: string): { title: string; year: string | null } {
  console.log(`🔍 Cleaning torrent name: "${torrentName}"`);

  const yearMatch = torrentName.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : null;

  const isLikelySeries = /\b(S\d+|Season|SEASON|series|Series|SERIES|E\d+|Episode|EPISODE|COMPLETE|Complete|complete)\b/i.test(
    torrentName
  );
  console.log(`📺 Series detection: ${isLikelySeries ? 'YES' : 'NO'}`);

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

  console.log(`🧹 After basic cleaning: "${cleaned}"`);

  if (isLikelySeries) {
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

  console.log(`✨ Final cleaned result: title="${cleaned}", year=${year}`);
  return { title: cleaned, year };
}

async function fetchIMDBData(torrentName: string): Promise<any> {
  console.log(`🎬 Fetching IMDB data for: "${torrentName}"`);

  if (imdbCache.has(torrentName)) {
    console.log(`📋 Using cached IMDB data for: ${torrentName}`);
    return imdbCache.get(torrentName);
  }

  const cleanedData = cleanTorrentName(torrentName);
  const { title, year } = cleanedData;

  if (!title || title.length < 2) {
    console.log(`❌ Title too short or empty: "${title}"`);
    return null;
  }

  const isLikelySeries = /\b(S\d+|Season|Episode|EP\d+|E\d+|Series|Complete)\b/i.test(torrentName);
  console.log(`🔍 Likely series: ${isLikelySeries} for "${torrentName}"`);

  const omdbKey = config.omdb.apiKey;
  let filteredStrategies: string[] = [];

  if (!omdbKey) {
    if (!hasLoggedMissingOmdbKey) {
      console.warn('⚠️ OMDb API key not configured. Skipping OMDb metadata enrichment.');
      hasLoggedMissingOmdbKey = true;
    }
  } else {
    const omdbStrategies: (string | null)[] = [];

    if (isLikelySeries) {
      omdbStrategies.push(
        year
          ? `https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(title)}&y=${year}&type=series`
          : null,
        `https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(title)}&type=series`,
        `https://www.omdbapi.com/?apikey=${omdbKey}&s=${encodeURIComponent(title)}&type=series`
      );
    }

    omdbStrategies.push(
      year ? `https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(title)}&y=${year}` : null,
      `https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(title)}`,
      `https://www.omdbapi.com/?apikey=${omdbKey}&s=${encodeURIComponent(title)}&type=movie`,
      `https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent('The ' + title)}`
    );

    filteredStrategies = omdbStrategies.filter(Boolean) as string[];
  }

  for (const url of filteredStrategies) {
    try {
      console.log(`🔍 Trying OMDb: ${url}`);
      const response = await fetch(url);
      const data = (await response.json()) as any;

      if (data && data.Response === 'True') {
        const movieData = data.Search ? data.Search[0] : data;

        if (movieData && movieData.Title) {
          console.log(
            `✅ Found OMDb data: ${movieData.Title} (${movieData.Year}) - Type: ${movieData.Type || 'movie'}`
          );

          const result: any = {
            Title: movieData.Title,
            Year: movieData.Year,
            imdbRating: movieData.imdbRating,
            imdbVotes: movieData.imdbVotes,
            Plot: movieData.Plot,
            Director: movieData.Director,
            Actors: movieData.Actors,
            Poster: movieData.Poster !== 'N/A' ? movieData.Poster : null,
            Backdrop: null,
            Genre: movieData.Genre,
            Runtime: movieData.Runtime,
            Rated: movieData.Rated,
            imdbID: movieData.imdbID,
            Type: movieData.Type || 'movie',
            source: 'omdb'
          };

          try {
            if (isLikelySeries && movieData.Type === 'series') {
              const tmdbTvUrl = `https://api.themoviedb.org/3/search/tv?api_key=3fd2be6f0c70a2a598f084ddfb75487d&query=${encodeURIComponent(
                movieData.Title
              )}`;
              const tmdbResponse = await fetch(tmdbTvUrl, {
                method: 'GET',
                headers: { Accept: 'application/json', 'User-Agent': 'SeedboxLite/1.0' },
                signal: AbortSignal.timeout(10000)
              });

              if (tmdbResponse.ok) {
                const tmdbData = (await tmdbResponse.json()) as any;
                if (tmdbData.results && tmdbData.results.length > 0) {
                  const show = tmdbData.results[0];
                  if (show.backdrop_path) {
                    result.Backdrop = `https://image.tmdb.org/t/p/w1280${show.backdrop_path}`;
                    console.log(`🎨 Enhanced with TMDB backdrop: ${result.Backdrop}`);
                  }
                }
              }
            } else {
              const tmdbMovieUrl = `https://api.themoviedb.org/3/search/movie?api_key=3fd2be6f0c70a2a598f084ddfb75487d&query=${encodeURIComponent(
                movieData.Title
              )}`;
              const tmdbResponse = await fetch(tmdbMovieUrl, {
                method: 'GET',
                headers: { Accept: 'application/json', 'User-Agent': 'SeedboxLite/1.0' },
                signal: AbortSignal.timeout(10000)
              });

              if (tmdbResponse.ok) {
                const tmdbData = (await tmdbResponse.json()) as any;
                if (tmdbData.results && tmdbData.results.length > 0) {
                  const movie = tmdbData.results[0];
                  if (movie.backdrop_path) {
                    result.Backdrop = `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`;
                    console.log(`🎨 Enhanced with TMDB backdrop: ${result.Backdrop}`);
                  }
                }
              }
            }
          } catch (enhanceError: any) {
            console.log(`⚠️ Could not enhance with TMDB backdrop: ${enhanceError.message}`);
          }

          imdbCache.set(torrentName, result);
          return result;
        }
      } else {
        console.log(`❌ OMDb error: ${(data as any)?.Error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.log(`❌ OMDb request error: ${error.message}`);
    }
  }

  console.log(`🎭 Trying TMDB as fallback for: ${title}`);

  if (isLikelySeries) {
    try {
      const tmdbTvUrl = `https://api.themoviedb.org/3/search/tv?api_key=3fd2be6f0c70a2a598f084ddfb75487d&query=${encodeURIComponent(
        title
      )}${year ? `&first_air_date_year=${year}` : ''}`;
      console.log(`🔍 Trying TMDB TV: ${tmdbTvUrl}`);

      const searchResponse = await fetch(tmdbTvUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SeedboxLite/1.0'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!searchResponse.ok) {
        throw new Error(`HTTP ${searchResponse.status}: ${searchResponse.statusText}`);
      }

      const searchData = (await searchResponse.json()) as any;

      if (searchData.results && searchData.results.length > 0) {
        const show = searchData.results[0];

        const detailsUrl = `https://api.themoviedb.org/3/tv/${show.id}?api_key=3fd2be6f0c70a2a598f084ddfb75487d&append_to_response=credits`;
        const detailsResponse = await fetch(detailsUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'SeedboxLite/1.0'
          },
          signal: AbortSignal.timeout(15000)
        });

        if (!detailsResponse.ok) {
          throw new Error(`HTTP ${detailsResponse.status}: ${detailsResponse.statusText}`);
        }

        const details = (await detailsResponse.json()) as any;

        console.log(`✅ Found TMDB TV data: ${details.name} (${details.first_air_date?.substring(0, 4)})`);

        const result: any = {
          Title: details.name,
          Year: details.first_air_date?.substring(0, 4),
          imdbRating: details.vote_average ? ((details.vote_average / 10) * 10).toFixed(1) : null,
          imdbVotes: details.vote_count ? `${details.vote_count.toLocaleString()}` : null,
          Plot: details.overview,
          Director: details.created_by?.map((creator: any) => creator.name).join(', ') || 'N/A',
          Actors: details.credits?.cast?.slice(0, 4).map((actor: any) => actor.name).join(', '),
          Poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
          Backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : null,
          Genre: details.genres?.map((g: any) => g.name).join(', '),
          Runtime: details.episode_run_time?.[0] ? `${details.episode_run_time[0]} min` : null,
          Rated: 'N/A',
          tmdbID: details.id,
          Type: 'series',
          source: 'tmdb-tv'
        };

        imdbCache.set(torrentName, result);
        return result;
      }
    } catch (error: any) {
      console.log(`❌ TMDB TV error: ${error.message}`);
    }
  }

  try {
    const tmdbSearchUrl = `https://api.themoviedb.org/3/search/movie?api_key=3fd2be6f0c70a2a598f084ddfb75487d&query=${encodeURIComponent(
      title
    )}${year ? `&year=${year}` : ''}`;
    console.log(`🔍 Trying TMDB Movies: ${tmdbSearchUrl}`);

    const searchResponse = await fetch(tmdbSearchUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SeedboxLite/1.0'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!searchResponse.ok) {
      throw new Error(`HTTP ${searchResponse.status}: ${searchResponse.statusText}`);
    }

    const searchData = (await searchResponse.json()) as any;

    if (searchData.results && searchData.results.length > 0) {
      const movie = searchData.results[0];

      const detailsUrl = `https://api.themoviedb.org/3/movie/${movie.id}?api_key=3fd2be6f0c70a2a598f084ddfb75487d&append_to_response=credits`;
      const detailsResponse = await fetch(detailsUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SeedboxLite/1.0'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!detailsResponse.ok) {
        throw new Error(`HTTP ${detailsResponse.status}: ${detailsResponse.statusText}`);
      }

      const details = (await detailsResponse.json()) as any;

      console.log(`✅ Found TMDB Movie data: ${details.title} (${details.release_date?.substring(0, 4)})`);

      const result: any = {
        Title: details.title,
        Year: details.release_date?.substring(0, 4),
        imdbRating: details.vote_average ? ((details.vote_average / 10) * 10).toFixed(1) : null,
        imdbVotes: details.vote_count ? `${details.vote_count.toLocaleString()}` : null,
        Plot: details.overview,
        Director: details.credits?.crew?.find((person: any) => person.job === 'Director')?.name,
        Actors: details.credits?.cast?.slice(0, 4).map((actor: any) => actor.name).join(', '),
        Poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
        Backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : null,
        Genre: details.genres?.map((g: any) => g.name).join(', '),
        Runtime: details.runtime ? `${details.runtime} min` : null,
        Rated: 'N/A',
        tmdbID: details.id,
        Type: 'movie',
        source: 'tmdb-movie'
      };

      imdbCache.set(torrentName, result);
      return result;
    }
  } catch (error: any) {
    console.log(`❌ TMDB Movie error: ${error.message}`);
  }

  console.log(`❌ No movie/series data found for: ${title}`);
  return null;
}

const findExistingTorrent = (identifier: string): any => {
  if (torrents[identifier]) {
    return torrents[identifier];
  }

  const hashByName = nameToHash[identifier];
  if (hashByName && torrents[hashByName]) {
    return torrents[hashByName];
  }

  const storedTorrentId = torrentIds[identifier];
  if (storedTorrentId && torrents[storedTorrentId]) {
    return torrents[storedTorrentId];
  }

  const client = getClientInstance();

  if (identifier.length === 40) {
    const existingTorrent = client.torrents.find((t: any) => t.infoHash === identifier);
    if (existingTorrent) {
      registerTorrent(existingTorrent);
      return existingTorrent;
    }
  }

  const existingTorrent = client.torrents.find(
    (t: any) => t.name === identifier || t.magnetURI === identifier
  );
  if (existingTorrent) {
    registerTorrent(existingTorrent);
    return existingTorrent;
  }

  return null;
};

const universalTorrentResolver = async (identifier: string): Promise<any> => {
  const debugLevel = process.env.DEBUG === 'true';
  if (debugLevel) {
    console.log(`🔍 Universal resolver looking for: ${identifier}`);
  }

  const existing = findExistingTorrent(identifier);
  if (existing) {
    return existing;
  }

  if (identifier.startsWith('magnet:') || identifier.startsWith('http') || identifier.length === 40) {
    try {
      return await loadTorrentFromId(identifier);
    } catch (error: any) {
      console.error(`❌ Failed to load as new torrent:`, error.message);
    }
  }

  console.log(`❌ Universal resolver exhausted all strategies for: ${identifier}`);
  return null;
};

const loadTorrentFromId = (torrentId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Loading torrent: ${torrentId}`);

    let magnetUri = torrentId;
    if (torrentId.length === 40 && !torrentId.startsWith('magnet:')) {
      magnetUri = `magnet:?xt=urn:btih:${torrentId}&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:6969/announce&tr=udp://exodus.desync.com:6969/announce&tr=udp://tracker.torrent.eu.org:451/announce&tr=udp://tracker.tiny-vps.com:6969/announce&tr=udp://retracker.lanta-net.ru:2710/announce`;
      console.log(`🧲 Constructed magnet URI from hash: ${magnetUri}`);
    }

    let torrent: any;

    try {
      const torrentOptions = {
        announce: [
          'udp://tracker.opentrackr.org:1337/announce',
          'udp://open.demonii.com:1337/announce',
          'udp://tracker.openbittorrent.com:6969/announce',
          'udp://exodus.desync.com:6969/announce',
          'udp://tracker.torrent.eu.org:451/announce',
          'udp://tracker.tiny-vps.com:6969/announce',
          'udp://retracker.lanta-net.ru:2710/announce',
          'udp://9.rarbg.to:2710/announce',
          'udp://explodie.org:6969/announce',
          'udp://tracker.coppersurfer.tk:6969/announce',
          'wss://tracker.btorrent.xyz',
          'wss://tracker.webtorrent.io',
          'wss://tracker.openwebtorrent.com'
        ],
        private: false,
        strategy: 'rarest',
        maxWebConns: 30,
        path: './downloads'
      };

      const client = getClientInstance();
      torrent = client.add(magnetUri, torrentOptions);
    } catch (addError: any) {
      if (addError.message && addError.message.includes('duplicate')) {
        console.log(`🔍 Duplicate torrent detected in WebTorrent client, finding existing`);

        let hash = torrentId;
        if (torrentId.startsWith('magnet:')) {
          const match = torrentId.match(/xt=urn:btih:([a-fA-F0-9]{40})/);
          if (match) {
            hash = match[1];
          }
        }

        const client = getClientInstance();
        const existingTorrent = client.torrents.find(
          (t: any) => t.infoHash.toLowerCase() === hash.toLowerCase()
        );

        if (existingTorrent) {
          console.log(`✅ Found existing torrent in client: ${existingTorrent.name || existingTorrent.infoHash}`);
          registerTorrent(existingTorrent, torrentId);
          resolve(existingTorrent);
          return;
        }
      }

      reject(addError);
      return;
    }

    let resolved = false;

    const finishRegistration = (activeTorrent: any): void => {
      registerTorrent(activeTorrent, torrentId);
      activeTorrent.uploadLimit = 5000;
      activeTorrent.on('done', () => {
        console.log(`✅ Download complete for ${activeTorrent.name} - Stopping seeding`);
        activeTorrent.uploadLimit = 0;
      });

      activeTorrent.files.forEach((file: any) => {
        const ext = file.name.toLowerCase().split('.').pop();
        const isSubtitle = ['srt', 'vtt', 'ass', 'ssa', 'sub', 'sbv'].includes(ext);
        const isVideo = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v'].includes(ext);

        if (isSubtitle) {
          file.select();
          console.log(`📝 Subtitle file prioritized: ${file.name}`);
        } else if (isVideo) {
          file.select();

          const INITIAL_BUFFER_SIZE = 10 * 1024 * 1024;
          const initialStream = file.createReadStream({ start: 0, end: INITIAL_BUFFER_SIZE });
          initialStream.on('error', () => {});

          console.log(`🎬 Video file optimized for streaming: ${file.name}`);
        } else {
          file.deselect();
          console.log(`⏭️  Skipping: ${file.name}`);
        }
      });
    };

    torrent.on('ready', () => {
      if (resolved) {
        return;
      }
      resolved = true;

      console.log(`✅ Torrent loaded: ${torrent.name} (${torrent.infoHash})`);
      finishRegistration(torrent);
      resolve(torrent);
    });

    torrent.on('error', (error: any) => {
      if (resolved) {
        return;
      }
      resolved = true;
      console.error(`❌ Error loading torrent:`, error.message);
      reject(error);
    });

    setTimeout(() => {
      if (resolved) {
        return;
      }
      resolved = true;
      console.log(`⏰ Timeout loading torrent after 60 seconds: ${torrentId}`);

      const client = getClientInstance();
      const clientTorrent = client.torrents.find((t: any) => t.infoHash === torrent.infoHash);
      if (clientTorrent) {
        finishRegistration(clientTorrent);
        resolve(clientTorrent);
      } else {
        reject(new Error('Timeout loading torrent'));
      }
    }, 60000);
  });
};

function setupCacheCleanup(): void {
  console.log('🧹 Setting up cache cleanup system');

  setInterval(() => {
    const now = Date.now();
    let cleanedEntries = 0;

    const potentialCacheKeys = Object.keys(global).filter((key) => {
      return (
        key.startsWith('torrent_details_') ||
        key.startsWith('imdb_data_') ||
        key.startsWith('files_') ||
        key.startsWith('stats_') ||
        key === 'torrentListCache'
      );
    });

    potentialCacheKeys.forEach((key) => {
      const timeKey = `${key}_time`;

      if ((global as any)[timeKey]) {
        const maxAge = key.startsWith('imdb_data_') ? 3600000 : 300000;
        if (now - (global as any)[timeKey] > maxAge) {
          delete (global as any)[key];
          delete (global as any)[timeKey];
          cleanedEntries++;
        }
      } else if (key === 'torrentListCache' && (global as any).torrentListCacheTime) {
        if (now - (global as any).torrentListCacheTime > 300000) {
          delete (global as any).torrentListCache;
          delete (global as any).torrentListCacheTime;
          cleanedEntries++;
        }
      }
    });

    if (cleanedEntries > 0) {
      console.log(`🧹 Cache cleanup completed: ${cleanedEntries} entries removed`);
    }

    if ((global as any).gc) {
      try {
        (global as any).gc();
        console.log('♻️ Manual garbage collection triggered');
      } catch (error: any) {
        console.log('♻️ Manual garbage collection failed:', error.message);
      }
    }
  }, 300000);
}

function setupSystemMonitoring(app?: any): void {
  console.log('🩺 Setting up system health monitoring');

  (global as any).systemHealth = {
    startTime: Date.now(),
    lastCheck: Date.now(),
    memoryWarnings: 0,
    apiTimeouts: 0,
    streamErrors: 0,
    lastMemoryUsage: 0,
    torrentCount: 0,
    totalRequests: 0,
    highMemoryDetected: false
  };

  setInterval(() => {
    try {
      const client = getClientInstance();
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const rssMemoryMB = Math.round(memoryUsage.rss / 1024 / 1024);

      (global as any).systemHealth.lastCheck = Date.now();
      (global as any).systemHealth.lastMemoryUsage = rssMemoryMB;
      (global as any).systemHealth.torrentCount = client.torrents.length;

      console.log(`💾 Memory Usage: ${heapUsedMB}MB heap, ${rssMemoryMB}MB total`);
      console.log(
        `⚙️ System running for: ${Math.round((Date.now() - (global as any).systemHealth.startTime) / 1000 / 60)} minutes`
      );
      console.log(`🧲 Active torrents: ${client.torrents.length}`);

      const HIGH_MEMORY_THRESHOLD = 1024;
      if (rssMemoryMB > HIGH_MEMORY_THRESHOLD) {
        console.log(`⚠️ HIGH MEMORY USAGE DETECTED: ${rssMemoryMB}MB`);
        (global as any).systemHealth.memoryWarnings++;
        (global as any).systemHealth.highMemoryDetected = true;

        if ((global as any).systemHealth.memoryWarnings > 3) {
          console.log('🚨 CRITICAL MEMORY USAGE - Performing emergency cleanup');

          Object.keys(global).forEach((key) => {
            if (
              key.includes('_cache') ||
              key.includes('Cache') ||
              key.endsWith('_time') ||
              key.startsWith('torrent_details_') ||
              key.startsWith('files_') ||
              key.startsWith('stats_') ||
              key.startsWith('imdb_data_')
            ) {
              delete (global as any)[key];
            }
          });

          if ((global as any).gc) {
            try {
              (global as any).gc();
              console.log('♻️ Forced garbage collection');
            } catch (error: any) {
              console.log('♻️ Forced GC failed:', error.message);
            }
          }

          (global as any).systemHealth.memoryWarnings = 0;
        }
      } else {
        (global as any).systemHealth.highMemoryDetected = false;
        if ((global as any).systemHealth.memoryWarnings > 0) {
          (global as any).systemHealth.memoryWarnings--;
        }
      }

      if (client.torrents.length > 0) {
        const now = Date.now();
        client.torrents.forEach((torrent: any) => {
          if (torrent.progress >= 1) {
            return;
          }

          const addedTime = torrent.addedAt ? new Date(torrent.addedAt).getTime() : now;
          const runningHours = (now - addedTime) / (1000 * 60 * 60);

          if (runningHours > 12 && torrent.progress < 0.1) {
            console.log(
              `⚠️ Stalled torrent detected: ${torrent.name || torrent.infoHash} - Running for ${Math.round(runningHours)}h with only ${(torrent.progress * 100).toFixed(1)}% progress`
            );

            try {
              console.log(`🔄 Attempting to restart stalled torrent: ${torrent.infoHash}`);
              torrent.destroy();

              delete torrents[torrent.infoHash];

              setTimeout(() => {
                loadTorrentFromId(torrent.infoHash).catch((err: any) => {
                  console.error(`❌ Failed to restart torrent:`, err.message);
                });
              }, 5000);
            } catch (error: any) {
              console.error(`❌ Failed to restart stalled torrent:`, error.message);
            }
          }
        });
      }
    } catch (error: any) {
      console.error('❌ Error in system monitoring:', error.message);
    }
  }, 60000);

  if (app) {
    app.get('/api/system/health', (_req: any, res: any) => {
      const memoryUsage = process.memoryUsage();
      const client = getClientInstance();

      res.json({
        status: 'ok',
        uptime: Date.now() - (global as any).systemHealth.startTime,
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        },
        torrents: client.torrents.length,
        warnings: {
          memory: (global as any).systemHealth.memoryWarnings,
          api: (global as any).systemHealth.apiTimeouts
        },
        highMemory: (global as any).systemHealth.highMemoryDetected,
        timestamp: Date.now()
      });
    });
  }
}

function disableSeedingForCompletedTorrents(): number {
  let completedCount = 0;
  const client = getClientInstance();

  client.torrents.forEach((torrent: any) => {
    if (torrent.progress === 1 || torrent.downloaded === torrent.length) {
      torrent.uploadLimit = 0;
      completedCount++;
      console.log(`✅ Found completed torrent: ${torrent.name} - Disabled seeding`);
    } else {
      torrent.once('done', () => {
        console.log(`✅ Download complete for ${torrent.name} - Stopping seeding`);
        torrent.uploadLimit = 0;
      });
    }
  });

  return completedCount;
}

export {
  torrents,
  torrentIds,
  torrentNames,
  hashToName,
  nameToHash,
  imdbCache,
  cleanTorrentName,
  fetchIMDBData,
  universalTorrentResolver,
  loadTorrentFromId,
  registerTorrent,
  setupCacheCleanup,
  setupSystemMonitoring,
  disableSeedingForCompletedTorrents
};

// CommonJS compatibility
module.exports = {
  torrents,
  torrentIds,
  torrentNames,
  hashToName,
  nameToHash,
  imdbCache,
  cleanTorrentName,
  fetchIMDBData,
  universalTorrentResolver,
  loadTorrentFromId,
  registerTorrent,
  setupCacheCleanup,
  setupSystemMonitoring,
  disableSeedingForCompletedTorrents
};
