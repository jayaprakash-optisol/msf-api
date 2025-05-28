import { describe, it, expect, vi, beforeAll } from 'vitest';
import express, { Application } from 'express';
import request from 'supertest';
import authRoutes from '../../src/routes/auth.routes';
import { mockLoginRequest, mockRegisterRequest } from '../mocks';
import { StatusCodes } from 'http-status-codes';

// Mock Redis client to prevent connection issues
vi.mock('../../src/config/redis.config', () => ({
  getRedisClient: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue('OK'),
  })),
  initRedisClient: vi.fn(),
  closeRedisClient: vi.fn(),
}));

// Mock utils to prevent Redis connection
vi.mock('../../src/utils', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  getEnv: vi.fn().mockImplementation((key: string) => {
    if (key === 'REDIS_HOST') return 'localhost';
    if (key === 'REDIS_PORT') return '6379';
    if (key === 'REDIS_PASSWORD') return undefined;
    if (key === 'REDIS_SSL_ENABLED') return false;
    return undefined;
  }),
  isDevelopment: vi.fn().mockReturnValue(true),
  isProduction: vi.fn().mockReturnValue(false),
  isTest: vi.fn().mockReturnValue(true),
}));

// Mock the auth controller methods
vi.mock('../../src/controllers/auth.controller', () => {
  return {
    AuthController: vi.fn().mockImplementation(() => ({
      register: vi.fn((req, res) => {
        return res.status(StatusCodes.CREATED).json({
          success: true,
          message: 'User registered successfully',
          data: {
            id: 1,
            email: req.body.email,
          },
        });
      }),
      login: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'Login successful',
          data: {
            user: {
              id: 1,
              email: req.body.email,
            },
            token: 'mock_token',
          },
        });
      }),
      logout: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'Logged out successfully',
          data: null,
        });
      }),
      logoutAllDevices: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'Logged out from all devices successfully',
          data: null,
        });
      }),
      getCurrentUser: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'Current user data retrieved successfully',
          data: {
            userId: 1,
            email: 'test@example.com',
            role: 'user',
          },
        });
      }),
      refreshToken: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'Token refreshed successfully',
          data: {
            token: 'new_mock_token',
          },
        });
      }),
    })),
  };
});

// Mock middleware
vi.mock('../../src/middleware/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 1, email: 'test@example.com', role: 'user' };
    next();
  },
  authorize: () => (req, res, next) => next(),
}));

// Mock validators
vi.mock('../../src/validators/user.validator', () => ({
  validateLoginUser: (req, res, next) => next(),
  validateRegisterUser: (req, res, next) => next(),
}));

describe('Auth Routes (Integration)', () => {
  let app: Application;
  let api: any;

  beforeAll(() => {
    // Create test Express application
    app = express();
    app.use(express.json());

    // Mount auth routes on /api/auth
    app.use('/api/auth', authRoutes);

    // Create supertest agent
    api = request(app);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await api
        .post('/api/auth/register')
        .send(mockRegisterRequest)
        .expect(StatusCodes.CREATED);

      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully',
        data: expect.objectContaining({
          id: expect.any(Number),
          email: mockRegisterRequest.email,
        }),
      });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const response = await api
        .post('/api/auth/login')
        .send(mockLoginRequest)
        .expect(StatusCodes.OK);

      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        data: expect.objectContaining({
          user: expect.any(Object),
          token: expect.any(String),
        }),
      });
    });
  });
});
