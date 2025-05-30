import { type NextFunction, type Request, type Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getRedisClient } from '../config/redis.config';
import { env } from '../config/env.config';
import { getEnv, isDevelopment } from '../utils';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max number of requests per window
  keyPrefix?: string; // Prefix for Redis keys
}

// Set defaults based on environment
const getDefaultOptions = (): RateLimitOptions => {
  const config = env.getConfig();
  if (isDevelopment()) {
    return {
      windowMs: parseInt(config.TEST_RATE_LIMIT_WINDOW_MS, 10),
      max: parseInt(config.TEST_RATE_LIMIT_MAX, 10),
      keyPrefix: 'test-rate-limit',
    };
  }

  return {
    windowMs: parseInt(config.RATE_LIMIT_WINDOW_MS, 10),
    max: parseInt(config.RATE_LIMIT_MAX, 10),
    keyPrefix: 'rate-limit',
  };
};

export const rateLimiter = (
  options: RateLimitOptions = getDefaultOptions(),
  redisClientFactory = getRedisClient,
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if rate limiting is enabled (it's a boolean value from env.config.ts)
    if (!getEnv('RATE_LIMIT_ENABLED')) {
      return next();
    }

    // Skip rate limiting for Swagger documentation endpoints
    if (req.path.includes('/api-docs') || req.path.endsWith('/api-docs.json')) {
      return next();
    }

    const key = `${options.keyPrefix}:${req.ip}`;
    const redis = redisClientFactory();

    redis
      .incr(key)
      .then(async current => {
        if (current === 1) {
          await redis.pexpire(key, options.windowMs);
        }

        const ttl = await redis.pttl(key);
        res.setHeader('X-RateLimit-Limit', options.max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - current));
        res.setHeader('X-RateLimit-Reset', Math.ceil(ttl / 1000));
        if (current > options.max) {
          return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
            error: 'Too many requests, please try again later.',
            retryAfter: Math.ceil(ttl / 1000),
          });
        }
        next();
      })
      .catch(error => {
        console.error('Rate limiter error:', error);
        // If Redis is down, allow the request to proceed
        next();
      });
  };
};
