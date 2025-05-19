import {
  type IAuthService,
  type IUserService,
  type JwtPayload,
  type NewUser,
  type ServiceResponse,
  type User,
} from '../types';
import {
  BadRequestError,
  UnauthorizedError,
  _ok,
  handleServiceError,
  authResponse,
  userResponse,
} from '../utils';
import { jwtUtil } from '../utils/jwt.util';

import { UserService } from './user.service';

export class AuthService implements IAuthService {
  private readonly userService: IUserService;
  private static instance: AuthService;

  private constructor() {
    this.userService = UserService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register a new user
   * @param userData - The data of the user to register
   * @returns A service response containing the user
   */
  async register(
    userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ServiceResponse<Omit<User, 'password'>>> {
    try {
      // Check if user already exists with the email
      await this.userService.checkEmailAvailability(userData.email);

      // Create new user
      const result = await this.userService.createUser(userData);

      if (!result.success || !result.data) {
        throw new BadRequestError(result.error ?? userResponse.errors.creationFailed);
      }

      const { password: _password, ...userWithoutPassword } = result.data;
      return _ok(userWithoutPassword, userResponse.success.created, result.statusCode);
    } catch (error) {
      throw handleServiceError(error, userResponse.errors.creationFailed);
    }
  }

  /**
   * Login user
   * @param email - The email of the user to login
   * @param password - The password of the user to login
   * @returns A service response containing the user and the generated token
   */
  async login(
    email: string,
    password: string,
  ): Promise<ServiceResponse<{ user: Omit<User, 'password'>; token: string }>> {
    try {
      // Verify password
      const verifyResult = await this.userService.verifyPassword(email, password);

      if (!verifyResult.success || !verifyResult.data) {
        throw new UnauthorizedError(verifyResult.error ?? authResponse.errors.invalidCredentials);
      }

      // Generate JWT token
      const payload: JwtPayload = {
        userId: verifyResult.data.id,
        email: verifyResult.data.email,
        role: verifyResult.data.role,
      };

      const token = jwtUtil.generateToken(payload);

      return _ok(
        {
          user: verifyResult.data,
          token,
        },
        authResponse.success.loggedIn,
      );
    } catch (error) {
      throw handleServiceError(error, authResponse.errors.loginFailed);
    }
  }
}
