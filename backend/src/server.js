import 'dotenv/config';
import mongoose from 'mongoose';
import { validateEnv } from './config/env.js';
import { connectDB } from './config/db.js';
import app from './app.js';

async function start() {
  let server;
  let shuttingDown = false;

  async function shutdown(signal, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);

    try {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      console.log('Clean shutdown complete.');
      process.exit(exitCode);
    } catch (err) {
      console.error('Error during shutdown:', err.message);
      process.exit(1);
    }
  }

  try {
    const config = validateEnv(process.env);
    await connectDB();

    server = app.listen(config.port, () => {
      console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
    });

    // Hardened HTTP timeouts against Slowloris / slow-body attacks
    server.requestTimeout = 30_000;
    server.headersTimeout = 15_000;
    server.keepAliveTimeout = 65_000;

    process.on('SIGTERM', () => shutdown('SIGTERM', 0));
    process.on('SIGINT', () => shutdown('SIGINT', 0));
    process.on('unhandledRejection', (err) => {
      console.error('Unhandled rejection:', err instanceof Error ? err.message : err);
      shutdown('unhandledRejection', 1);
    });
    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err?.message || err);
      shutdown('uncaughtException', 1);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
