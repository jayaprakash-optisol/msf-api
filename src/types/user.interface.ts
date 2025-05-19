import { type users } from '../models';

import { type PaginationParams, type ServiceResponse } from './common.interface';

// Database model types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export interface IUserResponse extends PaginationParams {
  users: Omit<User, 'password'>[];
  total: number;
  totalPages: number;
}

/**
 * User service interface
 */
export interface IUserService {
  /**
   * Check if an email is available
   */
  checkEmailAvailability(email: string): Promise<ServiceResponse<void>>;

  /**
   * Create a new user
   */
  createUser(
    userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ServiceResponse<User>>;

  /**
   * Get user by ID
   */
  getUserById(userId: number): Promise<ServiceResponse<User>>;

  /**
   * Get user by email
   */
  getUserByEmail(email: string): Promise<ServiceResponse<User>>;

  /**
   * Get all users with pagination
   */
  getAllUsers(pagination: PaginationParams): Promise<ServiceResponse<IUserResponse>>;

  /**
   * Update user
   */
  updateUser(
    userId: number,
    userData: Partial<Omit<User, 'id' | 'email' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ServiceResponse<User>>;

  /**
   * Delete user
   */
  deleteUser(userId: number): Promise<ServiceResponse<void>>;

  /**
   * Verify user password
   */
  verifyPassword(email: string, password: string): Promise<ServiceResponse<User>>;
}
