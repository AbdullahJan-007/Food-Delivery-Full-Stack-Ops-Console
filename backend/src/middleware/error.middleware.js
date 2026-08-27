import { AppError } from '../utils/AppError.js';

export function notFound(req, res, next) {
  next(new AppError(`Route not found — ${req.method} ${req.originalUrl}`, 404));
}

// Must be registered last, and must keep all four parameters — that arity
// is how Express tells an error handler apart from regular middleware.
export function errorHandler(err, req, res, next) {
  let error = err;

  if (err.name === 'CastError') {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    error = new AppError(messages.join('. '), 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new AppError(`${field} '${err.keyValue[field]}' is already in use`, 409);
  }

  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401);
  }

  const statusCode = error.statusCode || 500;
  // Non-operational errors (bugs, unexpected exceptions) never leak their
  // raw message to the client — only what we deliberately threw as AppError.
  const message = error.isOperational ? error.message : 'Something went wrong on our end';

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
