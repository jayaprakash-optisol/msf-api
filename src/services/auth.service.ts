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
  NotFoundError,
  UnauthorizedError,
  _ok,
  handleServiceError,
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
        throw new BadRequestError(result.error ?? 'Failed to create user');
      }

      const { password: _password, ...userWithoutPassword } = result.data;
      return _ok(userWithoutPassword, 'User registered successfully', result.statusCode);
    } catch (error) {
      throw handleServiceError(error, 'User registration failed');
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
  ): Promise<ServiceResponse<{ user: User; token: string }>> {
    try {
      // Verify password
      const verifyResult = await this.userService.verifyPassword(email, password);

      if (!verifyResult.success || !verifyResult.data) {
        throw new UnauthorizedError(verifyResult.error ?? 'Invalid credentials');
      }

      // Generate JWT token

      const token = this.generateToken(verifyResult.data);

      return _ok(
        {
          user: verifyResult.data,
          token,
        },
        'Login successful',
      );
    } catch (error) {
      throw handleServiceError(error, 'Login failed');
    }
  }

  /**
   * Generate JWT token
   * @param user - The user to generate the token for
   * @returns The generated token
   */
  private generateToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwtUtil.generateToken(payload);
  }

  /**
   * Refresh token
   * @param userId - The ID of the user to refresh the token for
   * @returns A service response containing the refreshed token
   */
  async refreshToken(userId: number): Promise<ServiceResponse<{ token: string }>> {
    try {
      // Get user by ID
      const userResult = await this.userService.getUserById(userId);

      if (!userResult.success || !userResult.data) {
        throw new NotFoundError('User not found');
      }

      // Generate new token
      const token = this.generateToken(userResult.data);

      return _ok({ token }, 'Token refreshed successfully');
    } catch (error) {
      throw handleServiceError(error, 'Token refresh failed');
    }
  }
}
