import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Request, type Response, type NextFunction } from 'express';
import {
  corsOptions,
  contentSecurityPolicy,
  noSniff,
  xssFilter,
  frameGuard,
  hsts,
  cacheControl,
} from '../../src/middleware/security.middleware';
import { createMockRequest, createMockNext } from '../utils/test-utils';

// Create a mock for env.config.ts using vi.hoisted to ensure it's available before vi.mock
const mockEnv = vi.hoisted(() => ({
  CORS_ORIGIN: '*',
}));

// Mock env config
vi.mock('../../src/config/env.config', () => ({
  default: mockEnv,
}));

describe('Security Middleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    vi.resetAllMocks();
    req = createMockRequest() as Request;

    // Create mock response with setHeader as a spy
    res = {
      setHeader: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as Response;

    next = createMockNext();
  });

  describe('corsOptions', () => {
    it('should allow all origins when CORS_ORIGIN is "*"', () => {
      const callback = vi.fn();
      corsOptions.origin('https://example.com', callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow specific origins when CORS_ORIGIN is a comma-separated list', () => {
      // Temporarily change the mock to return a comma-separated list
      const originalCorsOrigin = mockEnv.CORS_ORIGIN;
      mockEnv.CORS_ORIGIN = 'https://example.com, https://test.com';

      const callback = vi.fn();
      corsOptions.origin('https://example.com', callback);
      expect(callback).toHaveBeenCalledWith(null, true);

      // Reset the callback mock
      callback.mockReset();

      // Test with another allowed origin
      corsOptions.origin('https://test.com', callback);
      expect(callback).toHaveBeenCalledWith(null, true);

      // Restore the original value
      mockEnv.CORS_ORIGIN = originalCorsOrigin;
    });

    it('should reject disallowed origins when CORS_ORIGIN is a comma-separated list', () => {
      // Temporarily change the mock to return a comma-separated list
      const originalCorsOrigin = mockEnv.CORS_ORIGIN;
      mockEnv.CORS_ORIGIN = 'https://example.com, https://test.com';

      const callback = vi.fn();
      corsOptions.origin('https://malicious.com', callback);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Origin https://malicious.com not allowed by CORS policy',
        }),
        false
      );

      // Restore the original value
      mockEnv.CORS_ORIGIN = originalCorsOrigin;
    });

    it('should allow requests with no origin when CORS_ORIGIN is a comma-separated list', () => {
      // Temporarily change the mock to return a comma-separated list
      const originalCorsOrigin = mockEnv.CORS_ORIGIN;
      mockEnv.CORS_ORIGIN = 'https://example.com, https://test.com';

      const callback = vi.fn();
      corsOptions.origin(undefined, callback);
      expect(callback).toHaveBeenCalledWith(null, true);

      // Restore the original value
      mockEnv.CORS_ORIGIN = originalCorsOrigin;
    });

    it('should have correct methods, headers and options', () => {
      expect(corsOptions.methods).toContain('GET');
      expect(corsOptions.methods).toContain('POST');
      expect(corsOptions.methods).toContain('PUT');
      expect(corsOptions.methods).toContain('DELETE');
      expect(corsOptions.methods).toContain('OPTIONS');
      expect(corsOptions.methods).toContain('PATCH');

      expect(corsOptions.allowedHeaders).toContain('Content-Type');
      expect(corsOptions.allowedHeaders).toContain('Authorization');
      expect(corsOptions.allowedHeaders).toContain('Accept');

      expect(corsOptions.credentials).toBe(true);
      expect(corsOptions.maxAge).toBe(86400);
    });
  });

  describe('contentSecurityPolicy', () => {
    it('should set the Content-Security-Policy header and call next', () => {
      contentSecurityPolicy(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.any(String));
      expect(next).toHaveBeenCalled();
    });

    it('should set a strict CSP policy', () => {
      contentSecurityPolicy(req, res, next);

      const cspValue = (res.setHeader as any).mock.calls[0][1] as string;
      expect(cspValue).toContain("default-src 'self'");
      expect(cspValue).toContain("script-src 'self'");
      expect(cspValue).toContain("object-src 'none'");
    });
  });

  describe('noSniff', () => {
    it('should set the X-Content-Type-Options header and call next', () => {
      noSniff(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('xssFilter', () => {
    it('should set the X-XSS-Protection header and call next', () => {
      xssFilter(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('frameGuard', () => {
    it('should set the X-Frame-Options header and call next', () => {
      frameGuard(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('hsts', () => {
    it('should set the Strict-Transport-Security header and call next', () => {
      hsts(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
      expect(next).toHaveBeenCalled();
    });
  });

  describe('cacheControl', () => {
    it('should set caching headers for public resources and call next', () => {
      // Setup request for public resource
      const publicReq = createMockRequest({
        method: 'GET',
        path: '/api/v1/public/assets/logo.png',
      }) as Request;

      cacheControl(publicReq, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
      expect(next).toHaveBeenCalled();
    });

    it('should set no-cache headers for API endpoints and call next', () => {
      // Setup request for API endpoint
      const apiReq = createMockRequest({
        method: 'GET',
        path: '/api/v1/users',
      }) as Request;

      cacheControl(apiReq, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Expires', '0');
      expect(next).toHaveBeenCalled();
    });

    it('should not set cache headers for non-GET requests', () => {
      // Setup POST request
      const postReq = createMockRequest({
        method: 'POST',
        path: '/api/v1/users',
      }) as Request;

      cacheControl(postReq, res, next);

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });
});
