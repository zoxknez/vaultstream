import { fetchWithTimeout, createBackoffFetcher } from '../utils/fetchWithTimeout';
import { extractRequestId } from '../utils/errorUtils';

// Get the API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const safeJsonParse = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
};

const encodeTorrentIdentifier = (identifier) => {
  if (identifier === undefined || identifier === null) {
    throw new Error('Torrent identifier is required');
  }
  return encodeURIComponent(String(identifier));
};

const performTorrentMutation = async (path, {
  method = 'POST',
  body,
  headers,
  timeout = 7000,
  logContext = 'performing torrent mutation'
} = {}) => {
  const requestHeaders = { ...(headers || {}) };
  let requestBody = body;

  if (requestBody && !(requestBody instanceof FormData) && typeof requestBody === 'object') {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(requestBody);
  }

  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: requestBody,
      withCsrf: true
    }, timeout);

    return await safeJsonParse(response);
  } catch (error) {
    console.error(`Error ${logContext}:`, {
      error,
      requestId: extractRequestId(error)
    });
    throw error;
  }
};

/**
 * Get the list of all torrents
 */
export const getTorrents = async () => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/torrents`, {}, 5000);
    return await response.json();
  } catch (error) {
    console.error('Error fetching torrents:', {
      error,
      requestId: extractRequestId(error)
    });
    throw error;
  }
};

/**
 * Get detailed information about a specific torrent
 * @param {string} id - Torrent ID or info hash
 */
export const getTorrentDetails = async (id) => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/torrents/${id}`, {}, 10000);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching details for torrent ${id}:`, {
      error,
      requestId: extractRequestId(error)
    });
    throw error;
  }
};

/**
 * Get statistics for a specific torrent
 * @param {string} id - Torrent ID or info hash
 */
export const getTorrentStats = async (id) => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/torrents/${id}/stats`, {}, 5000);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching stats for torrent ${id}:`, {
      error,
      requestId: extractRequestId(error)
    });
    throw error;
  }
};

/**
 * Get files for a specific torrent
 * @param {string} id - Torrent ID or info hash
 */
export const getTorrentFiles = async (id) => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/torrents/${id}/files`, {}, 8000);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching files for torrent ${id}:`, {
      error,
      requestId: extractRequestId(error)
    });
    throw error;
  }
};

/**
 * Add a new torrent
 * @param {string} torrentId - Magnet URI or torrent info hash
 */
export const addTorrent = async (torrentId) => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/torrents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ torrentId }),
      withCsrf: true
    }, 15000);
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || 'Failed to add torrent');
    }

    return data;
  } catch (error) {
    console.error('Error adding torrent:', {
      error,
      requestId: extractRequestId(error)
    });
    throw error;
  }
};

/**
 * Upload a .torrent file and add it to the client
 * @param {File} file - Torrent file to upload
 */
export const uploadTorrentFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('torrentFile', file);

    const response = await fetchWithTimeout(`${API_BASE_URL}/api/torrents/upload`, {
      method: 'POST',
      body: formData,
      withCsrf: true
    }, 45000);

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || 'Failed to upload torrent file');
    }

    return data;
  } catch (error) {
    console.error('Error uploading torrent file:', {
      error,
      requestId: extractRequestId(error)
    });
    throw error;
  }
};

/**
 * Delete a torrent
 * @param {string} id - Torrent ID or info hash
 */
export const deleteTorrent = async (id) => {
  return performTorrentMutation(`/api/torrents/${encodeTorrentIdentifier(id)}`, {
    method: 'DELETE',
    timeout: 10000,
    logContext: `deleting torrent ${id}`
  });
};

export const pauseTorrent = async (id) => {
  return performTorrentMutation(`/api/torrents/${encodeTorrentIdentifier(id)}/pause`, {
    logContext: `pausing torrent ${id}`
  });
};

export const resumeTorrent = async (id) => {
  return performTorrentMutation(`/api/torrents/${encodeTorrentIdentifier(id)}/resume`, {
    logContext: `resuming torrent ${id}`
  });
};

export const clearAllTorrents = async () => {
  return performTorrentMutation('/api/torrents', {
    method: 'DELETE',
    timeout: 15000,
    logContext: 'clearing all torrents'
  });
};

/**
 * Get the URL for streaming a file from a torrent
 * @param {string} torrentId - Torrent ID or info hash
 * @param {number} fileIndex - File index
 */
export const getStreamUrl = (torrentId, fileIndex) => {
  return `${API_BASE_URL}/api/torrents/${torrentId}/files/${fileIndex}/stream`;
};

/**
 * Get IMDB data for a torrent
 * @param {string} id - Torrent ID or info hash
 */
export const getImdbData = async (id) => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/torrents/${id}/imdb`, {}, 10000);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching IMDB data for torrent ${id}:`, {
      error,
      requestId: extractRequestId(error)
    });
    throw error;
  }
};

/**
 * Check server health (public endpoint)
 */
export const checkServerHealth = async () => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/health`, {}, 5000);
    return await response.json();
  } catch (error) {
    console.error('Error checking server health:', {
      error,
      requestId: extractRequestId(error)
    });
    throw error;
  }
};

// Create enhanced fetchers with retry logic
export const getTorrentsWithRetry = createBackoffFetcher(getTorrents);
export const getTorrentDetailsWithRetry = (id) => createBackoffFetcher(() => getTorrentDetails(id))();
export const getTorrentStatsWithRetry = (id) => createBackoffFetcher(() => getTorrentStats(id))();
