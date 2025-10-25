import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AnalyticsInsightsPage from '../AnalyticsInsightsPage.jsx';

vi.mock('../../services/analyticsService', () => {
  const getSummary = vi.fn();
  const flush = vi.fn();

  return {
    __esModule: true,
    default: {
      getSummary,
      flush
    },
    getSummary,
    flush
  };
});

vi.mock('../../hooks/useSyncStatusContext', () => ({
  useSyncStatusContext: vi.fn()
}));

const analyticsModule = await import('../../services/analyticsService');
const { useSyncStatusContext } = await import('../../hooks/useSyncStatusContext');

const mockSummary = {
  totals: {
    'continue_resume_click': 10,
    'search_performed': 5
  },
  topWatchlist: [{ name: 'Example Show', count: 3 }],
  topProgress: [],
  topGenres: [],
  topSearches: [],
  recent: [],
  dailyTotals: [
    {
      date: '2025-10-11',
      total: 8,
      byEvent: { continue_resume_click: 5, search_performed: 3 }
    },
    {
      date: '2025-10-12',
      total: 10,
      byEvent: { continue_resume_click: 6, search_performed: 4 }
    }
  ],
  anomalies: [
    {
      date: '2025-10-12',
      percentChange: 0.2
    }
  ]
};

const renderPage = () => render(<AnalyticsInsightsPage />);

describe('AnalyticsInsightsPage', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true
    });

    analyticsModule.getSummary.mockResolvedValue(mockSummary);
    analyticsModule.flush.mockResolvedValue({ flushed: 0 });
    analyticsModule.default.getSummary.mockResolvedValue(mockSummary);
    analyticsModule.default.flush.mockResolvedValue({ flushed: 0 });

    useSyncStatusContext.mockReturnValue({
      analytics: {
        queueSize: 2,
        lastFlush: { count: 4, timestamp: new Date('2025-10-12T22:00:00Z').toISOString(), durationMs: 420 },
        lastError: null,
        flushHistory: [
          { timestamp: new Date('2025-10-12T20:00:00Z').toISOString(), durationMs: 380, count: 3 },
          { timestamp: new Date('2025-10-12T22:00:00Z').toISOString(), durationMs: 420, count: 4 }
        ]
      },
      flushAnalytics: vi.fn().mockResolvedValue({ flushed: 3 })
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('učitava i prikazuje sažetak analitike', async () => {
    renderPage();

    const totalsHeading = await screen.findByText('Total Events');
    expect(totalsHeading).toBeInTheDocument();

    expect(screen.getByText('continue_resume_click · 10')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Offline Queue/i })).toBeInTheDocument();

    const queueRow = screen.getByText('Currently waiting').closest('li');
    expect(queueRow).not.toBeNull();
    expect(within(queueRow).getByText('2')).toBeInTheDocument();

    expect(screen.getByText(/Sync flush latency/i)).toBeInTheDocument();
    expect(screen.getByText('Latest')).toBeInTheDocument();
    expect(screen.getByText('420ms')).toBeInTheDocument();
  });

  it('ručni flush prikazuje poruku o uspehu i ponovo učitava podatke', async () => {
  const reloadSpy = analyticsModule.getSummary;

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Total Events')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Send manually/i }));

    await waitFor(() => {
      expect(screen.getByText(/Sent 3 events/i)).toBeInTheDocument();
    });

    // flush triggers follow-up summary reload
  expect(reloadSpy).toHaveBeenCalledTimes(2);
  });
});
