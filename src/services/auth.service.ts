import {
  type IAuthService,
  type IUserService,
  type JwtPayload,
  type NewUser,
  type ServiceResponse,
  type User,
} from '../types';
import {
  _ok,
  authResponse,
  BadRequestError,
  handleServiceError,
  jwtUtil,
  UnauthorizedError,
  userResponse,
} from '../utils';

import { UserService } from './user.service';

export class AuthService implements IAuthService {
  private static instance: AuthService;
  private readonly userService: IUserService;

  private constructor() {
    this.userService = UserService.getInstance();
  }

  /**
   * Get a singleton instance
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
      // Check if the user already exists with the email
      await this.userService.checkEmailAvailability(userData.email);

      // Create a new user
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

  /**
   * Logout user by invalidating their session
   * @param token The JWT token to invalidate
   */
  async logout(token: string): Promise<ServiceResponse<null>> {
    try {
      await jwtUtil.revokeToken(token);
      return _ok(null, 'Logged out successfully');
    } catch (error) {
      throw handleServiceError(error, authResponse.errors.logoutFailed);
    }
  }

  /**
   * Logout from all devices by invalidating all user sessions
   * @param userId User's ID
   */
  async logoutAllDevices(userId: string): Promise<ServiceResponse<null>> {
    try {
      await jwtUtil.invalidateUserSessions(userId);
      return _ok(null, 'Logged out from all devices successfully');
    } catch (error) {
      throw handleServiceError(error, authResponse.errors.logoutFailed);
    }
  }
}
