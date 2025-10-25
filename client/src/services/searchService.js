import { config } from '../config/environment';

const buildQueryString = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length) {
        query.append(key, value.join(','));
      }
    } else if (value !== '') {
      query.append(key, value);
    }
  });
  return query.toString();
};

const searchService = {
  async search(query, options = {}) {
    const qs = buildQueryString({
      q: query,
      page: options.page,
      limit: options.limit,
      sources: options.sources
    });

    const response = await fetch(`${config.getApiUrl('/api/search')}${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Search failed');
    }

    return data;
  },

  async listSources() {
    const response = await fetch(config.getApiUrl('/api/search/sources'), {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Unable to load available sources');
    }

    return data.sources || [];
  }
};

export default searchService;
