import { type Request, type Response } from 'express';

import { asyncHandler } from '../middleware';
import { UserService } from '../services';
import { type IUserService } from '../types';
import {
  BadRequestError,
  commonResponse,
  NotFoundError,
  sendSuccess,
  userResponse,
} from '../utils';

export class UserController {
  private readonly userService: IUserService;
  /**
   * Get all users with pagination
   */
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string | undefined;

    if (page < 1 || limit < 1) {
      throw new BadRequestError(commonResponse.errors.validationFailed);
    }

    const result = await this.userService.getAllUsers({ page, limit, search });

    if (!result.success) {
      throw new BadRequestError(result.error ?? userResponse.errors.listFailed);
    }

    sendSuccess(res, result.data);
  });
  /**
   * Get user by ID
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;

    const result = await this.userService.getUserById(userId);

    if (!result.success) {
      throw new NotFoundError(result.error ?? userResponse.errors.notFound);
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
      throw new BadRequestError(commonResponse.errors.validationFailed);
    }

    const result = await this.userService.createUser({
      email,
      password,
      firstName,
      lastName,
      role,
    });

    if (!result.success) {
      throw new BadRequestError(result.error ?? userResponse.errors.creationFailed);
    }

    sendSuccess(res, result.data, userResponse.success.created);
  });
  /**
   * Update user
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;

    const { firstName, lastName, password, role, isActive } = req.body;

    const result = await this.userService.updateUser(userId, {
      firstName,
      lastName,
      password,
      role,
      isActive,
    });

    if (!result.success) {
      throw new NotFoundError(result.error ?? userResponse.errors.updateFailed);
    }

    sendSuccess(res, result.data, userResponse.success.updated);
  });
  /**
   * Delete user
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;

    const result = await this.userService.deleteUser(userId);

    if (!result.success) {
      throw new NotFoundError(result.error ?? userResponse.errors.deleteFailed);
    }

    sendSuccess(res, undefined, userResponse.success.deleted);
  });

  constructor() {
    this.userService = UserService.getInstance();
  }
}
