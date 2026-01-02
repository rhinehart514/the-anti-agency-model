import Redis from 'ioredis';
import { loggers } from '@/lib/logger';

/**
 * Redis client configuration for Bull queues
 * Uses REDIS_URL environment variable or defaults to localhost
 */

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse Redis URL for connection options
function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}

const connectionOptions = parseRedisUrl(redisUrl);

// Create Redis connection (lazy initialization)
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(connectionOptions);

    redisClient.on('connect', () => {
      loggers.db.info('Redis client connected');
    });

    redisClient.on('error', (err) => {
      loggers.db.error({ error: err }, 'Redis client error');
    });

    redisClient.on('close', () => {
      loggers.db.debug('Redis client disconnected');
    });
  }

  return redisClient;
}

// Export connection options for Bull queues (they create their own connections)
export const redisConnection = connectionOptions;

// Check if Redis is available
export async function isRedisAvailable(): Promise<boolean> {
  if (!process.env.REDIS_URL) {
    return false;
  }

  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

// Cleanup function for graceful shutdown
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
