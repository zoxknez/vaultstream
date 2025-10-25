import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, beforeEach, vi, expect } from 'vitest';
import LoginPage from '../LoginPage.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

vi.mock('../../contexts/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = useAuth;

const renderLoginPage = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>
  );

describe('LoginPage', () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
  });

  it('prikazuje guest baner kada Supabase nije konfigurisan', async () => {
    const enterAsGuest = vi.fn();

    mockedUseAuth.mockReturnValue({
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      enterAsGuest,
      user: null,
      configured: false,
      loading: false,
    });

    renderLoginPage();

    const guestButton = await screen.findByRole('button', { name: /continue as guest/i });

    expect(screen.getByText(/supabase not configured/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();

    fireEvent.click(guestButton);
    expect(enterAsGuest).toHaveBeenCalledTimes(1);
  });

  it('pokreće login sa unetim kredencijalima', async () => {
    const signIn = vi.fn().mockResolvedValue({});

    mockedUseAuth.mockReturnValue({
      signIn,
      signInWithMagicLink: vi.fn(),
      enterAsGuest: vi.fn(),
      user: null,
      configured: true,
      loading: false,
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'secret123' },
    });

  fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('user@example.com', 'secret123');
    });
  });
});
