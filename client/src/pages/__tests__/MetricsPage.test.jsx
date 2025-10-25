import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import MetricsPage from '../MetricsPage.jsx';

vi.mock('../../services/metricsService', () => {
  const fetchMetricsText = vi.fn();
  const parsePrometheusMetrics = vi.fn();
  const getSingleMetricValue = vi.fn();

  return {
    __esModule: true,
    fetchMetricsText,
    parsePrometheusMetrics,
    getSingleMetricValue
  };
});

vi.mock('../../services/api', () => ({
  checkServerHealth: vi.fn()
}));

vi.mock('../../services/serverAuthService', () => ({
  markServerSessionInvalid: vi.fn()
}));

vi.mock('../../contexts/ServerSessionContext.jsx', () => ({
  useServerSession: vi.fn(() => ({
    session: { authenticated: true }
  }))
}));

vi.mock('../../components/ServerSessionStatus.jsx', () => ({
  __esModule: true,
  default: ({ compact }) => <div data-testid="session-status">session:{compact ? 'compact' : 'full'}</div>,
  Alert: () => <div data-testid="session-alert">session-alert</div>
}));

vi.mock('../MetricsPage.css', () => ({}));

const metricsModule = await import('../../services/metricsService');
const apiModule = await import('../../services/api');
const { useServerSession } = await import('../../contexts/ServerSessionContext.jsx');

const sampleMetricsPayload = {
  seedbox_active_connections: [{ value: 4 }],
  seedbox_active_torrents: [{ value: 9 }],
  seedbox_stream_throughput_bytes_per_second: [{ value: 2048 }],
  seedbox_http_request_duration_ms_sum: [{ value: 1500 }],
  seedbox_http_request_duration_ms_count: [{ value: 30 }],
  seedbox_cache_items: [],
  seedbox_cache_hits_total: [],
  seedbox_cache_misses_total: []
};

const renderPage = () => render(<MetricsPage />);

describe('MetricsPage', () => {
  beforeEach(() => {
    useServerSession.mockReturnValue({
      session: { authenticated: true }
    });

    metricsModule.fetchMetricsText.mockResolvedValue('# mock metrics');
    metricsModule.parsePrometheusMetrics.mockReturnValue(sampleMetricsPayload);
    metricsModule.getSingleMetricValue.mockImplementation((metrics, metricName) => {
      const mapping = {
        seedbox_active_connections: 4,
        seedbox_active_torrents: 9,
        seedbox_stream_throughput_bytes_per_second: 2048,
        seedbox_http_request_duration_ms_sum: 1500,
        seedbox_http_request_duration_ms_count: 30,
        seedbox_http_rate_limited_total: 2
      };
      return mapping[metricName] ?? null;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('prikazuje health snapshot kada endpoint odgovori uspešno', async () => {
    apiModule.checkServerHealth.mockResolvedValue({
      status: 'ok',
      uptimeSeconds: 93780,
      startedAt: '2025-10-12T10:00:00.000Z',
      timestamp: '2025-10-13T10:01:00.000Z',
      disk: {
        total: 1024 * 1024 * 1024 * 2,
        used: 1024 * 1024 * 1024,
        available: 1024 * 1024 * 1024,
        percentage: 50
      },
      build: {
        version: '2024.09.1',
        commit: 'abcdef123456',
        environment: 'production',
        node: 'v20.11.0',
        timestamp: '2025-10-12T10:00:00.000Z'
      }
    });

    renderPage();

    await waitFor(() => {
      expect(apiModule.checkServerHealth).toHaveBeenCalled();
      expect(metricsModule.fetchMetricsText).toHaveBeenCalled();
    });

    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
    expect(screen.getByText(/Since/)).toBeInTheDocument();
    expect(screen.getByText('Disk Usage')).toBeInTheDocument();
    expect(screen.getByText('Build Signature')).toBeInTheDocument();
    expect(screen.getByText('2024.09.1')).toBeInTheDocument();
    expect(screen.getByText(/production/)).toBeInTheDocument();
    expect(screen.getByText(/Node v20.11.0/)).toBeInTheDocument();
  });

  it('prikazuje grešku kada health endpoint ne radi', async () => {
    apiModule.checkServerHealth.mockRejectedValue(new Error('offline'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });
  });
});
