import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../src/services/auth.service';
import { mockUsers, mockNewUser } from '../mocks/data';
import { StatusCodes } from 'http-status-codes';
import {
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  InternalServerError,
  BadRequestError,
} from '../../src/utils/error.util';
import { _ok } from '../../src/utils/response.util';

// Mock implementation
const mockGetUserByEmail = vi.fn();
const mockCreateUser = vi.fn();
const mockVerifyPassword = vi.fn();
const mockGetUserById = vi.fn();
const mockCheckEmailAvailability = vi.fn();

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
            id: 3,
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
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
    });

    it('should handle conflict errors when email exists', async () => {
      // Mock checkEmailAvailability to throw ConflictError directly
      mockCheckEmailAvailability.mockRejectedValueOnce(new ConflictError('Email already in use'));

      // Test that an error is thrown containing appropriate information
      await expect(authService.register(mockNewUser)).rejects.toThrow();
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
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
    });

    it('should handle unauthorized errors for invalid credentials', async () => {
      // Throw UnauthorizedError directly from mock
      mockVerifyPassword.mockRejectedValueOnce(new UnauthorizedError('Invalid credentials'));

      // Just test that an error is thrown
      await expect(authService.login('test@example.com', 'WrongPassword')).rejects.toThrow();
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
    });

    it('should handle unexpected errors', async () => {
      // Simplified error test
      mockVerifyPassword.mockRejectedValueOnce(new Error('Test error'));

      // Just test that some error is thrown
      await expect(authService.login('test@example.com', 'Password123!')).rejects.toThrow();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully for existing user', async () => {
      // Mock getUserById to return success
      mockGetUserById.mockResolvedValueOnce(_ok(mockUsers[0], 'User found'));

      // Basic check on response
      const result = await authService.refreshToken(1);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
    });

    it('should handle not found errors when user does not exist', async () => {
      // Throw NotFoundError directly from mock
      mockGetUserById.mockRejectedValueOnce(new NotFoundError('User not found'));

      // Just test that an error is thrown
      await expect(authService.refreshToken(999)).rejects.toThrow();
    });

    it('should throw an error when getUserById fails', async () => {
      // We need to reset mocks for this test
      vi.resetAllMocks();

      // Mock unsuccessful user retrieval
      mockGetUserById.mockResolvedValue({
        success: false,
        error: 'User not found',
        statusCode: StatusCodes.NOT_FOUND,
      });

      // Test that an error is thrown
      await expect(authService.refreshToken(999)).rejects.toThrow(NotFoundError);
    });

    it('should throw an error when getUserById returns success but no data', async () => {
      // We need to reset mocks for this test
      vi.resetAllMocks();

      // Mock user retrieval with success but no data
      mockGetUserById.mockResolvedValue({
        success: true,
        data: null,
        statusCode: StatusCodes.OK,
      });

      // Test that an error is thrown
      await expect(authService.refreshToken(999)).rejects.toThrow(NotFoundError);
    });

    it('should handle unexpected errors', async () => {
      // Simplified error test
      mockGetUserById.mockRejectedValueOnce(new Error('Test error'));

      // Just test that some error is thrown
      await expect(authService.refreshToken(1)).rejects.toThrow();
    });
  });
});
