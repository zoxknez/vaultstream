export default class ApiError extends Error {
  constructor(message, {
    status,
    requestId,
    body,
    url,
    method,
    originalError
  } = {}) {
    const formattedMessage = requestId
      ? `${message} (Request ID: ${requestId})`
      : message;

    super(formattedMessage);

    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
    this.body = body;
    this.url = url;
    this.method = method;
    this.originalError = originalError;
  }
}
