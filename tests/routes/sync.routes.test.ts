import { describe, it, expect, vi, beforeAll } from 'vitest';
import express, { Application } from 'express';
import request from 'supertest';
import { StatusCodes } from 'http-status-codes';
import { SyncTableName } from '../../src/types';

// Sample data for testing with string dates instead of Date objects
const mockSyncData = {
  tasks: [
    { id: 1, name: 'Task 1', updatedAt: '2023-01-02T00:00:00.000Z' },
    { id: 2, name: 'Task 2', updatedAt: '2023-01-03T00:00:00.000Z' },
  ],
  parcels: [
    { id: 1, trackingNumber: 'TRK001', updatedAt: '2023-01-02T00:00:00.000Z' },
    { id: 2, trackingNumber: 'TRK002', updatedAt: '2023-01-03T00:00:00.000Z' },
  ],
  products: [
    { id: 1, name: 'Product 1', updatedAt: '2023-01-02T00:00:00.000Z' },
    { id: 2, name: 'Product 2', updatedAt: '2023-01-03T00:00:00.000Z' },
  ],
};

// Mock the sync controller
vi.mock('../../src/controllers/sync.controller', () => {
  return {
    SyncController: vi.fn().mockImplementation(() => ({
      sync: vi.fn((req, res, next) => {
        const tableName = req.query.tableName as SyncTableName;
        const lastSync = req.query.lastSync ? new Date(req.query.lastSync as string) : new Date(0);

        if (!Object.keys(mockSyncData).includes(tableName)) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: `Invalid table name: ${tableName}`,
          });
        }

        return res.status(StatusCodes.OK).json({
          success: true,
          message: `Found ${mockSyncData[tableName].length} ${tableName} records updated after ${lastSync.toISOString()}`,
          data: mockSyncData[tableName],
        });
      }),
    })),
  };
});

// Import routes after mocking
import syncRoutes from '../../src/routes/sync.routes';

// Mock middleware
vi.mock('../../src/middleware', () => ({
  authenticateDevice: (req, res, next) => {
    req.user = { id: 1, email: 'admin@example.com', role: 'admin' };
    next();
  },
  rateLimiter: () => (req, res, next) => next(),
}));

// Mock validators
vi.mock('../../src/validators', () => ({
  validateSyncQuery: (req, res, next) => next(),
  validateManualSync: (req, res, next) => next(),
  validateResetLastUpdate: (req, res, next) => next(),
}));

describe('Sync Routes (Integration)', () => {
  let app: Application;
  let api: any;

  beforeAll(() => {
    // Create test Express application
    app = express();
    app.use(express.json());

    // Mount sync routes on /api/sync
    app.use('/api/sync', syncRoutes);

    // Create supertest agent
    api = request(app);
  });

  describe('GET /api/sync', () => {
    it('should sync data for a valid table', async () => {
      const response = await api
        .get('/api/sync')
        .query({
          tableName: 'tasks',
          lastSync: '2023-01-01',
        })
        .expect(StatusCodes.OK);

      expect(response.body).toEqual({
        success: true,
        message: expect.stringContaining('Found 2 tasks records updated after'),
        data: mockSyncData.tasks,
      });
    });

    it('should return 400 for invalid table name', async () => {
      const response = await api
        .get('/api/sync')
        .query({
          tableName: 'invalidTable',
          lastSync: '2023-01-01',
        })
        .expect(StatusCodes.BAD_REQUEST);

      expect(response.body.success).toBe(false);
    });

    it('should handle requests without lastSync parameter', async () => {
      const response = await api
        .get('/api/sync')
        .query({ tableName: 'tasks' })
        .expect(StatusCodes.OK);

      expect(response.body).toEqual({
        success: true,
        message: expect.stringContaining('Found 2 tasks records updated after'),
        data: mockSyncData.tasks,
      });
    });

    it('should handle ISO date format for lastSync', async () => {
      const response = await api
        .get('/api/sync')
        .query({
          tableName: 'tasks',
          lastSync: new Date('2023-01-01').toISOString(),
        })
        .expect(StatusCodes.OK);

      expect(response.body).toEqual({
        success: true,
        message: expect.stringContaining('Found 2 tasks records updated after'),
        data: mockSyncData.tasks,
      });
    });
  });
});
