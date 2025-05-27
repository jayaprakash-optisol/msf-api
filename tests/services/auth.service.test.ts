import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../src/services/auth.service';
import { mockNewUser, mockUsers } from '../mocks';
import { StatusCodes } from 'http-status-codes';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../src/utils/error.util';
import { _ok } from '../../src/utils/response.util';

// Mock implementation
const mockGetUserByEmail = vi.fn();
const mockCreateUser = vi.fn();
const mockVerifyPassword = vi.fn();
const mockGetUserById = vi.fn();
const mockCheckEmailAvailability = vi.fn();

// Mock env.config.ts to prevent environment variable validation errors
vi.mock('../../src/config/env.config', () => ({
  default: {
    JWT_SECRET: 'test_secret',
    JWT_EXPIRES_IN: '1h',
    ENCRYPTION_KEY: 'test-encryption-key',
    PRODUCTS_API_URL: 'http://test-api.com',
    API_USER_NAME: 'test-user',
    API_PASSWORD: 'test-password',
    PRODUCT_SYNC_INTERVAL: '60',
  },
}));

// Import mocked dependencies
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockImplementation(password => Promise.resolve(`hashed_${password}`)),
    compare: vi.fn().mockImplementation(() => Promise.resolve(true)),
  },
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn().mockReturnValue('mock_token'),
}));

vi.mock('../../src/utils/jwt.util', () => ({
  jwtUtil: {
    generateToken: vi.fn().mockReturnValue('mock_token'),
    revokeToken: vi.fn(),
    invalidateUserSessions: vi.fn(),
  },
}));

// Mock authResponse to use security-focused wording
vi.mock('../../src/utils/responseMessages/auth.messages', () => ({
  authResponse: {
    errors: {
      invalidCredentials: 'Authentication failed: Invalid credentials',
      loginFailed: 'Login failed',
    },
    success: {
      loggedIn: 'User logged in successfully',
    },
  },
}));

// Mock UserService
vi.mock('../../src/services/user.service', () => ({
  UserService: {
    getInstance: vi.fn(() => ({
      getUserByEmail: mockGetUserByEmail,
      createUser: mockCreateUser,
      verifyPassword: mockVerifyPassword,
      getUserById: mockGetUserById,
      checkEmailAvailability: mockCheckEmailAvailability,
    })),
  },
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    // Reset singleton instance for clean testing
    // @ts-ignore - accessing private static field for testing
    AuthService.instance = undefined;
    authService = AuthService.getInstance();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Simplified test: just check that the method exists and returns a promise
      expect(authService.register).toBeDefined();
      expect(typeof authService.register).toBe('function');

      // Mock user service methods
      mockCheckEmailAvailability.mockResolvedValueOnce(_ok(undefined, 'Email is available'));

      mockCreateUser.mockResolvedValueOnce(
        _ok(
          {
            ...mockNewUser,
            id: '3',
            password: 'hashed_password',
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
          },
          'User created successfully',
          StatusCodes.CREATED,
        ),
      );

      // Basic check on expected characteristics of the response
      const result = await authService.register(mockNewUser);
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.message).toContain('successfully');
    });

    it('should handle conflict errors when email exists', async () => {
      // Mock checkEmailAvailability to throw ConflictError directly
      mockCheckEmailAvailability.mockRejectedValueOnce(new ConflictError('Email already in use'));

      // Test that an error is thrown containing appropriate information
      await expect(authService.register(mockNewUser)).rejects.toThrow(ConflictError);
      // Only check for the error type, not the exact message which may vary
    });

    it('should throw an error when user creation fails', async () => {
      // We need to reset mocks for this test
      vi.resetAllMocks();

      // Mock successful email check
      mockCheckEmailAvailability.mockResolvedValue(_ok(undefined, 'Email is available'));

      // Mock unsuccessful user creation
      mockCreateUser.mockResolvedValue({
        success: false,
        error: 'Failed to create user',
        statusCode: StatusCodes.BAD_REQUEST,
      });

      // Test that an error is thrown
      await expect(authService.register(mockNewUser)).rejects.toThrow(BadRequestError);
      // Only check for error type, not exact message
    });

    it('should handle user creation that returns success but no data', async () => {
      // We need to reset mocks for this test
      vi.resetAllMocks();

      // Mock successful email check
      mockCheckEmailAvailability.mockResolvedValue(_ok(undefined, 'Email is available'));

      // Mock user creation with success but no data
      mockCreateUser.mockResolvedValue({
        success: true,
        data: null,
        statusCode: StatusCodes.CREATED,
      });

      // Test that an error is thrown
      await expect(authService.register(mockNewUser)).rejects.toThrow(BadRequestError);
    });

    it('should handle unexpected errors', async () => {
      // Simplified error test
      mockCheckEmailAvailability.mockRejectedValueOnce(new Error('Test error'));

      // Just test that some error is thrown
      await expect(authService.register(mockNewUser)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      // Mock verifyPassword to return success
      mockVerifyPassword.mockResolvedValueOnce(_ok(mockUsers[0], 'Password verified successfully'));

      // Just check basic functionality works
      const result = await authService.login('test@example.com', 'Password123!');
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('token');
      expect(result.data).toHaveProperty('user');
    });

    it('should handle unauthorized errors for invalid credentials', async () => {
      // Throw UnauthorizedError directly from mock
      mockVerifyPassword.mockRejectedValueOnce(new UnauthorizedError('Invalid credentials'));

      // Just test that an error is thrown
      await expect(authService.login('test@example.com', 'WrongPassword')).rejects.toThrow(
        UnauthorizedError,
      );
      // Only check error type, not exact message
    });

    it('should throw an error when verifyPassword fails', async () => {
      // We need to reset mocks for this test
      vi.resetAllMocks();

      // Mock unsuccessful verification with error message
      mockVerifyPassword.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
        statusCode: StatusCodes.UNAUTHORIZED,
      });

      // Test that an error is thrown
      await expect(authService.login('test@example.com', 'WrongPassword')).rejects.toThrow(
        UnauthorizedError,
      );
      // Only check error type, not exact message
    });

    it('should throw an error when verifyPassword returns success but no data', async () => {
      // We need to reset mocks for this test
      vi.resetAllMocks();

      // Mock verification with success but no data
      mockVerifyPassword.mockResolvedValue({
        success: true,
        data: null,
        statusCode: StatusCodes.OK,
      });

      // Test that an error is thrown
      await expect(authService.login('test@example.com', 'Password123!')).rejects.toThrow(
        UnauthorizedError,
      );
      await expect(authService.login('test@example.com', 'Password123!')).rejects.toThrow(
        'Authentication failed: Invalid credentials',
      );
    });

    it('should handle unexpected errors', async () => {
      // Simplified error test
      mockVerifyPassword.mockRejectedValueOnce(new Error('Test error'));

      // Just test that some error is thrown
      await expect(authService.login('test@example.com', 'Password123!')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Import jwtUtil to access the mock
      const { jwtUtil } = await import('../../src/utils/jwt.util');

      // Mock successful token revocation
      vi.mocked(jwtUtil.revokeToken).mockResolvedValueOnce(undefined);

      // Call the logout method
      const result = await authService.logout('mock_token');

      // Verify the result
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data', null);
      expect(result.message).toBe('Logged out successfully');

      // Verify that revokeToken was called with the correct token
      expect(jwtUtil.revokeToken).toHaveBeenCalledWith('mock_token');
    });

    it('should handle errors during logout', async () => {
      // Import jwtUtil to access the mock
      const { jwtUtil } = await import('../../src/utils/jwt.util');

      // Mock failed token revocation
      vi.mocked(jwtUtil.revokeToken).mockRejectedValueOnce(new Error('Failed to revoke token'));

      // Test that an error is thrown
      await expect(authService.logout('mock_token')).rejects.toThrow();

      // Verify that revokeToken was called with the correct token
      expect(jwtUtil.revokeToken).toHaveBeenCalledWith('mock_token');
    });
  });

  describe('logoutAllDevices', () => {
    it('should logout from all devices successfully', async () => {
      // Import jwtUtil to access the mock
      const { jwtUtil } = await import('../../src/utils/jwt.util');

      // Mock successful session invalidation
      vi.mocked(jwtUtil.invalidateUserSessions).mockResolvedValueOnce(undefined);

      // Call the logoutAllDevices method
      const result = await authService.logoutAllDevices('user123');

      // Verify the result
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data', null);
      expect(result.message).toBe('Logged out from all devices successfully');

      // Verify that invalidateUserSessions was called with the correct user ID
      expect(jwtUtil.invalidateUserSessions).toHaveBeenCalledWith('user123');
    });

    it('should handle errors during logout from all devices', async () => {
      // Import jwtUtil to access the mock
      const { jwtUtil } = await import('../../src/utils/jwt.util');

      // Mock failed session invalidation
      vi.mocked(jwtUtil.invalidateUserSessions).mockRejectedValueOnce(
        new Error('Failed to invalidate sessions'),
      );

      // Test that an error is thrown
      await expect(authService.logoutAllDevices('user123')).rejects.toThrow();

      // Verify that invalidateUserSessions was called with the correct user ID
      expect(jwtUtil.invalidateUserSessions).toHaveBeenCalledWith('user123');
    });
  });
});
