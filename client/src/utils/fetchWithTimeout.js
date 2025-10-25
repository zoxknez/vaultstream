/**
 * Enhanced fetch with timeout support to prevent hanging requests
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} - Fetch response
 */
import ApiError from './ApiError';
import { getCsrfHeader, clearServerSession } from '../services/serverSession';

export const fetchWithTimeout = async (url, options = {}, timeout = 8000) => {
  const { withCsrf = false, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      credentials: fetchOptions.credentials || 'include',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...(fetchOptions.headers || {}),
        ...(withCsrf ? getCsrfHeader() : {})
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let responseBody;
      let message = `Request failed with status ${response.status}`;
      let requestId = response.headers.get('x-request-id');

      try {
        const cloned = response.clone();
        responseBody = await cloned.json();
        if (responseBody?.error) {
          message = responseBody.error;
        }
        if (!requestId && typeof responseBody?.requestId === 'string') {
          requestId = responseBody.requestId;
        }
      } catch {
        try {
          const text = await response.clone().text();
          responseBody = text;
        } catch {
          responseBody = null;
        }
      }

      const errorPayload = new ApiError(message, {
        status: response.status,
        requestId,
        body: responseBody,
        url,
        method: fetchOptions.method || 'GET'
      });

      if (withCsrf && (response.status === 401 || response.status === 403)) {
        clearServerSession();
      }

      throw errorPayload;
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error(`Request to ${url} timed out after ${timeout}ms`);
      throw new ApiError(`Request timeout after ${timeout}ms`, {
        status: 504,
        url,
        method: fetchOptions.method || 'GET',
        originalError: error
      });
    }
    throw error;
  }
};

/**
 * Custom hook for API data fetching with retry and exponential backoff
 * @param {Function} fetchFunction - The function to fetch data
 * @param {number} initialDelay - Initial delay in milliseconds
 * @param {number} maxRetries - Maximum number of retries
 * @returns {object} - Data, loading state, error, and refetch function
 */
export const createBackoffFetcher = (fetchFunction, initialDelay = 3000, maxRetries = 3) => {
  let currentDelay = initialDelay;
  let retries = 0;
  let activeRequestTimestamp = null;
  
  // Return an enhanced version of the fetch function with retry logic
  return async () => {
    // Generate unique request ID
    const requestTimestamp = Date.now();
    activeRequestTimestamp = requestTimestamp;
    
    try {
      const response = await fetchFunction();
      // On success, reset retry parameters
      retries = 0;
      currentDelay = initialDelay;
      return response;
    } catch (error) {
      // Only process if this is still the active request
      if (requestTimestamp !== activeRequestTimestamp) {
        throw error;
      }
      
      // If we've hit max retries, throw the error
      if (retries >= maxRetries) {
        retries = 0; // Reset for next time
        currentDelay = initialDelay;
        throw error;
      }
      
      // Otherwise, increment retries and apply exponential backoff
      retries++;
      const backoffDelay = currentDelay;
      currentDelay = Math.min(currentDelay * 1.5, 30000); // Max 30 seconds
      
      console.log(`Retrying after ${backoffDelay}ms (attempt ${retries}/${maxRetries})`);
      
      // Wait for the backoff period
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      // Try again recursively
      return fetchFunction();
    }
  };
};
