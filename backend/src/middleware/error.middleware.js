import { AppError } from '../utils/AppError.js';

export function notFound(req, res, next) {
  next(new AppError(`Route not found — ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(err, req, res, _next) {
  let error = err;

  // Malformed JSON body from express.json()
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    error = new AppError('Malformed JSON in request body', 400);
  }

  // Request body exceeded configured size limit
  if (err.type === 'entity.too.large' || err.status === 413) {
    error = new AppError('Request payload is too large', 413);
  }

  if (err.name === 'CastError') {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    error = new AppError(messages.join('. '), 400);
  }

  if (err.code === 11000 && err.keyValue) {
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
  const message = error.isOperational ? error.message : 'Something went wrong on our end';

  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    console.error(`[${req.requestId ?? '-'}]`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(req.requestId && { requestId: req.requestId }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
