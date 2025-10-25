import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, beforeEach, expect, vi, afterEach } from 'vitest';
import SyncStatusIndicator from '../SyncStatusIndicator.jsx';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../hooks/useSyncHooks', () => ({
  useCloudSync: vi.fn()
}));

vi.mock('../../hooks/useSyncStatusContext', () => ({
  useSyncStatusContext: vi.fn()
}));

const { useAuth } = await import('../../contexts/AuthContext');
const { useCloudSync } = await import('../../hooks/useSyncHooks');
const { useSyncStatusContext } = await import('../../hooks/useSyncStatusContext');

const baseAnalytics = {
  queueSize: 0,
  lastError: null,
  lastFlush: null
};

const buildCloudSync = (overrides = {}) => ({
  syncing: false,
  lastSyncTime: new Date('2025-10-11T10:00:00Z').toISOString(),
  syncError: null,
  syncStats: {
    watchlistPulled: 1,
    watchlistPushed: 2,
    progressPulled: 3,
    progressPushed: 4
  },
  sync: vi.fn().mockResolvedValue({ ok: true }),
  ...overrides
});

const renderIndicator = () => render(<SyncStatusIndicator />);

describe('SyncStatusIndicator', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true
    });

    useAuth.mockReturnValue({
      user: { id: 'user-1' },
      configured: true
    });

    useSyncStatusContext.mockReturnValue({
      analytics: baseAnalytics,
      flushAnalytics: vi.fn().mockResolvedValue({ flushed: 0 })
    });

    useCloudSync.mockReturnValue(buildCloudSync());
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('prikazuje osnovni status i poslednji sinhronizovani trenutak', async () => {
    renderIndicator();

    expect(screen.getByText('Synced')).toBeInTheDocument();

    const indicator = screen.getByText('Synced').closest('.sync-status-indicator');
    fireEvent.click(indicator);

  const [lastSyncLabel] = await screen.findAllByText(/Last Sync/i);
  const value = lastSyncLabel.closest('.sync-info-row')?.querySelector('.sync-info-value');
  const daysDiff = Math.floor((Date.now() - new Date('2025-10-11T10:00:00Z').getTime()) / (1000 * 60 * 60 * 24));
  expect(value?.textContent).toBe(`${daysDiff}d ago`);
  });

  it('otvara detalje i prikazuje statistiku synca i queue badge', async () => {
    useSyncStatusContext.mockReturnValue({
      analytics: {
        ...baseAnalytics,
        queueSize: 7,
        lastFlush: { count: 5, timestamp: new Date('2025-10-13T10:30:00Z').toISOString() }
      },
      flushAnalytics: vi.fn().mockResolvedValue({ flushed: 5 })
    });

    useCloudSync.mockReturnValue(buildCloudSync());

    renderIndicator();

  expect(screen.getByText('7')).toBeInTheDocument();

  const indicator = screen.getByText('Synced').closest('.sync-status-indicator');
  fireEvent.click(indicator);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Cloud Sync Status' })).toBeInTheDocument();
    });

    expect(screen.getByText('Watchlist Pulled:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Pošalji analitiku/i })).toBeInTheDocument();
  });

  it('prikazuje grešku kada sync prijavi problem', async () => {
    useCloudSync.mockReturnValue(buildCloudSync({
      syncing: false,
      syncError: 'Network unreachable'
    }));

    renderIndicator();

  const indicator = screen.getByText('Error').closest('.sync-status-indicator');
  fireEvent.click(indicator);

  expect(await screen.findByText('Network unreachable')).toBeInTheDocument();
  });
});
