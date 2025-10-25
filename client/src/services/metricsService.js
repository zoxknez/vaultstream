import { fetchWithTimeout } from '../utils/fetchWithTimeout';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Fetch raw Prometheus metrics text from the backend.
 */
export const fetchMetricsText = async () => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/metrics`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'text/plain'
      }
    },
    7000
  );

  return response.text();
};

/**
 * Parse Prometheus text format into a structured object.
 * Returns a dictionary keyed by metric name with an array of samples per metric.
 */
export const parsePrometheusMetrics = (rawText = '') => {
  if (!rawText || typeof rawText !== 'string') {
    return {};
  }

  const lines = rawText.split('\n');
  const metrics = {};
  const sampleRegex = /^([a-zA-Z_:][\w:]*)(?:\{([^}]*)\})?\s+(-?[0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?)/;

  for (const line of lines) {
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = line.match(sampleRegex);
    if (!match) {
      continue;
    }

    const [, name, rawLabels = '', valueStr] = match;
    const value = Number(valueStr);
    const labels = {};

    if (rawLabels) {
      const parts = rawLabels.split(',');
      for (const part of parts) {
        const [key, rawVal] = part.split('=');
        if (!key) continue;
        const normalizedValue = rawVal ? rawVal.replace(/^"|"$/g, '') : '';
        labels[key.trim()] = normalizedValue;
      }
    }

    if (!metrics[name]) {
      metrics[name] = [];
    }

    metrics[name].push({ value, labels });
  }

  return metrics;
};

/**
 * Helper to retrieve a single value gauge/counter.
 */
export const getSingleMetricValue = (metrics, name, predicate = () => true) => {
  const samples = metrics?.[name];
  if (!samples || samples.length === 0) {
    return null;
  }

  const sample = samples.find(({ labels }) => predicate(labels)) || samples[0];
  return typeof sample.value === 'number' ? sample.value : null;
};
