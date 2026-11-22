import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import routes from './routes/index.routes.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';
import { apiLimiter } from './middleware/rateLimiter.middleware.js';
import { requestId, sanitizeRequest } from './middleware/sanitize.middleware.js';
import { trafficShield } from './middleware/trafficControl.middleware.js';
import { parseCorsOrigins } from './config/env.js';
import { AppError } from './utils/AppError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(requestId);
app.use(trafficShield);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGIN, process.env.NODE_ENV);
app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server / curl / same-origin requests with no Origin header
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new AppError(`CORS policy blocked origin: ${origin}`, 403));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(sanitizeRequest);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Branded docs page lives at "/", served as static files.
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  const healthy = dbReady || process.env.NODE_ENV === 'test';

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? 'API is healthy' : 'API is degraded — database disconnected',
    uptime: Math.round(process.uptime()),
    database: dbReady ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
