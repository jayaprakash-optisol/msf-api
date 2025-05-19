import bcrypt from 'bcrypt';
import { eq, or, sql, SQL } from 'drizzle-orm';
import { StatusCodes } from 'http-status-codes';

import { db } from '../config/database.config';
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
  userResponse,
} from '../utils';
import { hashPassword } from '../utils/encryption.util';
import { buildPaginationAndFilters } from '../utils/pagination.util';

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
        throw new ConflictError(userResponse.errors.emailExists);
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
      const hashedPassword = await hashPassword(userData.password);

      // Insert user into database with hashed password
      const result = await db
        .insert(users)
        .values({
          ...userData,
          password: hashedPassword,
        })
        .returning();

      if (!result.length) {
        throw new DatabaseError(userResponse.errors.creationFailed);
      }

      return _ok(result[0], userResponse.success.created, StatusCodes.CREATED);
    } catch (error) {
      throw handleServiceError(error, userResponse.errors.creationFailed);
    }
  }

  /**
   * Get user by ID
   * @param userId - The ID of the user to get
   * @returns A service response containing the user
   */
  async getUserById(userId: string): Promise<ServiceResponse<Omit<User, 'password'>>> {
    try {
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!result.length) {
        throw new NotFoundError(userResponse.errors.notFound);
      }

      return _ok(result[0], userResponse.success.found);
    } catch (error) {
      throw handleServiceError(error, userResponse.errors.notFound);
    }
  }

  /**
   * Get user by email
   * @param email - The email of the user to get
   * @returns A service response containing the user
   */
  async getUserByEmail(email: string): Promise<ServiceResponse<Omit<User, 'password'>>> {
    try {
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!result.length) {
        throw new NotFoundError(userResponse.errors.notFound);
      }

      return _ok(result[0], userResponse.success.found);
    } catch (error) {
      throw handleServiceError(error, userResponse.errors.notFound);
    }
  }

  /**
   * Get all users with pagination
   * @param pagination - The pagination parameters
   * @returns A service response containing the users
   */
  async getAllUsers(
    pagination: PaginationParams & { search?: string },
  ): Promise<ServiceResponse<IUserResponse>> {
    try {
      const { offset, limit, page, search } = buildPaginationAndFilters(
        pagination as Record<string, unknown>,
      );

      // Build base query
      const baseQuery = db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users);

      // Add search filter if provided
      let whereClause: SQL<unknown> | undefined;
      if (search) {
        whereClause = or(
          sql`LOWER(${users.firstName}) LIKE LOWER(${'%' + search + '%'})`,
          sql`LOWER(${users.lastName}) LIKE LOWER(${'%' + search + '%'})`,
          sql`LOWER(${users.email}) LIKE LOWER(${'%' + search + '%'})`,
        );
      }

      // Get total count with filters
      const countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
      if (whereClause) countQuery.where(whereClause);
      const countResult = await countQuery;
      const total = Number(countResult[0]?.count || 0);

      // Apply filters and pagination
      if (whereClause) baseQuery.where(whereClause);
      const result = await baseQuery.limit(limit).offset(offset);

      // Calculate total pages
      const totalPages = Math.ceil(total / limit);

      return _ok(
        {
          users: result,
          total,
          page,
          limit,
          totalPages,
        },
        userResponse.success.retrieved,
      );
    } catch (error) {
      throw handleServiceError(error, userResponse.errors.listFailed);
    }
  }

  /**
   * Update user
   * @param userId - The ID of the user to update
   * @param userData - The data of the user to update
   * @returns A service response containing the user
   */
  async updateUser(
    userId: string,
    userData: Partial<Omit<User, 'id' | 'email' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ServiceResponse<Omit<User, 'password'>>> {
    try {
      // Check if user exists
      await this.findUserOrFail(userId);

      // If password is being updated, hash it
      let dataToUpdate = { ...userData };
      if (userData.password) {
        const hashedPassword = await hashPassword(userData.password);
        dataToUpdate = { ...dataToUpdate, password: hashedPassword };
      }

      // Update user
      const result = await db
        .update(users)
        .set({ ...dataToUpdate, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        });

      if (!result.length) {
        throw new DatabaseError(userResponse.errors.updateFailed);
      }

      return _ok(result[0], userResponse.success.updated);
    } catch (error) {
      throw handleServiceError(error, userResponse.errors.updateFailed);
    }
  }

  /**
   * Delete user
   * @param userId - The ID of the user to delete
   * @returns A service response containing the result
   */
  async deleteUser(userId: string): Promise<ServiceResponse<void>> {
    try {
      // Check if user exists
      await this.findUserOrFail(userId);

      // Delete user
      const result = await db.delete(users).where(eq(users.id, userId));

      if (!result) {
        throw new DatabaseError(userResponse.errors.deleteFailed);
      }

      return _ok(undefined, userResponse.success.deleted, StatusCodes.NO_CONTENT);
    } catch (error) {
      throw handleServiceError(error, userResponse.errors.deleteFailed);
    }
  }

  /**
   * Verify user password
   * @param email - The email of the user to verify the password for
   * @param password - The password of the user to verify
   * @returns A service response containing the user
   */
  async verifyPassword(
    email: string,
    password: string,
  ): Promise<ServiceResponse<Omit<User, 'password'>>> {
    try {
      // Get user by email with password
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (!result.length) {
        throw new UnauthorizedError(userResponse.errors.invalidOldPassword);
      }

      const user = result[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedError(userResponse.errors.invalidOldPassword);
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return _ok(userWithoutPassword, userResponse.success.passwordUpdated);
    } catch (error) {
      throw handleServiceError(error, userResponse.errors.passwordUpdateFailed);
    }
  }

  /**
   * Helper method to find a user by ID or throw NotFoundError
   * @param userId - The ID of the user to find
   * @returns The user
   */
  private async findUserOrFail(userId: string): Promise<Omit<User, 'password'>> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!result.length) {
      throw new NotFoundError(userResponse.errors.notFound);
    }

    return result[0];
  }
}
