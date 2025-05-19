import { describe, it, expect, vi, beforeAll } from 'vitest';
import express, { Application } from 'express';
import request from 'supertest';
import userRoutes from '../../src/routes/user.routes';
import { mockUsers, mockNewUser } from '../mocks/data';
import { StatusCodes } from 'http-status-codes';

// Mock the user controller methods
vi.mock('../../src/controllers/user.controller', () => {
  return {
    UserController: vi.fn().mockImplementation(() => ({
      getAllUsers: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          data: {
            items: mockUsers,
            total: mockUsers.length,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 10,
            totalPages: 1,
          },
        });
      }),
      getUserById: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          data: mockUsers[0],
        });
      }),
      createUser: vi.fn((req, res) => {
        return res.status(StatusCodes.CREATED).json({
          success: true,
          message: 'User created successfully',
          data: {
            id: 3,
            ...req.body,
            password: 'hashed_password',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }),
      updateUser: vi.fn((req, res) => {
        const userId = parseInt(req.params.id);
        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'User updated successfully',
          data: {
            ...mockUsers[0],
            ...req.body,
            id: userId, // Place id after spreads to avoid duplicate property
            updatedAt: new Date(),
          },
        });
      }),
      deleteUser: vi.fn((req, res) => {
        return res.status(StatusCodes.NO_CONTENT).end();
      }),
    })),
  };
});

// Mock middleware
vi.mock('../../src/middleware/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 1, email: 'admin@example.com', role: 'admin' };
    next();
  },
  authorize: () => (req, res, next) => next(),
}));

// Mock validators
vi.mock('../../src/validators/user.validator', () => ({
  validateRegisterUser: (req, res, next) => next(),
  validateUpdateUser: (req, res, next) => next(),
}));

describe('User Routes (Integration)', () => {
  let app: Application;
  let api: any;

  beforeAll(() => {
    // Create test Express application
    app = express();
    app.use(express.json());

    // Mount user routes on /api/users
    app.use('/api/users', userRoutes);

    // Create supertest agent
    api = request(app);
  });

  describe('GET /api/users', () => {
    it('should get all users with pagination', async () => {
      const response = await api
        .get('/api/users')
        .query({ page: 1, limit: 10 })
        .expect(StatusCodes.OK);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          items: expect.any(Array),
          total: expect.any(Number),
          page: 1,
          limit: 10,
          totalPages: expect.any(Number),
        }),
      });
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get a user by ID', async () => {
      const response = await api.get('/api/users/1').expect(StatusCodes.OK);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: expect.any(Number),
          email: expect.any(String),
        }),
      });
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const response = await api.post('/api/users').send(mockNewUser).expect(StatusCodes.CREATED);

      expect(response.body).toEqual({
        success: true,
        message: 'User created successfully',
        data: expect.objectContaining({
          id: expect.any(Number),
          email: mockNewUser.email,
        }),
      });
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update a user', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'User',
      };

      const response = await api.put('/api/users/1').send(updateData).expect(StatusCodes.OK);

      expect(response.body).toEqual({
        success: true,
        message: 'User updated successfully',
        data: expect.objectContaining({
          id: 1,
          firstName: 'Updated',
          lastName: 'User',
        }),
      });
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete a user', async () => {
      await api.delete('/api/users/1').expect(StatusCodes.NO_CONTENT);
      // No body validation needed for 204 No Content responses
    });
  });
});
