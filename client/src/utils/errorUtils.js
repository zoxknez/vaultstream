import ApiError from './ApiError';
import copyToClipboard from './copyToClipboard';

export const extractRequestId = (error) => {
  if (!error) return undefined;

  if (typeof error.requestId === 'string' && error.requestId.trim().length > 0) {
    return error.requestId.trim();
  }

  if (error.body && typeof error.body === 'object' && typeof error.body.requestId === 'string') {
    return error.body.requestId.trim();
  }

  if (error.body && typeof error.body === 'string') {
    const match = error.body.match(/requestId"?\s*[:=]\s*"?([\w-]+)/i);
    if (match) {
      return match[1];
    }
  }

  if (error.response && typeof error.response === 'object') {
    if (typeof error.response.requestId === 'string') {
      return error.response.requestId.trim();
    }
    if (typeof error.response.headers?.get === 'function') {
      const headerId = error.response.headers.get('x-request-id');
      if (headerId) {
        return headerId.trim();
      }
    }
  }

  return undefined;
};

const stringify = (value) => {
  if (typeof value === 'string') return value;
  if (value instanceof Error && typeof value.message === 'string') return value.message;
  if (value && typeof value.toString === 'function') return value.toString();
  try {
    return JSON.stringify(value);
  } catch {
    return 'Unexpected error';
  }
};

export const formatErrorMessage = (error, fallbackMessage = 'Došlo je do neočekivane greške.') => {
  const fallback = stringify(fallbackMessage);
  if (!error) {
    return fallback;
  }

  const baseMessage = (() => {
    if (typeof error === 'string') return error;
    if (error instanceof ApiError) return error.message;
    if (error?.message) return error.message;
    return fallback;
  })();

  const requestId = extractRequestId(error);
  if (requestId && !baseMessage.includes(requestId)) {
    return `${baseMessage}\nID zahteva: ${requestId}`;
  }

  return baseMessage || fallback;
};

export const notifyError = async (
  toast,
  error,
  fallbackMessage = 'Došlo je do neočekivane greške.',
  options = {}
) => {
  if (!toast || typeof toast.error !== 'function') {
    throw new Error('notifyError requires a toast object with an error method');
  }

  const message = formatErrorMessage(error, fallbackMessage);
  const requestId = extractRequestId(error);

  const {
    duration,
    actionLabel,
    onAction,
    onCopied,
    log,
    logMessage
  } = options;

  const toastOptions = {
    ...(typeof duration === 'number' ? { duration } : {}),
  };

  const finalLogMessage = logMessage || 'Operation failed';
  if (log !== false) {
    console.error(finalLogMessage, {
      error,
      requestId,
      message,
    });
  }

  if (requestId) {
    toastOptions.actionLabel = actionLabel || 'Kopiraj ID';
    toastOptions.onAction = async () => {
      const copied = await copyToClipboard(requestId);
      if (typeof onAction === 'function') {
        await onAction(requestId, copied);
      }
      if (typeof onCopied === 'function') {
        onCopied(requestId, copied);
      }
    };
  } else if (typeof onAction === 'function') {
    toastOptions.actionLabel = actionLabel || 'Više';
    toastOptions.onAction = () => onAction();
  }

  const toastId = toast.error(message, toastOptions);
  return { toastId, requestId, message };
};
