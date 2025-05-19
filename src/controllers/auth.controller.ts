import { type Request, type Response } from 'express';

import { asyncHandler } from '../middleware/async.middleware';
import { AuthService } from '../services';
import { type IAuthService } from '../types';
import {
  sendSuccess,
  BadRequestError,
  UnauthorizedError,
  authResponse,
  commonResponse,
} from '../utils';

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
}
