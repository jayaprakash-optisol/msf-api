import bcrypt from 'bcrypt';
import { eq, getTableColumns } from 'drizzle-orm';
import { StatusCodes } from 'http-status-codes';

import { db } from '../config/database.config';
import env from '../config/env.config';
import { users } from '../models';
import {
  IUserResponse,
  type IUserService,
  type NewUser,
  type PaginationParams,
  type ServiceResponse,
  type User,
} from '../types';
import {
  ConflictError,
  DatabaseError,
  NotFoundError,
  UnauthorizedError,
  _ok,
  handleServiceError,
} from '../utils';

export class UserService implements IUserService {
  private static instance: UserService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Helper method to check if an email is available
   * @param email - The email to check
   * @returns A service response containing the result
   */
  async checkEmailAvailability(email: string): Promise<ServiceResponse<void>> {
    try {
      const existingUser = await this.getUserByEmail(email);
      if (existingUser.success && existingUser.data) {
        throw new ConflictError('Email already in use');
      }
      return _ok(undefined, 'Email is available');
    } catch (error) {
      if (error instanceof NotFoundError) {
        // Email doesn't exist, so it's available
        return _ok(undefined, 'Email is available');
      }
      throw error;
    }
  }

  /**
   * Create a new user
   * @param userData - The data of the user to create
   * @returns A service response containing the user
   */
  async createUser(
    userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ServiceResponse<User>> {
    try {
      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Insert user into database with hashed password
      const result = await db
        .insert(users)
        .values({
          ...userData,
          password: hashedPassword,
        })
        .returning();

      if (!result.length) {
        throw new DatabaseError('Failed to create user');
      }

      return _ok(result[0], 'User created successfully', StatusCodes.CREATED);
    } catch (error) {
      throw handleServiceError(error, 'User creation failed');
    }
  }

  /**
   * Get user by ID
   * @param userId - The ID of the user to get
   * @returns A service response containing the user
   */
  async getUserById(userId: number): Promise<ServiceResponse<User>> {
    try {
      const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!result.length) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }

      return _ok(result[0], 'User found');
    } catch (error) {
      throw handleServiceError(error, `Failed to get user with ID ${userId}`);
    }
  }

  /**
   * Get user by email
   * @param email - The email of the user to get
   * @returns A service response containing the user
   */
  async getUserByEmail(email: string): Promise<ServiceResponse<User>> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (!result.length) {
        throw new NotFoundError(`User with email ${email} not found`);
      }

      return _ok(result[0], 'User found');
    } catch (error) {
      throw handleServiceError(error, `Failed to get user with email ${email}`);
    }
  }

  /**
   * Get all users with pagination
   * @param pagination - The pagination parameters
   * @returns A service response containing the users
   */
  async getAllUsers(pagination: PaginationParams): Promise<ServiceResponse<IUserResponse>> {
    try {
      const { page = 1, limit = 10 } = pagination;
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await db.select({ count: users.id }).from(users);
      const total = countResult.length;

      // Get users with pagination
      const { password: _password, ...rest } = getTableColumns(users);
      const result = await db.select(rest).from(users).limit(limit).offset(offset);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);

      const paginatedResult: IUserResponse = {
        users: result,
        total,
        page,
        limit,
        totalPages,
      };

      return _ok(paginatedResult, 'Users retrieved successfully');
    } catch (error) {
      throw handleServiceError(error, 'Failed to retrieve users');
    }
  }

  /**
   * Update user
   * @param userId - The ID of the user to update
   * @param userData - The data of the user to update
   * @returns A service response containing the user
   */
  async updateUser(
    userId: number,
    userData: Partial<Omit<User, 'id' | 'email' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ServiceResponse<User>> {
    try {
      // Check if user exists
      await this.findUserOrFail(userId);

      // If password is being updated, hash it
      let dataToUpdate = { ...userData };
      if (userData.password) {
        const hashedPassword = await this.hashPassword(userData.password);
        dataToUpdate = { ...dataToUpdate, password: hashedPassword };
      }

      // Update user
      const result = await db
        .update(users)
        .set({ ...dataToUpdate, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      if (!result.length) {
        throw new DatabaseError('Failed to update user');
      }

      return _ok(result[0], 'User updated successfully');
    } catch (error) {
      throw handleServiceError(error, `Failed to update user with ID ${userId}`);
    }
  }

  /**
   * Delete user
   * @param userId - The ID of the user to delete
   * @returns A service response containing the result
   */
  async deleteUser(userId: number): Promise<ServiceResponse<void>> {
    try {
      // Check if user exists
      await this.findUserOrFail(userId);

      // Delete user
      const result = await db.delete(users).where(eq(users.id, userId));

      if (!result) {
        throw new DatabaseError('Failed to delete user');
      }

      return _ok(undefined, 'User deleted successfully', StatusCodes.NO_CONTENT);
    } catch (error) {
      throw handleServiceError(error, `Failed to delete user with ID ${userId}`);
    }
  }

  /**
   * Verify user password
   * @param email - The email of the user to verify the password for
   * @param password - The password of the user to verify
   * @returns A service response containing the user
   */
  async verifyPassword(email: string, password: string): Promise<ServiceResponse<User>> {
    try {
      // Get user by email
      let user: User;

      try {
        const userResult = await this.getUserByEmail(email);
        if (!userResult.success || !userResult.data) {
          throw new UnauthorizedError('Invalid credentials');
        }
        user = userResult.data;
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw new UnauthorizedError('Invalid credentials');
        }
        throw error;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid credentials');
      }

      return _ok(user, 'Password verified successfully');
    } catch (error) {
      throw handleServiceError(error, 'Password verification failed');
    }
  }

  /**
   * Helper method to hash a password
   * @param password - The password to hash
   * @returns The hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(env.BCRYPT_SALT_ROUNDS.toString(), 10);
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Helper method to find a user by ID or throw NotFoundError
   * @param userId - The ID of the user to find
   * @returns The user
   */
  private async findUserOrFail(userId: number): Promise<User> {
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!result.length) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    return result[0];
  }
}
