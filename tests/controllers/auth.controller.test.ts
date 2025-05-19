import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from '../../src/controllers/auth.controller';
import { AuthService } from '../../src/services/auth.service';
import { mockLoginRequest, mockRegisterRequest, mockJwtPayload } from '../mocks/data';
import { StatusCodes } from 'http-status-codes';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  generateOrthogonalTestCases,
} from '../utils/test-utils';
import { type AuthRequest } from '../../src/types';
import { BadRequestError, UnauthorizedError } from '../../src/utils/error.util';

// Mock the asyncHandler middleware
vi.mock('../../src/middleware/async.middleware', () => ({
  asyncHandler: vi.fn(fn => {
    return async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }),
}));

// Mock the service layer
vi.mock('../../src/services/auth.service', () => {
  const authServiceMock = {
    register: vi.fn(),
    login: vi.fn(),
    refreshToken: vi.fn(),
  };

  return {
    AuthService: {
      getInstance: vi.fn(() => authServiceMock),
    },
  };
});

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(() => {
    vi.resetAllMocks();
    authService = AuthService.getInstance();
    controller = new AuthController();
  });

  describe('register', () => {
    it('should register a user successfully', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockRegisterRequest });
      const { res, statusSpy, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.register.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.CREATED,
        data: {
          id: 1,
          email: mockRegisterRequest.email,
          firstName: mockRegisterRequest.firstName,
          lastName: mockRegisterRequest.lastName,
          role: mockRegisterRequest.role,
        },
        message: 'User registered successfully',
      });

      // Call the controller method
      await controller.register(req, res, next);

      // Verify service was called
      expect(authService.register).toHaveBeenCalledWith(mockRegisterRequest);

      // Verify response
      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
          message: 'User registered successfully',
        }),
      );
    });

    it('should throw BadRequestError if registration fails', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockRegisterRequest });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.register.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        error: 'Email already in use',
      });

      // Call the controller method
      await controller.register(req, res, next);

      // Verify next was called with the error
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Email already in use');
    });

    it('should throw default BadRequestError if error is undefined', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockRegisterRequest });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response with undefined error
      authService.register.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        error: undefined,
      });

      // Call the controller method
      await controller.register(req, res, next);

      // Verify next was called with default error message
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Registration failed');
    });

    // Using orthogonal array testing to test missing fields
    const registerFactors = {
      email: [undefined, 'test@example.com'],
      password: [undefined, 'Password123!'],
    };

    const registerTestCases = generateOrthogonalTestCases<{
      email: string | undefined;
      password: string | undefined;
    }>(registerFactors);

    registerTestCases.forEach(testCase => {
      if (!testCase.email || !testCase.password) {
        it(`should throw BadRequestError for missing fields: email=${testCase.email}, password=${testCase.password}`, async () => {
          // Setup mocks
          const req = createMockRequest({
            body: {
              email: testCase.email,
              password: testCase.password,
              firstName: 'Test',
              lastName: 'User',
            },
          });
          const { res } = createMockResponse();
          const next = createMockNext();

          // Call the controller method
          await controller.register(req, res, next);

          // Should not call service if validation fails
          expect(authService.register).not.toHaveBeenCalled();

          // Verify next was called with validation error
          expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
          expect(next.mock.calls[0][0].message).toBe('Email and password are required');
        });
      }
    });

    it('should pass unexpected errors to next middleware', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockRegisterRequest });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      const error = new Error('Unexpected error');
      authService.register.mockRejectedValueOnce(error);

      // Call the controller method
      await controller.register(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockLoginRequest });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.login.mockResolvedValueOnce({
        success: true,
        data: {
          user: {
            id: 1,
            email: mockLoginRequest.email,
            role: 'user',
          },
          token: 'jwt_token',
        },
        message: 'Login successful',
      });

      // Call the controller method
      await controller.login(req, res, next);

      // Verify service was called
      expect(authService.login).toHaveBeenCalledWith(
        mockLoginRequest.email,
        mockLoginRequest.password,
      );

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: 'jwt_token',
          }),
          message: 'Login successful',
        }),
      );
    });

    it('should throw UnauthorizedError for invalid credentials', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockLoginRequest });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.login.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.UNAUTHORIZED,
        error: 'Invalid credentials',
      });

      // Call the controller method
      await controller.login(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(next.mock.calls[0][0].message).toBe('Invalid credentials');
    });

    it('should throw default UnauthorizedError if error is undefined', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockLoginRequest });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response with undefined error
      authService.login.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.UNAUTHORIZED,
        error: undefined,
      });

      // Call the controller method
      await controller.login(req, res, next);

      // Verify next was called with default error message
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(next.mock.calls[0][0].message).toBe('Login failed');
    });

    it('should throw BadRequestError for missing fields', async () => {
      // Setup mocks
      const req = createMockRequest({
        body: {
          email: undefined,
          password: undefined,
        },
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.login(req, res, next);

      // Should not call service if validation fails
      expect(authService.login).not.toHaveBeenCalled();

      // Verify next was called with validation error
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Email and password are required');
    });

    it('should pass unexpected errors to next middleware', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockLoginRequest });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      const error = new Error('Unexpected error');
      authService.login.mockRejectedValueOnce(error);

      // Call the controller method
      await controller.login(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user info', async () => {
      // Setup mocks - create a request and manually add the user property for testing
      const req = createMockRequest({}) as unknown as AuthRequest;
      req.user = {
        id: '1',
        userId: 1,
        email: 'test@example.com',
        role: 'user',
      };
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.getCurrentUser(req, res, next);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            userId: 1,
            email: 'test@example.com',
          }),
        }),
      );
    });

    it('should throw UnauthorizedError if user is not authenticated', async () => {
      // Setup mocks without user property
      const req = createMockRequest({}) as unknown as AuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.getCurrentUser(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(next.mock.calls[0][0].message).toBe('User not authenticated');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      // Setup mocks - create a request and manually add the user property for testing
      const req = createMockRequest({}) as unknown as AuthRequest;
      req.user = {
        id: '1',
        userId: 1,
        email: 'test@example.com',
        role: 'user',
      };
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.refreshToken.mockResolvedValueOnce({
        success: true,
        data: {
          token: 'new_token',
        },
        message: 'Token refreshed successfully',
      });

      // Call the controller method
      await controller.refreshToken(req, res, next);

      // Verify service was called
      expect(authService.refreshToken).toHaveBeenCalledWith(1);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: 'new_token',
          }),
          message: 'Token refreshed successfully',
        }),
      );
    });

    it('should throw UnauthorizedError if user is not authenticated', async () => {
      // Setup mocks without user property
      const req = createMockRequest({}) as unknown as AuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.refreshToken(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(next.mock.calls[0][0].message).toBe('User not authenticated');
    });

    it('should throw BadRequestError if token refresh fails', async () => {
      // Setup mocks - create a request and manually add the user property for testing
      const req = createMockRequest({}) as unknown as AuthRequest;
      req.user = {
        id: '1',
        userId: 1,
        email: 'test@example.com',
        role: 'user',
      };
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.refreshToken.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        error: 'Invalid refresh token',
      });

      // Call the controller method
      await controller.refreshToken(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Invalid refresh token');
    });

    it('should throw default BadRequestError if error is undefined', async () => {
      // Setup mocks - create a request and manually add the user property for testing
      const req = createMockRequest({}) as unknown as AuthRequest;
      req.user = {
        id: '1',
        userId: 1,
        email: 'test@example.com',
        role: 'user',
      };
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response with undefined error
      authService.refreshToken.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        error: undefined,
      });

      // Call the controller method
      await controller.refreshToken(req, res, next);

      // Verify next was called with default error message
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Token refresh failed');
    });

    it('should pass unexpected errors to next middleware', async () => {
      // Setup mocks - create a request and manually add the user property for testing
      const req = createMockRequest({}) as unknown as AuthRequest;
      req.user = {
        id: '1',
        userId: 1,
        email: 'test@example.com',
        role: 'user',
      };
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      const error = new Error('Unexpected error');
      authService.refreshToken.mockRejectedValueOnce(error);

      // Call the controller method
      await controller.refreshToken(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
