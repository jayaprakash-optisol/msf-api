import { describe, it, expect, vi, beforeAll } from 'vitest';
import express, { Application } from 'express';
import request from 'supertest';
import authRoutes from '../../src/routes/auth.routes';
import { mockLoginRequest, mockRegisterRequest } from '../mocks/data';
import { StatusCodes } from 'http-status-codes';

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
      getCurrentUser: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          data: {
            id: 1,
            email: 'test@example.com',
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

  describe('GET /api/auth/me', () => {
    it('should return current user details', async () => {
      const response = await api.get('/api/auth/me').expect(StatusCodes.OK);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: expect.any(Number),
          email: expect.any(String),
        }),
      });
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh token successfully', async () => {
      const response = await api.post('/api/auth/refresh-token').expect(StatusCodes.OK);

      expect(response.body).toEqual({
        success: true,
        message: 'Token refreshed successfully',
        data: expect.objectContaining({
          token: expect.any(String),
        }),
      });
    });
  });
});
