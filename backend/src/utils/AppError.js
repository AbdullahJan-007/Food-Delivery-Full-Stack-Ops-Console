/**
 * Operational error — anything we throw on purpose (bad input, missing
 * resource, unauthorized access). The error middleware trusts `isOperational`
 * errors enough to show their message to the client; anything else gets a
 * generic 500 so internal details never leak.
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
