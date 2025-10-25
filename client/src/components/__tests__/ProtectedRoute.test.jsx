import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, beforeEach, vi, expect } from 'vitest';
import ProtectedRoute from '../ProtectedRoute.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Navigate } from 'react-router-dom';

vi.mock('../../contexts/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: vi.fn(({ to, state, replace }) => (
      <div
        data-testid="navigate"
        data-to={to}
        data-replace={replace ? 'true' : 'false'}
      >
        {state ? JSON.stringify(state) : null}
      </div>
    )),
  };
});

const mockedUseAuth = useAuth;
const mockedNavigate = vi.mocked(Navigate);

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
    mockedNavigate.mockClear();
  });

  const renderWithRouter = (ui) => {
    return render(
      <MemoryRouter initialEntries={['/secure']}>{ui}</MemoryRouter>
    );
  };

  it('shows loading indicator while auth state is resolving', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: true,
      isConfigured: false,
      isGuest: false,
    });

    renderWithRouter(
      <ProtectedRoute>
        <div>Allowed</div>
      </ProtectedRoute>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it('redirects to login when Supabase is not configured and guest mode not selected', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isConfigured: false,
      isGuest: false,
    });

    renderWithRouter(
      <ProtectedRoute>
        <div>Allowed</div>
      </ProtectedRoute>
    );

  const redirect = screen.getByTestId('navigate');
  expect(redirect).toHaveAttribute('data-to', '/login');
  const statePayload = redirect.textContent;
  expect(statePayload).toBeTruthy();
  expect(JSON.parse(statePayload)).toEqual({ from: expect.objectContaining({ pathname: '/secure' }) });
  });

  it('redirects to login when auth is required but user is not authenticated', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isConfigured: true,
      isGuest: false,
    });

    renderWithRouter(
      <ProtectedRoute>
        <div>Allowed</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
  });

  it('allows guest access when Supabase is not configured but guest mode is active', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isConfigured: false,
      isGuest: true,
    });

    renderWithRouter(
      <ProtectedRoute>
        <div>Guest content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText(/guest content/i)).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).toBeNull();
  });

  it('redirects to home when auth not required but user already authenticated', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: '123' },
      loading: false,
      isConfigured: true,
      isGuest: false,
    });

    renderWithRouter(
      <ProtectedRoute requireAuth={false}>
        <div>Login page placeholder</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
  });

  it('redirects to home when auth not required and guest session already active', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isConfigured: false,
      isGuest: true,
    });

    renderWithRouter(
      <ProtectedRoute requireAuth={false}>
        <div>Login page placeholder</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
  });

  it('renders children when access is allowed', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      isConfigured: true,
      isGuest: false,
    });

    renderWithRouter(
      <ProtectedRoute>
        <div>Private content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText(/private content/i)).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).toBeNull();
  });
});
