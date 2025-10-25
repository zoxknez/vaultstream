import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AboutPage from '../AboutPage.jsx';

vi.mock('../../services/api', () => ({
  checkServerHealth: vi.fn()
}));

vi.mock('../AboutPage.css', () => ({}));

const apiModule = await import('../../services/api');

describe('AboutPage', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('prikazuje informacije o aplikaciji i kontakt kada health radi', async () => {
    apiModule.checkServerHealth.mockResolvedValue({
      status: 'ok',
      uptimeSeconds: 54000,
      startedAt: '2025-10-13T00:00:00.000Z',
      timestamp: '2025-10-13T12:00:00.000Z',
      disk: {
        total: 1024 * 1024 * 1024 * 2,
        used: 1024 * 1024 * 1024,
        available: 1024 * 1024 * 1024,
        percentage: 50
      },
      build: {
        version: '2024.09.1',
        commit: 'abcdef123456',
        environment: 'production'
      }
    });

    render(<AboutPage />);

    expect(
      await screen.findByText(/StreamVault – Your Private Netflix Alternative/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Server Status/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('OK')).toBeInTheDocument();
    });

    expect(screen.getByText(/contact@streamvault.app/i)).toBeInTheDocument();
    expect(screen.getByText('+381 60 123 4567')).toBeInTheDocument();
  });

  it('prikazuje poruku o grešci kada health endpoint nije dostupan', async () => {
    apiModule.checkServerHealth.mockRejectedValue(new Error('offline'));

    render(<AboutPage />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to fetch server status/i)).toBeInTheDocument();
    });
  });
});
