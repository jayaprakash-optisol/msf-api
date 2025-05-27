import Redis from 'ioredis';
import { logger } from '../utils';
import { env } from './env.config';

// Create Redis client instance
let redisClient: Redis | null = null;

// Function to initialize Redis client with loaded environment
export const initRedisClient = (): Redis => {
  if (redisClient) {
    return redisClient;
  }

  const config = env.getConfig();

  const redisConfig = {
    host: config.REDIS_HOST || 'localhost',
    port: parseInt(config.REDIS_PORT || '6379', 10),
    password: config.REDIS_PASSWORD,
    db: parseInt(config.REDIS_DB || '0', 10),
    tls: config.REDIS_SSL_ENABLED
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
    retryStrategy: (times: number) => {
      return Math.min(times * 50, 2000);
    },
  };

  redisClient = new Redis(redisConfig);

  redisClient.on('error', error => {
    logger.error('Redis connection error:', error);
  });

  redisClient.on('connect', () => {
    logger.info('✅ Successfully connected to Redis');
  });

  return redisClient;
};

// Get the Redis client (initialize if not already initialized)
export const getRedisClient = (): Redis => {
  if (!redisClient) {
    return initRedisClient();
  }
  return redisClient;
};

// Close the Redis client
export const closeRedisClient = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('✅ Successfully closed Redis connection');
  }
};
