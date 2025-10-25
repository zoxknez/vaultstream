/**
 * Retry a failed async operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of the operation
 */
export const retryOperation = async (
  operation,
  {
    maxRetries = 3,
    delay = 1000,
    exponential = true,
    onRetry = null
  } = {}
) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay (exponential or fixed)
      const waitTime = exponential 
        ? delay * Math.pow(2, attempt)
        : delay;

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, maxRetries, waitTime, error);
      }

      // Wait before retrying
      await sleep(waitTime);
    }
  }

  throw lastError;
};

/**
 * Retry with specific error conditions
 * @param {Function} operation - Async function to retry
 * @param {Function} shouldRetry - Function to determine if should retry based on error
 * @param {Object} options - Retry options
 */
export const retryIf = async (
  operation,
  shouldRetry,
  options = {}
) => {
  return retryOperation(async () => {
    try {
      return await operation();
    } catch (error) {
      if (!shouldRetry(error)) {
        throw error;
      }
      throw error;
    }
  }, options);
};

/**
 * Retry network requests specifically
 * @param {Function} fetchOperation - Fetch operation to retry
 * @param {Object} options - Retry options
 */
export const retryFetch = async (fetchOperation, options = {}) => {
  return retryIf(
    fetchOperation,
    (error) => {
      // Retry on network errors or 5xx server errors
      return (
        error.name === 'NetworkError' ||
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        (error.status >= 500 && error.status < 600)
      );
    },
    {
      maxRetries: 3,
      delay: 1000,
      exponential: true,
      ...options
    }
  );
};

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Timeout wrapper for promises
 * @param {Promise} promise - Promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise}
 */
export const withTimeout = (promise, ms = 10000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), ms)
    )
  ]);
};

/**
 * Retry with timeout
 * @param {Function} operation - Async operation
 * @param {number} timeout - Timeout per attempt in ms
 * @param {Object} retryOptions - Retry options
 */
export const retryWithTimeout = async (
  operation,
  timeout = 10000,
  retryOptions = {}
) => {
  return retryOperation(
    () => withTimeout(operation(), timeout),
    retryOptions
  );
};

export default retryOperation;
