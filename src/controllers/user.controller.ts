import { type Request, type Response } from 'express';

import { asyncHandler } from '../middleware/async.middleware';
import { UserService } from '../services';
import { type IUserService } from '../types';
import { sendSuccess, BadRequestError, NotFoundError } from '../utils';

export class UserController {
  private readonly userService: IUserService;

  constructor() {
    this.userService = UserService.getInstance();
  }

  /**
   * Get all users with pagination
   */
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    if (page < 1 || limit < 1) {
      throw new BadRequestError('Page and limit must be positive integers');
    }

    const result = await this.userService.getAllUsers({ page, limit });

    if (!result.success) {
      throw new BadRequestError(result.error ?? 'Failed to retrieve users');
    }

    sendSuccess(res, result.data);
  });

  /**
   * Get user by ID
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      throw new BadRequestError('Invalid user ID');
    }

    const result = await this.userService.getUserById(userId);

    if (!result.success) {
      throw new NotFoundError(result.error ?? 'Failed to retrieve user');
    }

    sendSuccess(res, result.data);
  });

  /**
   * Create a new user
   */
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, role } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const result = await this.userService.createUser({
      email,
      password,
      firstName,
      lastName,
      role,
    });

    if (!result.success) {
      throw new BadRequestError(result.error ?? 'Failed to create user');
    }

    sendSuccess(res, result.data, 'User created successfully');
  });

  /**
   * Update user
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      throw new BadRequestError('Invalid user ID');
    }

    const { firstName, lastName, password, role, isActive } = req.body;

    const result = await this.userService.updateUser(userId, {
      firstName,
      lastName,
      password,
      role,
      isActive,
    });

    if (!result.success) {
      throw new NotFoundError(result.error ?? 'Failed to update user');
    }

    sendSuccess(res, result.data, 'User updated successfully');
  });

  /**
   * Delete user
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      throw new BadRequestError('Invalid user ID');
    }

    const result = await this.userService.deleteUser(userId);

    if (!result.success) {
      throw new NotFoundError(result.error ?? 'Failed to delete user');
    }

    sendSuccess(res, undefined, 'User deleted successfully');
  });
}
