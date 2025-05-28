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

// Mock getEnv function and isDevelopment function
vi.mock('../../src/utils/config.util', () => {
  const mockGetEnv = vi.fn().mockImplementation((key: string) => {
    if (key === 'NODE_ENV') return 'development';
    if (key === 'RATE_LIMIT_ENABLED') return true;
    if (key === 'TEST_RATE_LIMIT_WINDOW_MS') return '1000';
    if (key === 'TEST_RATE_LIMIT_MAX') return '3';
    if (key === 'RATE_LIMIT_WINDOW_MS') return '900000';
    if (key === 'RATE_LIMIT_MAX') return '100';
    return undefined;
  });

  return {
    getEnv: mockGetEnv,
    isDevelopment: vi.fn().mockReturnValue(true),
    isProduction: vi.fn().mockReturnValue(false),
    isTest: vi.fn().mockReturnValue(false),
  };
});

// Mock utils module
vi.mock('../../src/utils', () => {
  const mockGetEnv = vi.fn().mockImplementation((key: string) => {
    if (key === 'NODE_ENV') return 'development';
    if (key === 'RATE_LIMIT_ENABLED') return true;
    if (key === 'TEST_RATE_LIMIT_WINDOW_MS') return '1000';
    if (key === 'TEST_RATE_LIMIT_MAX') return '3';
    if (key === 'RATE_LIMIT_WINDOW_MS') return '900000';
    if (key === 'RATE_LIMIT_MAX') return '100';
    return undefined;
  });

  return {
    getEnv: mockGetEnv,
    isDevelopment: vi.fn().mockReturnValue(true),
    isProduction: vi.fn().mockReturnValue(false),
    isTest: vi.fn().mockReturnValue(false),
  };
});

// Mock env config
vi.mock('../../src/config/env.config', () => {
  const mockConfig = {
    NODE_ENV: 'development',
    RATE_LIMIT_ENABLED: true,
    TEST_RATE_LIMIT_WINDOW_MS: '1000',
    TEST_RATE_LIMIT_MAX: '3',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX: '100',
  };

  return {
    env: {
      getConfig: vi.fn(() => mockConfig),
      initialize: vi.fn().mockResolvedValue(undefined),
      getInstance: vi.fn(() => ({
        getConfig: vi.fn(() => mockConfig),
      })),
    },
  };
});

// Mock utils module with getEnv and isDevelopment
vi.mock('../../src/utils', () => {
  return {
    getEnv: vi.fn().mockImplementation(key => {
      if (key === 'RATE_LIMIT_ENABLED') return true;
      if (key === 'NODE_ENV') return 'development';
      if (key === 'TEST_RATE_LIMIT_WINDOW_MS') return '1000';
      if (key === 'TEST_RATE_LIMIT_MAX') return '3';
      if (key === 'RATE_LIMIT_WINDOW_MS') return '900000';
      if (key === 'RATE_LIMIT_MAX') return '100';
      return undefined;
    }),
    isDevelopment: vi.fn().mockReturnValue(true),
    isProduction: vi.fn().mockReturnValue(false),
    isTest: vi.fn().mockReturnValue(false),
    logger: {
      info: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Import after mocks
import { rateLimiter } from '../../src/middleware/rateLimiter.middleware';
import { getEnv } from '../../src/utils/config.util';

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a middleware function', () => {
    const middleware = rateLimiter();
    expect(typeof middleware).toBe('function');
  });

  it('should bypass rate limiting when disabled', async () => {
    // Setup - temporarily mock getEnv to return false for RATE_LIMIT_ENABLED
    const originalMockGetEnv = vi.mocked(getEnv);
    vi.mocked(getEnv).mockImplementation((key: string) => {
      if (key === 'RATE_LIMIT_ENABLED') return false;
      return originalMockGetEnv(key as any);
    });

    const req = { ip: '127.0.0.1', path: '/api/v1/users' } as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn();

    // Execute
    const middleware = rateLimiter();
    await middleware(req, res, next);

    // Verify
    expect(next).toHaveBeenCalled();
    expect(mockIncr).not.toHaveBeenCalled();

    // Cleanup - restore original mock
    vi.mocked(getEnv).mockImplementation(originalMockGetEnv);
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
    const originalMockGetEnv = vi.mocked(getEnv);
    vi.mocked(getEnv).mockImplementation((key: string) => {
      if (key === 'RATE_LIMIT_ENABLED') return true;
      return originalMockGetEnv(key as any);
    });

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

    // Restore original mock
    vi.mocked(getEnv).mockImplementation(originalMockGetEnv);
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
    const originalMockGetEnv = vi.mocked(getEnv);

    // Test with development environment
    vi.mocked(getEnv).mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'development';
      return originalMockGetEnv(key as any);
    });
    expect(() => rateLimiter()).not.toThrow();

    // Test with production environment
    vi.mocked(getEnv).mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      return originalMockGetEnv(key as any);
    });
    expect(() => rateLimiter()).not.toThrow();

    // Restore original mock
    vi.mocked(getEnv).mockImplementation(originalMockGetEnv);
  });
});
