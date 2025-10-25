import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import ApiError from '../utils/ApiError';
import { clearServerSession, getCsrfHeader, setCsrfToken } from './serverSession';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const resolveJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    throw new ApiError('Invalid JSON response from server.', {
      status: response.status,
      url: response.url,
      method: response.method || 'GET',
      originalError: error
    });
  }
};

export const loginToServer = async (password) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/auth/login`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    },
    8000
  );

  const payload = await resolveJson(response);
  if (!payload?.success) {
    const message = payload?.error?.message || 'Authentication failed.';
    throw new ApiError(message, {
      status: response.status,
      body: payload,
      url: response.url,
      method: 'POST'
    });
  }

  const csrfToken = payload?.data?.csrfToken;
  if (!csrfToken) {
    throw new ApiError('CSRF token missing from login response.', {
      status: response.status,
      body: payload,
      url: response.url,
      method: 'POST'
    });
  }

  setCsrfToken(csrfToken);

  return {
    csrfToken,
    message: payload?.data?.message || 'Authentication successful'
  };
};

export const logoutFromServer = async () => {
  const headers = {
    'Content-Type': 'application/json',
    ...getCsrfHeader()
  };

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/auth/logout`,
      {
        method: 'POST',
        credentials: 'include',
        headers
      },
      5000
    );

    if (response.ok) {
      clearServerSession();
      return true;
    }

    if (response.status === 401 || response.status === 403) {
      clearServerSession();
      return false;
    }

    const payload = await resolveJson(response);
    throw new ApiError(payload?.error?.message || 'Logout failed.', {
      status: response.status,
      body: payload,
      url: response.url,
      method: 'POST'
    });
  } catch (error) {
    clearServerSession();
    throw error;
  }
};

export const markServerSessionInvalid = () => {
  clearServerSession();
};
