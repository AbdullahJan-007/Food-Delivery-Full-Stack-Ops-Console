import mongoose from 'mongoose';
import { ensureSeedData } from '../seed/seedData.js';

mongoose.set('strictQuery', true);

const DEFAULT_RETRIES = 3;
const BASE_DELAY_MS = 1000;

let memoryServer = null;

export async function connectDB({ retries = DEFAULT_RETRIES } = {}) {
  const useMemoryDb =
    process.env.USE_MEMORY_DB === 'true' && process.env.NODE_ENV !== 'production';

  let uri = process.env.MONGODB_URI;

  if (useMemoryDb) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    console.log('Started local in-memory MongoDB for development (USE_MEMORY_DB=true)');
  }

  if (!uri) {
    throw new Error('MONGODB_URI is not set — check your .env file');
  }

  mongoose.connection.removeAllListeners('error');
  mongoose.connection.removeAllListeners('disconnected');

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  const options = {
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 20,
    minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    autoIndex: process.env.NODE_ENV !== 'production',
  };

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const conn = await mongoose.connect(uri, options);
      console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
      if (useMemoryDb) {
        await ensureSeedData();
      }
      return conn;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = BASE_DELAY_MS * attempt;
        console.warn(`MongoDB connect attempt ${attempt}/${retries} failed. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
