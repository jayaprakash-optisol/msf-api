import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { mockUsers, mockNewUser } from '../mocks/data';
import env from '../../src/config/env.config';

// Create mock functions
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockImplementation(password => Promise.resolve(`hashed_${password}`)),
    compare: vi.fn().mockImplementation(() => Promise.resolve(true)),
  },
}));

// Create a simple mock db object with jest functions
vi.mock('../../src/config/database.config', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import the service (after mocks)
import { UserService } from '../../src/services/user.service';
import bcrypt from 'bcrypt';
import { db } from '../../src/config/database.config';
import {
  DatabaseError,
  NotFoundError,
  InternalServerError,
  UnauthorizedError,
  ConflictError,
} from '../../src/utils/error.util';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    vi.resetAllMocks();

    // Reset singleton
    // @ts-ignore
    UserService.instance = undefined;
    userService = UserService.getInstance();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1, ...mockNewUser }]),
        }),
      } as any);

      const result = await userService.createUser(mockNewUser);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(StatusCodes.CREATED);
      expect(result.message).toContain('User created successfully');
      expect(db.insert).toHaveBeenCalled();
    });

    it('should throw DatabaseError when user creation fails', async () => {
      // Setup mocks for this test
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      await expect(userService.createUser(mockNewUser)).rejects.toThrow(DatabaseError);
      await expect(userService.createUser(mockNewUser)).rejects.toThrow('Failed to create user');
    });

    it('should throw InternalServerError for database errors', async () => {
      // Setup mocks for this test
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      } as any);

      await expect(userService.createUser(mockNewUser)).rejects.toThrow(InternalServerError);
    });
  });

  describe('getUserById', () => {
    it('should get a user by ID successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      const result = await userService.getUserById(1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('User found');
      expect(db.select).toHaveBeenCalled();
    });

    it('should throw NotFoundError when user not found', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(userService.getUserById(999)).rejects.toThrow(NotFoundError);
      await expect(userService.getUserById(999)).rejects.toThrow('User with ID 999 not found');
    });
  });

  describe('getUserByEmail', () => {
    it('should get a user by email successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      const result = await userService.getUserByEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('User found');
      expect(db.select).toHaveBeenCalled();
    });

    it('should throw NotFoundError when user not found by email', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(userService.getUserByEmail('nonexistent@example.com')).rejects.toThrow(
        NotFoundError,
      );
      await expect(userService.getUserByEmail('nonexistent@example.com')).rejects.toThrow(
        'User with email nonexistent@example.com not found',
      );
    });
  });

  describe('getAllUsers', () => {
    it('should get all users with pagination', async () => {
      // Setup mocks for this test - first for count, then for select
      vi.mocked(db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue([{ count: 2 }]),
        } as any)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockUsers),
            }),
          }),
        } as any);

      const result = await userService.getAllUsers({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('users');
      expect(result.data).toHaveProperty('total');
      expect(result.message).toContain('Users retrieved successfully');
    });

    it('should throw InternalServerError for database errors', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(userService.getAllUsers({ page: 1, limit: 10 })).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      // Setup mocks for this test - first for finding user, then for update
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockUsers[0], firstName: 'Updated' }]),
          }),
        }),
      } as any);

      const result = await userService.updateUser(1, {
        firstName: 'Updated',
        lastName: 'User',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('User updated successfully');
      expect(db.select).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });

    it('should hash password when updating password', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue([{ ...mockUsers[0], password: 'hashed_password' }]),
          }),
        }),
      } as any);

      await userService.updateUser(1, { password: 'NewPassword123!' });

      expect(bcrypt.hash).toHaveBeenCalled();
    });

    it('should throw NotFoundError when user not found for update', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(userService.updateUser(999, { firstName: 'Updated' })).rejects.toThrow(
        NotFoundError,
      );
      await expect(userService.updateUser(999, { firstName: 'Updated' })).rejects.toThrow(
        'User with ID 999 not found',
      );
    });

    it('should throw DatabaseError when update fails', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(userService.updateUser(1, { firstName: 'Updated' })).rejects.toThrow(
        DatabaseError,
      );
      await expect(userService.updateUser(1, { firstName: 'Updated' })).rejects.toThrow(
        'Failed to update user',
      );
    });

    it('should throw InternalServerError for database errors', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      } as any);

      await expect(userService.updateUser(1, { firstName: 'Updated' })).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue(1),
      } as any);

      const result = await userService.deleteUser(1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('User deleted successfully');
      expect(db.select).toHaveBeenCalled();
      expect(db.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundError when user not found for deletion', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(userService.deleteUser(999)).rejects.toThrow(NotFoundError);
      await expect(userService.deleteUser(999)).rejects.toThrow('User with ID 999 not found');
    });

    it('should throw DatabaseError when deletion fails', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(userService.deleteUser(1)).rejects.toThrow(DatabaseError);
      await expect(userService.deleteUser(1)).rejects.toThrow('Failed to delete user');
    });

    it('should throw InternalServerError for database errors', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Database error')),
      } as any);

      await expect(userService.deleteUser(1)).rejects.toThrow(InternalServerError);
    });
  });

  describe('verifyPassword', () => {
    it('should verify password successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      // Explicitly ensure bcrypt.compare returns true for this test
      vi.mocked(bcrypt.compare).mockImplementation(() => Promise.resolve(true));

      const result = await userService.verifyPassword('test@example.com', 'Password123!');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password verified successfully');
      expect(db.select).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError for invalid password', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      // Temporarily reassign compare to return false for this test
      const originalCompare = vi.mocked(bcrypt.compare);
      vi.mocked(bcrypt.compare).mockImplementation(() => Promise.resolve(false));

      await expect(userService.verifyPassword('test@example.com', 'WrongPassword')).rejects.toThrow(
        UnauthorizedError,
      );
      await expect(userService.verifyPassword('test@example.com', 'WrongPassword')).rejects.toThrow(
        'Invalid credentials',
      );

      // Restore the original mock
      vi.mocked(bcrypt.compare).mockImplementation(originalCompare);
    });

    it('should throw UnauthorizedError when user not found', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(
        userService.verifyPassword('nonexistent@example.com', 'Password123!'),
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        userService.verifyPassword('nonexistent@example.com', 'Password123!'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw InternalServerError for database errors', async () => {
      // Setup mocks for this test
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      } as any);

      await expect(userService.verifyPassword('test@example.com', 'Password123!')).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe('checkEmailAvailability', () => {
    it('should return that email is available when user not found', async () => {
      // Mock getUserByEmail to throw NotFoundError
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await userService.checkEmailAvailability('available@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Email is available');
    });

    it('should return that email is available when NotFoundError is caught', async () => {
      // Mock getUserByEmail to throw NotFoundError directly
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new NotFoundError('User not found')),
          }),
        }),
      } as any);

      const result = await userService.checkEmailAvailability('available@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Email is available');
    });

    it('should throw ConflictError when email is already in use', async () => {
      // Mock getUserByEmail to return a user
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      await expect(userService.checkEmailAvailability('test@example.com')).rejects.toThrow(
        ConflictError,
      );
      await expect(userService.checkEmailAvailability('test@example.com')).rejects.toThrow(
        'Email already in use',
      );
    });

    it('should pass through other errors', async () => {
      // Mock getUserByEmail to throw an error other than NotFoundError
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Database connection error')),
          }),
        }),
      } as any);

      await expect(userService.checkEmailAvailability('test@example.com')).rejects.toThrow(
        'Database connection error',
      );
    });
  });

  // Test private methods
  describe('private methods', () => {
    it('hashPassword should hash a password', async () => {
      // Mock env config to ensure BCRYPT_SALT_ROUNDS is properly processed
      const originalEnv = { ...env };

      // Test with different types of salt values
      const testCases = [
        { saltValue: 10, expected: 10 }, // Number
        { saltValue: '10', expected: 10 }, // String
      ];

      for (const testCase of testCases) {
        // Update env for this test case
        (env as any).BCRYPT_SALT_ROUNDS = testCase.saltValue;

        // Mock hash implementation for this specific test
        const originalHash = vi.mocked(bcrypt.hash);
        vi.mocked(bcrypt.hash).mockImplementationOnce(async (_password, saltRounds) => {
          // Verify salt rounds are correctly processed
          expect(saltRounds).toBe(testCase.expected);
          return 'hashed_password123';
        });

        // Access private method
        // @ts-ignore - accessing private method for testing
        const hashedPassword = await userService.hashPassword('password123');

        expect(hashedPassword).toBe('hashed_password123');
        expect(bcrypt.hash).toHaveBeenCalledWith('password123', testCase.expected);

        // Restore the original mock for the next iteration
        vi.mocked(bcrypt.hash).mockImplementation(originalHash);
      }

      // Restore original env
      Object.assign(env, originalEnv);
    });

    it('findUserOrFail should return user when found', async () => {
      // Mock db.select for findUserOrFail
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUsers[0]]),
          }),
        }),
      } as any);

      // Access private method
      // @ts-ignore - accessing private method for testing
      const user = await userService.findUserOrFail(1);

      expect(user).toEqual(mockUsers[0]);
    });

    it('findUserOrFail should throw NotFoundError when user not found', async () => {
      // Mock db.select for findUserOrFail
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      // Access private method and expect it to throw
      // @ts-ignore - accessing private method for testing
      await expect(userService.findUserOrFail(999)).rejects.toThrow(NotFoundError);
      // @ts-ignore - accessing private method for testing
      await expect(userService.findUserOrFail(999)).rejects.toThrow('User with ID 999 not found');
    });
  });
});
