import { type Request } from 'express';

import { type ServiceResponse } from './common.interface';
import { type NewUser, type User } from './user.interface';

/**
 * Auth request type with user property
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
}

/**
 * JWT payload type
 */
export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  [key: string]: unknown;
}

/**
 * Auth service interface
 */
export interface IAuthService {
  /**
   * Register a new user
   */
  register(
    userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ServiceResponse<Omit<User, 'password'>>>;

  /**
   * Login user
   */
  login(email: string, password: string): Promise<ServiceResponse<{ user: User; token: string }>>;

  /**
   * Refresh token
   */
  refreshToken(userId: number): Promise<ServiceResponse<{ token: string }>>;
}
