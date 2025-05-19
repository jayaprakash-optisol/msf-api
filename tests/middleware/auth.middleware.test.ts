import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticate, authorize } from '../../src/middleware/auth.middleware';
import { createMockRequest, createMockResponse, createMockNext } from '../utils/test-utils';
import { mockToken, invalidToken } from '../mocks/data';
import type { AuthRequest } from '../../src/types';
import { jwtUtil } from '../../src/utils/jwt.util';
import { StatusCodes } from 'http-status-codes';

// Mock dependencies
vi.mock('jsonwebtoken');
vi.mock('../../src/utils/jwt.util', () => ({
  jwtUtil: {
    verifyToken: vi.fn(),
  },
}));

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('authenticate middleware', () => {
    it('should call next() if token is valid', () => {
      // Mock request with token
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      }) as AuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock JWT verification to return success
      vi.mocked(jwtUtil.verifyToken).mockReturnValue({
        success: true,
        data: {
          userId: 1,
          email: 'test@example.com',
          role: 'user',
        },
        statusCode: StatusCodes.OK,
        message: 'Success',
        error: null,
      });

      // Call middleware
      authenticate(req, res, next);

      // Should set req.user and call next
      expect(req.user).toEqual({
        id: '1',
        email: 'test@example.com',
        role: 'user',
      });
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should return 401 if no token is provided', () => {
      // Mock request without token
      const req = createMockRequest() as AuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call middleware
      authenticate(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          statusCode: 401,
        }),
      );
    });

    it('should return 401 if Authorization header has incorrect format', () => {
      // Mock request with invalid token format
      const req = createMockRequest({
        headers: {
          authorization: 'InvalidFormat',
        },
      }) as AuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call middleware
      authenticate(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          statusCode: 401,
        }),
      );
    });

    it('should return 401 if token is invalid', () => {
      // Mock request with invalid token
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${invalidToken}`,
        },
      }) as AuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock JWT verification to fail
      vi.mocked(jwtUtil.verifyToken).mockReturnValue({
        success: false,
        data: null,
        statusCode: StatusCodes.UNAUTHORIZED,
        message: 'Invalid token',
        error: 'Invalid token',
      });

      // Call middleware
      authenticate(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          statusCode: 401,
        }),
      );
    });

    it('should pass role information from token to request', () => {
      // Mock request with token that has role information
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      }) as AuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock JWT verification to return admin role
      vi.mocked(jwtUtil.verifyToken).mockReturnValue({
        success: true,
        data: {
          userId: 1,
          email: 'test@example.com',
          role: 'admin',
        },
        statusCode: StatusCodes.OK,
        message: 'Success',
        error: null,
      });

      // Call middleware
      authenticate(req, res, next);

      // Should set req.user with role information
      expect(req.user).toEqual({
        id: '1',
        email: 'test@example.com',
        role: 'admin',
      });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should handle verification errors gracefully', () => {
      // Mock request with token
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      }) as AuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock JWT verification to throw unexpected error
      vi.mocked(jwtUtil.verifyToken).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Call middleware
      authenticate(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          statusCode: 401,
        }),
      );
    });

    it('should handle token verification with missing data', () => {
      // Mock request with token
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      }) as AuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock JWT verification to return success but with missing data
      vi.mocked(jwtUtil.verifyToken).mockReturnValue({
        success: true,
        data: undefined,
        statusCode: StatusCodes.OK,
        message: 'Success',
        error: null,
      });

      // Call middleware
      authenticate(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
          statusCode: 401,
        }),
      );
    });
  });

  describe('authorize middleware', () => {
    it('should call next() if user has required role', () => {
      // Mock request with user having 'admin' role
      const req = createMockRequest() as AuthRequest;
      req.user = {
        id: '1',
        email: 'admin@example.com',
        role: 'admin',
      };
      const { res } = createMockResponse();
      const next = createMockNext();

      // Create middleware with 'admin' role requirement
      const middleware = authorize('admin');

      // Call middleware
      middleware(req, res, next);

      // Should call next without arguments
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next() if user has one of multiple required roles', () => {
      // Mock request with user having 'user' role
      const req = createMockRequest() as AuthRequest;
      req.user = {
        id: '1',
        email: 'user@example.com',
        role: 'user',
      };
      const { res } = createMockResponse();
      const next = createMockNext();

      // Create middleware with multiple role requirements
      const middleware = authorize('admin', 'user', 'guest');

      // Call middleware
      middleware(req, res, next);

      // Should call next without arguments
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should return 401 if user is not authenticated', () => {
      // Mock request without user (not authenticated)
      const req = createMockRequest() as AuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Create middleware with 'admin' role requirement
      const middleware = authorize('admin');

      // Call middleware
      middleware(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        }),
      );
    });

    it('should return 403 if user does not have required role', () => {
      // Mock request with user having 'user' role
      const req = createMockRequest() as AuthRequest;
      req.user = {
        id: '1',
        email: 'user@example.com',
        role: 'user',
      };
      const { res } = createMockResponse();
      const next = createMockNext();

      // Create middleware with 'admin' role requirement
      const middleware = authorize('admin');

      // Call middleware
      middleware(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Insufficient permissions',
          statusCode: 403,
        }),
      );
    });

    it('should handle unexpected errors', () => {
      // Create a request that will cause an unexpected error
      const req = createMockRequest() as AuthRequest;
      req.user = {
        id: '1',
        email: 'test@example.com',
        role: 'user',
      };
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock an error by making the role check throw an exception
      Object.defineProperty(req.user, 'role', {
        get: () => {
          throw new Error('Unexpected error');
        },
      });

      // Create middleware
      const middleware = authorize('user');

      // Call middleware
      middleware(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should support checking against user with empty role', () => {
      // Mock request with user having empty role
      const req = createMockRequest() as AuthRequest;
      req.user = {
        id: '1',
        email: 'user@example.com',
        role: '',
      };
      const { res } = createMockResponse();
      const next = createMockNext();

      // Create middleware with specific role requirement
      const middleware = authorize('user');

      // Call middleware
      middleware(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Insufficient permissions',
          statusCode: 403,
        }),
      );
    });
  });
});
