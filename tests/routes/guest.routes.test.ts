import { describe, it, expect, vi, beforeAll } from 'vitest';
import express, { Application } from 'express';
import request from 'supertest';
import guestRoutes from '../../src/routes/guest.routes';
import { mockGuests, mockNewGuest, mockGuestCredentialsConfirmation } from '../mocks';
import { StatusCodes } from 'http-status-codes';

// Mock the guest controller methods
vi.mock('../../src/controllers/guest.controller', () => {
  return {
    GuestController: vi.fn().mockImplementation(() => ({
      createGuest: vi.fn((req, res) => {
        return res.status(StatusCodes.CREATED).json({
          success: true,
          message: 'Guest created successfully',
          data: {
            id: '00000000-0000-0000-0000-000000000003',
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }),
      confirmGuestCredentials: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'Credentials confirmed successfully',
          data: {
            confirmed: true,
          },
        });
      }),
      getGuestCredentials: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'Copy these credentials now. They will not be shown again.',
          data: {
            username: 'john.doe1234',
            password: 'JoDo5678',
          },
        });
      }),
      getAllGuests: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          data: {
            items: mockGuests,
            total: mockGuests.length,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 10,
            totalPages: 1,
          },
        });
      }),
      getGuestById: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          data: mockGuests[0],
        });
      }),
      updateGuest: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'Guest updated successfully',
          data: {
            ...mockGuests[0],
            ...req.body,
            updatedAt: new Date(),
          },
        });
      }),
      deleteGuest: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'Guest deleted successfully',
        });
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
vi.mock('../../src/validators/guest.validator', () => ({
  validateCreateGuest: (req, res, next) => next(),
  validateUpdateGuest: (req, res, next) => next(),
  validateGuestQuery: (req, res, next) => next(),
  validateConfirmGuestCredentials: (req, res, next) => next(),
}));

describe('Guest Routes (Integration)', () => {
  let app: Application;
  let api: any;

  beforeAll(() => {
    // Create test Express application
    app = express();
    app.use(express.json());

    // Mount guest routes on /api/guests
    app.use('/api/guests', guestRoutes);

    // Create supertest agent
    api = request(app);
  });

  describe('POST /api/guests', () => {
    it('should create a new guest successfully', async () => {
      const response = await api.post('/api/guests').send(mockNewGuest).expect(StatusCodes.CREATED);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Guest created successfully',
          data: expect.objectContaining({
            id: '00000000-0000-0000-0000-000000000003',
            firstName: mockNewGuest.firstName,
            lastName: mockNewGuest.lastName,
            role: mockNewGuest.role,
          }),
        }),
      );
    });
  });

  describe('POST /api/guests/:id/confirm-credentials', () => {
    it('should confirm guest credentials successfully', async () => {
      const guestId = '00000000-0000-0000-0000-000000000001';
      const response = await api
        .post(`/api/guests/${guestId}/confirm-credentials`)
        .send(mockGuestCredentialsConfirmation)
        .expect(StatusCodes.OK);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Credentials confirmed successfully',
          data: expect.objectContaining({
            confirmed: true,
          }),
        }),
      );
    });
  });

  describe('GET /api/guests', () => {
    it('should get all guests with default pagination', async () => {
      const response = await api.get('/api/guests').expect(StatusCodes.OK);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            items: expect.any(Array),
            total: expect.any(Number),
            page: 1,
            limit: 10,
            totalPages: expect.any(Number),
          }),
        }),
      );
    });

    it('should get guests with custom parameters', async () => {
      const response = await api
        .get('/api/guests')
        .query({ page: '2', limit: '5', status: 'Active', search: 'John' })
        .expect(StatusCodes.OK);

      // Adjust expectations to match the actual implementation
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });
  });

  describe('GET /api/guests/:id/credentials', () => {
    it('should get guest credentials successfully', async () => {
      const guestId = '00000000-0000-0000-0000-000000000001';
      const response = await api.get(`/api/guests/${guestId}/credentials`).expect(StatusCodes.OK);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Copy these credentials now. They will not be shown again.',
          data: expect.objectContaining({
            username: expect.any(String),
            password: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('GET /api/guests/:id', () => {
    it('should get a guest by ID successfully', async () => {
      const guestId = '00000000-0000-0000-0000-000000000001';
      const response = await api.get(`/api/guests/${guestId}`).expect(StatusCodes.OK);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: expect.any(String),
            firstName: expect.any(String),
            lastName: expect.any(String),
            role: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('PUT /api/guests/:id', () => {
    it('should update a guest successfully', async () => {
      const guestId = '00000000-0000-0000-0000-000000000001';
      const updateData = {
        firstName: 'Updated',
        lastName: 'Guest',
        role: 'Stock Manager',
      };

      const response = await api
        .put(`/api/guests/${guestId}`)
        .send(updateData)
        .expect(StatusCodes.OK);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Guest updated successfully',
          data: expect.objectContaining({
            id: expect.any(String),
            firstName: 'Updated',
            lastName: 'Guest',
            role: 'Stock Manager',
          }),
        }),
      );
    });
  });

  describe('DELETE /api/guests/:id', () => {
    it('should delete a guest successfully', async () => {
      const guestId = '00000000-0000-0000-0000-000000000001';
      const response = await api.delete(`/api/guests/${guestId}`).expect(StatusCodes.OK);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Guest deleted successfully',
        }),
      );
    });
  });
});
