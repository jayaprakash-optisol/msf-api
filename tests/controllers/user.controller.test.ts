import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserController } from '../../src/controllers/user.controller';
import { UserService } from '../../src/services/user.service';
import { mockUsers, mockNewUser } from '../mocks/data';
import { StatusCodes } from 'http-status-codes';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  generateOrthogonalTestCases,
} from '../utils/test-utils';
import { BadRequestError, NotFoundError } from '../../src/utils/error.util';

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
vi.mock('../../src/services/user.service', () => {
  const userServiceMock = {
    createUser: vi.fn(),
    getUserById: vi.fn(),
    getUserByEmail: vi.fn(),
    getAllUsers: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    verifyPassword: vi.fn(),
  };

  return {
    UserService: {
      getInstance: vi.fn(() => userServiceMock),
    },
  };
});

describe('UserController', () => {
  let controller: UserController;
  let userService: any;

  beforeEach(() => {
    vi.resetAllMocks();
    userService = UserService.getInstance();
    controller = new UserController();
  });

  describe('getAllUsers', () => {
    it('should get all users with default pagination', async () => {
      // Setup mocks
      const req = createMockRequest({ query: {} });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.getAllUsers.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.OK,
        data: {
          items: mockUsers.map(user => ({ ...user, password: undefined })),
          total: mockUsers.length,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
        message: 'Users retrieved successfully',
      });

      // Call the controller method
      await controller.getAllUsers(req, res, next);

      // Verify service was called with correct pagination
      expect(userService.getAllUsers).toHaveBeenCalledWith({ page: 1, limit: 10 });

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            items: expect.any(Array),
            total: mockUsers.length,
          }),
        }),
      );
    });

    it('should get all users with custom pagination', async () => {
      // Setup mocks
      const req = createMockRequest({ query: { page: '2', limit: '5' } });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.getAllUsers.mockResolvedValueOnce({
        success: true,
        data: {
          items: mockUsers.map(user => ({ ...user, password: undefined })),
          total: mockUsers.length,
          page: 2,
          limit: 5,
          totalPages: 1,
        },
        message: 'Users retrieved successfully',
      });

      // Call the controller method
      await controller.getAllUsers(req, res, next);

      // Verify service was called with custom pagination
      expect(userService.getAllUsers).toHaveBeenCalledWith({ page: 2, limit: 5 });

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        }),
      );
    });

    it('should validate positive integers for pagination', async () => {
      // Setup mocks with invalid pagination
      const req = createMockRequest({ query: { page: '-1', limit: '0' } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.getAllUsers(req, res, next);

      // Service should not be called with invalid pagination
      expect(userService.getAllUsers).not.toHaveBeenCalled();

      // Should pass BadRequestError to next
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Page and limit must be positive integers');
    });

    it('should return error if getAllUsers fails', async () => {
      // Setup mocks
      const req = createMockRequest({ query: {} });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.getAllUsers.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: 'Database error',
      });

      // Call the controller method
      await controller.getAllUsers(req, res, next);

      // Verify BadRequestError was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Database error');
    });

    it('should return default error message if error is undefined', async () => {
      // Setup mocks
      const req = createMockRequest({ query: {} });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.getAllUsers.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: undefined,
      });

      // Call the controller method
      await controller.getAllUsers(req, res, next);

      // Verify BadRequestError with default message was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Failed to retrieve users');
    });

    it('should handle unexpected errors', async () => {
      // Setup mocks
      const req = createMockRequest({ query: {} });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      userService.getAllUsers.mockRejectedValueOnce(new Error('Unexpected error'));

      // Call the controller method
      await controller.getAllUsers(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getUserById', () => {
    it('should get user by ID successfully', async () => {
      // Setup mocks
      const req = createMockRequest({ params: { id: '1' } });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.getUserById.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.OK,
        data: mockUsers[0],
        message: 'User found',
      });

      // Call the controller method
      await controller.getUserById(req, res, next);

      // Verify service was called with correct ID
      expect(userService.getUserById).toHaveBeenCalledWith(1);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 1,
            email: mockUsers[0].email,
          }),
        }),
      );
    });

    it('should validate user ID is a number', async () => {
      // Setup mocks with invalid ID
      const req = createMockRequest({ params: { id: 'abc' } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.getUserById(req, res, next);

      // Service should not be called with invalid ID
      expect(userService.getUserById).not.toHaveBeenCalled();

      // Should pass BadRequestError to next
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Invalid user ID');
    });

    it('should return error if user not found', async () => {
      // Setup mocks
      const req = createMockRequest({ params: { id: '999' } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.getUserById.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.NOT_FOUND,
        error: 'User not found',
      });

      // Call the controller method
      await controller.getUserById(req, res, next);

      // Verify NotFoundError was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('User not found');
    });

    it('should return default error message if error is undefined', async () => {
      // Setup mocks
      const req = createMockRequest({ params: { id: '1' } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.getUserById.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: undefined,
      });

      // Call the controller method
      await controller.getUserById(req, res, next);

      // Verify NotFoundError with default message was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('Failed to retrieve user');
    });

    it('should handle unexpected errors', async () => {
      // Setup mocks
      const req = createMockRequest({ params: { id: '1' } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      userService.getUserById.mockRejectedValueOnce(new Error('Unexpected error'));

      // Call the controller method
      await controller.getUserById(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockNewUser });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.createUser.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.CREATED,
        data: { id: 3, ...mockNewUser },
        message: 'User created successfully',
      });

      // Call the controller method
      await controller.createUser(req, res, next);

      // Verify service was called with correct data
      expect(userService.createUser).toHaveBeenCalledWith(mockNewUser);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 3,
            email: mockNewUser.email,
          }),
          message: 'User created successfully',
        }),
      );
    });

    // Validate required fields using orthogonal testing
    const createUserFactors = {
      email: [undefined, 'test@example.com'],
      password: [undefined, 'Password123!'],
    };

    const createUserTestCases = generateOrthogonalTestCases<{
      email: string | undefined;
      password: string | undefined;
    }>(createUserFactors);

    createUserTestCases.forEach(testCase => {
      if (!testCase.email || !testCase.password) {
        it(`should validate required fields: email=${testCase.email}, password=${testCase.password}`, async () => {
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
          await controller.createUser(req, res, next);

          // Should not call service if validation fails
          expect(userService.createUser).not.toHaveBeenCalled();

          // Should pass BadRequestError to next
          expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
          expect(next.mock.calls[0][0].message).toBe('Email and password are required');
        });
      }
    });

    it('should return error if user creation fails', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockNewUser });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.createUser.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        error: 'Email already in use',
      });

      // Call the controller method
      await controller.createUser(req, res, next);

      // Verify BadRequestError was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Email already in use');
    });

    it('should return default error message if error is undefined', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockNewUser });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.createUser.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: undefined,
      });

      // Call the controller method
      await controller.createUser(req, res, next);

      // Verify BadRequestError with default message was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Failed to create user');
    });

    it('should handle unexpected errors', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockNewUser });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      userService.createUser.mockRejectedValueOnce(new Error('Unexpected error'));

      // Call the controller method
      await controller.createUser(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateUser', () => {
    const updateData = {
      firstName: 'Updated',
      lastName: 'User',
      password: 'NewPassword123!',
      role: 'admin' as const,
      isActive: true,
    };

    it('should update a user successfully', async () => {
      // Setup mocks
      const req = createMockRequest({
        params: { id: '1' },
        body: updateData,
      });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.updateUser.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.OK,
        data: { ...mockUsers[0], ...updateData },
        message: 'User updated successfully',
      });

      // Call the controller method
      await controller.updateUser(req, res, next);

      // Verify service was called with correct data
      expect(userService.updateUser).toHaveBeenCalledWith(1, updateData);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 1,
            firstName: 'Updated',
          }),
          message: 'User updated successfully',
        }),
      );
    });

    it('should validate user ID is a number', async () => {
      // Setup mocks with invalid ID
      const req = createMockRequest({
        params: { id: 'abc' },
        body: updateData,
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.updateUser(req, res, next);

      // Service should not be called with invalid ID
      expect(userService.updateUser).not.toHaveBeenCalled();

      // Should pass BadRequestError to next
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Invalid user ID');
    });

    it('should return error if user update fails', async () => {
      // Setup mocks
      const req = createMockRequest({
        params: { id: '1' },
        body: updateData,
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.updateUser.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.NOT_FOUND,
        error: 'User not found',
      });

      // Call the controller method
      await controller.updateUser(req, res, next);

      // Verify NotFoundError was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('User not found');
    });

    it('should return default error message if error is undefined', async () => {
      // Setup mocks
      const req = createMockRequest({
        params: { id: '1' },
        body: updateData,
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.updateUser.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: undefined,
      });

      // Call the controller method
      await controller.updateUser(req, res, next);

      // Verify NotFoundError with default message was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('Failed to update user');
    });

    it('should handle unexpected errors', async () => {
      // Setup mocks
      const req = createMockRequest({
        params: { id: '1' },
        body: updateData,
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      userService.updateUser.mockRejectedValueOnce(new Error('Unexpected error'));

      // Call the controller method
      await controller.updateUser(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      // Setup mocks
      const req = createMockRequest({ params: { id: '1' } });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.deleteUser.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.OK,
        message: 'User deleted successfully',
      });

      // Call the controller method
      await controller.deleteUser(req, res, next);

      // Verify service was called with correct ID
      expect(userService.deleteUser).toHaveBeenCalledWith(1);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User deleted successfully',
        }),
      );
    });

    it('should validate user ID is a number', async () => {
      // Setup mocks with invalid ID
      const req = createMockRequest({ params: { id: 'abc' } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call the controller method
      await controller.deleteUser(req, res, next);

      // Service should not be called with invalid ID
      expect(userService.deleteUser).not.toHaveBeenCalled();

      // Should pass BadRequestError to next
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Invalid user ID');
    });

    it('should return error if user deletion fails', async () => {
      // Setup mocks
      const req = createMockRequest({ params: { id: '1' } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.deleteUser.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.NOT_FOUND,
        error: 'User not found',
      });

      // Call the controller method
      await controller.deleteUser(req, res, next);

      // Verify NotFoundError was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('User not found');
    });

    it('should return default error message if error is undefined', async () => {
      // Setup mocks
      const req = createMockRequest({ params: { id: '1' } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      userService.deleteUser.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: undefined,
      });

      // Call the controller method
      await controller.deleteUser(req, res, next);

      // Verify NotFoundError with default message was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('Failed to delete user');
    });

    it('should handle unexpected errors', async () => {
      // Setup mocks
      const req = createMockRequest({ params: { id: '1' } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      userService.deleteUser.mockRejectedValueOnce(new Error('Unexpected error'));

      // Call the controller method
      await controller.deleteUser(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
