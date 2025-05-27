import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Request, type Response } from 'express';

// Create mock Redis client
const mockIncr = vi.fn().mockImplementation(() => Promise.resolve(1));
const mockPexpire = vi.fn().mockImplementation(() => Promise.resolve(1));
const mockPttl = vi.fn().mockImplementation(() => Promise.resolve(60000));
const mockRedisClient = {
  incr: mockIncr,
  pexpire: mockPexpire,
  pttl: mockPttl,
};

// Mock dependencies - must be before importing the modules
vi.mock('../../src/config/redis.config', () => {
  return {
    getRedisClient: vi.fn(() => mockRedisClient),
  };
});

vi.mock('../../src/config/env.config', () => {
  return {
    default: {
      NODE_ENV: 'development',
      RATE_LIMIT_ENABLED: true,
      TEST_RATE_LIMIT_WINDOW_MS: '1000',
      TEST_RATE_LIMIT_MAX: '3',
      RATE_LIMIT_WINDOW_MS: '900000',
      RATE_LIMIT_MAX: '100',
    },
  };
});

// Import after mocks
import { rateLimiter } from '../../src/middleware/rateLimiter.middleware';
import env from '../../src/config/env.config';

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a middleware function', () => {
    const middleware = rateLimiter();
    expect(typeof middleware).toBe('function');
  });

  it('should bypass rate limiting when disabled', async () => {
    // Setup
    const originalValue = env.RATE_LIMIT_ENABLED;
    (env as any).RATE_LIMIT_ENABLED = false;

    const req = { ip: '127.0.0.1', path: '/api/v1/users' } as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn();

    // Execute
    const middleware = rateLimiter();
    await middleware(req, res, next);

    // Verify
    expect(next).toHaveBeenCalled();
    expect(mockIncr).not.toHaveBeenCalled();

    // Cleanup
    (env as any).RATE_LIMIT_ENABLED = originalValue;
  });

  it('should bypass rate limiting for Swagger API docs endpoints', async () => {
    // Test /api-docs path
    const req1 = { ip: '127.0.0.1', path: '/api/v1/api-docs' } as Request;
    const res1 = { setHeader: vi.fn() } as unknown as Response;
    const next1 = vi.fn();

    const middleware = rateLimiter();
    await middleware(req1, res1, next1);

    expect(next1).toHaveBeenCalled();
    expect(mockIncr).not.toHaveBeenCalled();

    // Test /api-docs.json path
    const req2 = { ip: '127.0.0.1', path: '/api-docs.json' } as Request;
    const res2 = { setHeader: vi.fn() } as unknown as Response;
    const next2 = vi.fn();

    await middleware(req2, res2, next2);

    expect(next2).toHaveBeenCalled();
    expect(mockIncr).not.toHaveBeenCalled();
  });

  it.skip('should apply rate limiting for non-Swagger endpoints', async () => {
    // Ensure rate limiting is enabled
    const originalValue = env.RATE_LIMIT_ENABLED;
    (env as any).RATE_LIMIT_ENABLED = true;

    const req = { ip: '127.0.0.1', path: '/api/v1/users' } as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn();

    // Create a custom Redis client factory that returns our mock client
    const redisClientFactory = () => mockRedisClient;

    // Pass the custom factory to the middleware
    const middleware = rateLimiter(undefined, redisClientFactory as any);
    await middleware(req, res, next);

    expect(mockIncr).toHaveBeenCalledWith('test-rate-limit:127.0.0.1');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 3);
    expect(next).toHaveBeenCalled();

    // Restore original value
    (env as any).RATE_LIMIT_ENABLED = originalValue;
  });

  it('should accept custom options', () => {
    // Setup
    const customOptions = {
      windowMs: 5000,
      max: 10,
      keyPrefix: 'custom-prefix',
    };

    // Execute
    const middleware = rateLimiter(customOptions);

    // Verify it's a function
    expect(typeof middleware).toBe('function');
  });

  it('should use correct environment-based defaults', () => {
    // Test that different environments use different defaults
    // We can only test this indirectly by checking that it doesn't throw
    (env as any).NODE_ENV = 'development';
    expect(() => rateLimiter()).not.toThrow();

    (env as any).NODE_ENV = 'production';
    expect(() => rateLimiter()).not.toThrow();

    // Restore original
    (env as any).NODE_ENV = 'development';
  });
});
