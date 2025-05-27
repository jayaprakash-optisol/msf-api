import { type Request, type Response } from 'express';

import { asyncHandler } from '../middleware';
import { AuthService } from '../services';
import { type IAuthService, type AuthRequest } from '../types';
import {
  authResponse,
  BadRequestError,
  commonResponse,
  sendSuccess,
  UnauthorizedError,
  jwtUtil,
} from '../utils';

export class AuthController {
  private readonly authService: IAuthService;
  /**
   * Register a new user
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, role } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new BadRequestError(commonResponse.errors.validationFailed);
    }

    const result = await this.authService.register({
      email,
      password,
      firstName,
      lastName,
      role,
    });

    if (!result.success) {
      throw new BadRequestError(result.error ?? authResponse.errors.loginFailed);
    }

    sendSuccess(res, result.data, authResponse.success.loggedIn, result.statusCode);
  });
  /**
   * Login user
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new BadRequestError(commonResponse.errors.validationFailed);
    }

    const result = await this.authService.login(email, password);

    if (!result.success) {
      throw new UnauthorizedError(result.error ?? authResponse.errors.loginFailed);
    }

    sendSuccess(res, result.data, authResponse.success.loggedIn);
  });

  /**
   * Logout user
   */
  logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const result = await this.authService.logout(token);

    if (!result.success) {
      throw new BadRequestError(result.error ?? authResponse.errors.logoutFailed);
    }

    sendSuccess(res, result.data, result.message);
  });

  /**
   * Logout from all devices
   */
  logoutAllDevices = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user?.id) {
      throw new UnauthorizedError('User not authenticated');
    }

    const result = await this.authService.logoutAllDevices(req.user.id);

    if (!result.success) {
      throw new BadRequestError(result.error ?? authResponse.errors.logoutFailed);
    }

    sendSuccess(res, result.data, result.message);
  });

  /**
   * Get current user information
   */
  getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    sendSuccess(
      res,
      {
        userId: parseInt(req.user.id),
        email: req.user.email,
        role: req.user.role,
      },
      'Current user data retrieved successfully',
    );
  });

  /**
   * Refresh authentication token
   */
  refreshToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const newToken = jwtUtil.generateToken({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });

    sendSuccess(res, { token: newToken }, 'Token refreshed successfully');
  });

  constructor() {
    this.authService = AuthService.getInstance();
  }
}
