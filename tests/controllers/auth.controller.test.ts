import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from '../../src/controllers/auth.controller';
import { AuthService } from '../../src/services/auth.service';
import { mockLoginRequest, mockRegisterRequest } from '../mocks';
import { StatusCodes } from 'http-status-codes';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  generateOrthogonalTestCases,
} from '../utils/test-utils';
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
    logout: vi.fn(),
    logoutAllDevices: vi.fn(),
  };

  return {
    AuthService: {
      getInstance: vi.fn(() => authServiceMock),
    },
  };
});

// Mock the jwt utility
vi.mock('../../src/utils/jwt.util', () => ({
  jwtUtil: {
    generateToken: vi.fn(() => 'new_token'),
  },
}));

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
      expect(next.mock.calls[0][0].message).toBe('Login failed');
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
          expect(next.mock.calls[0][0].message).toBe('Validation failed');
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
      expect(next.mock.calls[0][0].message).toBe('Validation failed');
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

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Setup mocks
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer test_token',
        },
      });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.logout.mockResolvedValueOnce({
        success: true,
        data: null,
        message: 'Logged out successfully',
      });

      // Call the controller method
      await controller.logout(req, res, next);

      // Verify service was called with the token
      expect(authService.logout).toHaveBeenCalledWith('test_token');

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logged out successfully',
        }),
      );
    });

    it('should throw UnauthorizedError if no token is provided', async () => {
      // Setup mocks with no authorization header
      const req = createMockRequest();
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.logout(req, res, next);

      // Verify service was not called
      expect(authService.logout).not.toHaveBeenCalled();

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(next.mock.calls[0][0].message).toBe('No token provided');
    });

    it('should throw BadRequestError if logout fails', async () => {
      // Setup mocks
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer test_token',
        },
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.logout.mockResolvedValueOnce({
        success: false,
        error: 'Failed to logout',
      });

      // Call the controller method
      await controller.logout(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Failed to logout');
    });

    it('should throw default BadRequestError if error is undefined', async () => {
      // Setup mocks
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer test_token',
        },
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response with undefined error
      authService.logout.mockResolvedValueOnce({
        success: false,
        error: undefined,
      });

      // Call the controller method
      await controller.logout(req, res, next);

      // Verify next was called with default error message
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Logout failed');
    });

    it('should pass unexpected errors to next middleware', async () => {
      // Setup mocks
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer test_token',
        },
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      const error = new Error('Unexpected error');
      authService.logout.mockRejectedValueOnce(error);

      // Call the controller method
      await controller.logout(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('logoutAllDevices', () => {
    it('should logout from all devices successfully', async () => {
      // Setup mocks with user object
      const req = createMockRequest();
      req.user = { id: 'user123', email: 'test@example.com', role: 'user' };
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.logoutAllDevices.mockResolvedValueOnce({
        success: true,
        data: null,
        message: 'Logged out from all devices successfully',
      });

      // Call the controller method
      await controller.logoutAllDevices(req, res, next);

      // Verify service was called with the user ID
      expect(authService.logoutAllDevices).toHaveBeenCalledWith('user123');

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logged out from all devices successfully',
        }),
      );
    });

    it('should throw UnauthorizedError if user is not authenticated', async () => {
      // Setup mocks without user object
      const req = createMockRequest();
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.logoutAllDevices(req, res, next);

      // Verify service was not called
      expect(authService.logoutAllDevices).not.toHaveBeenCalled();

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(next.mock.calls[0][0].message).toBe('User not authenticated');
    });

    it('should throw BadRequestError if logout fails', async () => {
      // Setup mocks with user object
      const req = createMockRequest();
      req.user = { id: 'user123', email: 'test@example.com', role: 'user' };
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      authService.logoutAllDevices.mockResolvedValueOnce({
        success: false,
        error: 'Failed to logout from all devices',
      });

      // Call the controller method
      await controller.logoutAllDevices(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Failed to logout from all devices');
    });

    it('should throw default BadRequestError if error is undefined', async () => {
      // Setup mocks with user object
      const req = createMockRequest();
      req.user = { id: 'user123', email: 'test@example.com', role: 'user' };
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response with undefined error
      authService.logoutAllDevices.mockResolvedValueOnce({
        success: false,
        error: undefined,
      });

      // Call the controller method
      await controller.logoutAllDevices(req, res, next);

      // Verify next was called with default error message
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Logout failed');
    });

    it('should pass unexpected errors to next middleware', async () => {
      // Setup mocks with user object
      const req = createMockRequest();
      req.user = { id: 'user123', email: 'test@example.com', role: 'user' };
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      const error = new Error('Unexpected error');
      authService.logoutAllDevices.mockRejectedValueOnce(error);

      // Call the controller method
      await controller.logoutAllDevices(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user information successfully', async () => {
      // Setup mocks with user object
      const req = createMockRequest();
      req.user = { id: '123', email: 'test@example.com', role: 'user' };
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.getCurrentUser(req, res, next);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            userId: 123,
            email: 'test@example.com',
            role: 'user',
          },
          message: 'Current user data retrieved successfully',
        }),
      );
    });

    it('should throw UnauthorizedError if user is not authenticated', async () => {
      // Setup mocks without user object
      const req = createMockRequest();
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.getCurrentUser(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(next.mock.calls[0][0].message).toBe('User not authenticated');
    });

    it('should pass unexpected errors to next middleware', async () => {
      // Setup mocks with user object that will cause an error
      const req = createMockRequest();
      req.user = { id: '123', email: 'test@example.com', role: 'user' };
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock res.json to throw an error
      res.json = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Call the controller method
      await controller.getCurrentUser(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      // Setup mocks with user object
      const req = createMockRequest();
      req.user = { id: '123', email: 'test@example.com', role: 'user' };
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Import jwtUtil to access the mock
      const { jwtUtil } = await import('../../src/utils/jwt.util');

      // Call the controller method
      await controller.refreshToken(req, res, next);

      // Verify jwtUtil.generateToken was called with the correct payload
      expect(jwtUtil.generateToken).toHaveBeenCalledWith({
        userId: '123',
        email: 'test@example.com',
        role: 'user',
      });

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            token: 'new_token',
          },
          message: 'Token refreshed successfully',
        }),
      );
    });

    it('should throw UnauthorizedError if user is not authenticated', async () => {
      // Setup mocks without user object
      const req = createMockRequest();
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.refreshToken(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(next.mock.calls[0][0].message).toBe('User not authenticated');
    });

    it('should pass unexpected errors to next middleware', async () => {
      // Setup mocks with user object
      const req = createMockRequest();
      req.user = { id: '123', email: 'test@example.com', role: 'user' };
      const { res } = createMockResponse();
      const next = createMockNext();

      // Import jwtUtil to access the mock
      const { jwtUtil } = await import('../../src/utils/jwt.util');

      // Mock jwtUtil.generateToken to throw an error
      vi.mocked(jwtUtil.generateToken).mockImplementationOnce(() => {
        throw new Error('Token generation failed');
      });

      // Call the controller method
      await controller.refreshToken(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
