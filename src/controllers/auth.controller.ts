import { type Request, type Response } from 'express';

import { asyncHandler } from '../middleware/async.middleware';
import { AuthService } from '../services';
import { type AuthRequest, type IAuthService } from '../types';
import { sendSuccess, BadRequestError, UnauthorizedError } from '../utils';

export class AuthController {
  private readonly authService: IAuthService;

  constructor() {
    this.authService = AuthService.getInstance();
  }

  /**
   * Register a new user
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, role } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const result = await this.authService.register({
      email,
      password,
      firstName,
      lastName,
      role,
    });

    if (!result.success) {
      throw new BadRequestError(result.error ?? 'Registration failed');
    }

    sendSuccess(res, result.data, 'User registered successfully', result.statusCode);
  });

  /**
   * Login user
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const result = await this.authService.login(email, password);

    if (!result.success) {
      throw new UnauthorizedError(result.error ?? 'Login failed');
    }

    sendSuccess(res, result.data, 'Login successful');
  });

  /**
   * Get current user
   */
  getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    sendSuccess(res, {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
    });
  });

  /**
   * Refresh token
   */
  refreshToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const result = await this.authService.refreshToken(Number(req.user?.id));

    if (!result.success) {
      throw new BadRequestError(result.error ?? 'Token refresh failed');
    }

    sendSuccess(res, result.data, 'Token refreshed successfully');
  });
}
