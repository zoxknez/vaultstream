import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach } from 'vitest';
import ServerSessionStatus from '../ServerSessionStatus';
import { useServerSession } from '../../contexts/ServerSessionContext.jsx';

vi.mock('../../contexts/ServerSessionContext.jsx', () => ({
  useServerSession: vi.fn(),
}));

const mockedUseServerSession = useServerSession;

describe('ServerSessionStatus', () => {
  beforeEach(() => {
    mockedUseServerSession.mockReset();
  });

  it('renders login form and submits credentials when session is inactive', async () => {
    const loginMock = vi.fn().mockResolvedValue({ message: 'Authenticated' });
    const resetErrorMock = vi.fn();

    mockedUseServerSession.mockReturnValue({
      session: { authenticated: false },
      loading: false,
      error: null,
      login: loginMock,
      logout: vi.fn(),
      resetError: resetErrorMock,
    });

    render(<ServerSessionStatus />);

  const passwordField = screen.getByLabelText(/password/i, { selector: 'input' });
    expect(screen.getByRole('button', { name: /unlock backend/i })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(passwordField, 'superSecret');
    await user.click(screen.getByRole('button', { name: /unlock backend/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('superSecret');
    });
    await waitFor(() => {
      expect(resetErrorMock).toHaveBeenCalled();
    });
  });

  it('renders active session summary when authenticated', () => {
    mockedUseServerSession.mockReturnValue({
      session: {
        authenticated: true,
        lastAuthenticatedAt: '2025-01-01T12:00:00.000Z',
      },
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      resetError: vi.fn(),
    });

    render(<ServerSessionStatus />);

    expect(screen.getByText(/Backend session active/i)).toBeInTheDocument();
    expect(screen.getByText(/Established at/i)).toBeInTheDocument();
  });
});
