import { type NextFunction, type Response } from 'express';

import { type AuthRequest } from '../types';
import { ForbiddenError, jwtUtil, UnauthorizedError } from '../utils';

// Verify JWT token from the Authorization header
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = await jwtUtil.verifyToken(token);

    req.user = {
      id: decoded.userId.toString(),
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch {
    next(new UnauthorizedError('Invalid token'));
  }
};

// Check if user has required role
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
