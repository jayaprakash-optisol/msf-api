import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncController } from '../../src/controllers/sync.controller';
import { SyncService } from '../../src/services/sync.service';
import { StatusCodes } from 'http-status-codes';
import { createMockRequest, createMockResponse, createMockNext } from '../utils/test-utils';
import { BadRequestError, NotFoundError } from '../../src/utils/error.util';
import { SyncTableName } from '../../src/types';

// Mock the asyncHandler middleware
vi.mock('../../src/middleware/async.middleware', () => ({
  asyncHandler: vi.fn(fn => {
    return async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }),
}));

// Mock the service layer
vi.mock('../../src/services/sync.service', () => {
  const syncServiceMock = {
    fetchAllAfter: vi.fn(),
  };

  return {
    SyncService: {
      getInstance: vi.fn(() => syncServiceMock),
    },
  };
});

// Sample sync data for testing
const mockSyncData = {
  tasks: [
    { id: 1, name: 'Task 1', updatedAt: new Date('2023-01-02') },
    { id: 2, name: 'Task 2', updatedAt: new Date('2023-01-03') },
  ],
  products: [
    { id: 1, name: 'Product 1', updatedAt: new Date('2023-01-02') },
    { id: 2, name: 'Product 2', updatedAt: new Date('2023-01-03') },
  ],
};

describe('SyncController', () => {
  let controller: SyncController;
  let syncService: any;

  beforeEach(() => {
    vi.resetAllMocks();
    syncService = SyncService.getInstance();
    controller = new SyncController();
  });

  describe('sync', () => {
    it('should sync data for a valid table successfully', async () => {
      // Setup mocks
      const tableName: SyncTableName = 'tasks';
      const lastSyncDate = new Date('2023-01-01').toISOString();
      const req = createMockRequest({
        query: {
          tableName,
          lastSync: lastSyncDate,
        },
      });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      syncService.fetchAllAfter.mockResolvedValueOnce(mockSyncData.tasks);

      // Call the controller method
      await controller.sync(req, res, next);

      // Verify service was called with correct data
      expect(syncService.fetchAllAfter).toHaveBeenCalledWith(tableName, new Date(lastSyncDate));

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockSyncData.tasks,
        }),
      );
    });

    it('should handle requests without lastSyncDate parameter', async () => {
      // Setup mocks
      const tableName: SyncTableName = 'tasks';
      const req = createMockRequest({
        query: {
          tableName,
        },
      });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      syncService.fetchAllAfter.mockResolvedValueOnce(mockSyncData.tasks);

      // Call the controller method
      await controller.sync(req, res, next);

      // Verify service was called with default date
      expect(syncService.fetchAllAfter).toHaveBeenCalledWith(tableName, expect.any(Date));

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });

    it('should handle an invalid table name', async () => {
      // Setup mocks
      const tableName = 'invalidTable' as SyncTableName;
      const req = createMockRequest({
        query: {
          tableName,
        },
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error for invalid table
      syncService.fetchAllAfter.mockRejectedValueOnce(
        new Error(`Invalid table name: ${tableName}`),
      );

      // Call the controller method
      await controller.sync(req, res, next);

      // Verify error was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe(`Invalid table name: ${tableName}`);
    });

    it('should handle service errors', async () => {
      // Setup mocks
      const tableName: SyncTableName = 'tasks';
      const req = createMockRequest({
        query: {
          tableName,
        },
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw database error
      syncService.fetchAllAfter.mockRejectedValueOnce(new Error('Database connection error'));

      // Call the controller method
      await controller.sync(req, res, next);

      // Verify error was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Database connection error');
    });
  });

  // NOTE: Testing with syncMultiple is removed as it doesn't exist in the SyncController
  // The controller seems to use only the sync method based on the route error
  // and the linter errors
});
