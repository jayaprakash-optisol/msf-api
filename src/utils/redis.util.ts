import { Redis, type RedisOptions } from 'ioredis';

import { logger } from './logger';
import { getEnv } from './config.util';

// Keep track of all Redis clients
const redisClients: Redis[] = [];

/**
 * Create a Redis client with default configuration
 * @param options Additional Redis options
 * @returns Redis client instance
 */
export const createRedisClient = (options: Partial<RedisOptions> = {}): Redis => {
  const client = new Redis({
    host: getEnv('REDIS_HOST'),
    port: parseInt(getEnv('REDIS_PORT'), 10),
    password: getEnv('REDIS_PASSWORD') ?? undefined,
    enableOfflineQueue: false,
    ...options,
  });

  // Handle Redis connection errors
  client.on('error', (err: Error) => {
    logger.error('Redis client error:', err);
  });

  // Add to tracked clients
  redisClients.push(client);
  return client;
};

/**
 * Get a Redis client for health checks
 * @returns Redis client instance
 */
export const getHealthCheckRedis = (): Redis => {
  return createRedisClient({
    connectTimeout: 5000, // 5 seconds timeout for health checks
    maxRetriesPerRequest: 1,
  });
};

/**
 * Close all Redis connections gracefully
 */
export const closeRedisConnections = async (): Promise<void> => {
  logger.info(`Closing ${redisClients.length} Redis connections...`);

  const closePromises = redisClients.map(async (client, index) => {
    try {
      await client.quit();
      logger.debug(`Redis connection ${index + 1} closed successfully`);
      return true;
    } catch (error) {
      logger.error(`Error closing Redis connection ${index + 1}:`, error);
      try {
        // Force close if quit fails
        client.disconnect();
        return true;
      } catch (err) {
        logger.error(`Error forcing disconnect on Redis connection ${index + 1}:`, err);
        return false;
      }
    }
  });

  await Promise.all(closePromises);
  logger.info('All Redis connections closed');
};

/**
 * Clears the entire Redis database.
 * Use with caution, especially in production.
 */
export const clearRedisDatabase = async (): Promise<void> => {
  const client = createRedisClient();
  try {
    await client.flushdb();
    logger.info('Redis database cleared successfully.');
  } catch (error) {
    logger.error('Error clearing Redis database:', error);
    throw error; // Re-throw the error to be handled by the caller
  } finally {
    await client.quit();
  }
};
