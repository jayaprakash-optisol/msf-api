import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncTableName } from '../../src/types';

// Create a self-contained mock implementation
const createMockDb = () => {
  const mockOrderBy = vi.fn();
  const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  return {
    mockSelect,
    mockFrom,
    mockWhere,
    mockOrderBy,
  };
};

// Create our mock functions
const dbMocks = createMockDb();

// Mock the database module
vi.mock('../../src/config/database.config', () => ({
  db: {
    select: () => ({
      from: table => ({
        where: () => ({
          orderBy: () => {
            // This is a trick to make the mock accessible
            // The actual implementation will be provided by the test
            return dbMocks.mockOrderBy();
          },
        }),
      }),
    }),
  },
}));

// Import after mocks
import { SyncService } from '../../src/services/sync.service';

describe('SyncService', () => {
  let syncService: SyncService;
  const { mockOrderBy } = dbMocks;

  // Sample mock data for each table
  const mockTaskData = [
    { id: 1, name: 'Task 1', updatedAt: new Date('2023-01-02') },
    { id: 2, name: 'Task 2', updatedAt: new Date('2023-01-03') },
  ];

  const mockParcelData = [
    { id: 1, trackingNumber: 'TRK001', updatedAt: new Date('2023-01-02') },
    { id: 2, trackingNumber: 'TRK002', updatedAt: new Date('2023-01-03') },
  ];

  const mockProductData = [
    { id: 1, name: 'Product 1', updatedAt: new Date('2023-01-02') },
    { id: 2, name: 'Product 2', updatedAt: new Date('2023-01-03') },
  ];

  beforeEach(() => {
    vi.resetAllMocks();

    // Reset the singleton instance for clean testing
    // @ts-ignore - accessing private static field for testing
    SyncService.instance = undefined;

    syncService = SyncService.getInstance();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = SyncService.getInstance();
      const instance2 = SyncService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(SyncService);
    });
  });

  describe('fetchAllAfter', () => {
    it('should fetch tasks updated after a specific date', async () => {
      // Setup date for testing
      const updatedAfter = new Date('2023-01-01');

      // Mock orderBy to return data
      mockOrderBy.mockResolvedValueOnce(mockTaskData);

      // Call the service method
      const result = await syncService.fetchAllAfter<(typeof mockTaskData)[0]>(
        'tasks',
        updatedAfter,
      );

      // Verify result
      expect(result).toEqual(mockTaskData);
    });

    it('should fetch parcels updated after a specific date', async () => {
      // Setup date for testing
      const updatedAfter = new Date('2023-01-01');

      // Mock orderBy to return data
      mockOrderBy.mockResolvedValueOnce(mockParcelData);

      // Call the service method
      const result = await syncService.fetchAllAfter<(typeof mockParcelData)[0]>(
        'parcels',
        updatedAfter,
      );

      // Verify result
      expect(result).toEqual(mockParcelData);
    });

    it('should fetch products updated after a specific date', async () => {
      // Setup date for testing
      const updatedAfter = new Date('2023-01-01');

      // Mock orderBy to return data
      mockOrderBy.mockResolvedValueOnce(mockProductData);

      // Call the service method
      const result = await syncService.fetchAllAfter<(typeof mockProductData)[0]>(
        'products',
        updatedAfter,
      );

      // Verify result
      expect(result).toEqual(mockProductData);
    });

    it('should return empty array when no updates found', async () => {
      // Setup date for testing
      const updatedAfter = new Date('2023-01-01');

      // Mock empty database response
      mockOrderBy.mockResolvedValueOnce([]);

      // Call the service method
      const result = await syncService.fetchAllAfter<any>('tasks', updatedAfter);

      // Verify result is empty array
      expect(result).toEqual([]);
    });

    it('should handle when updatedAfter is current date (no updates expected)', async () => {
      // Setup current date for testing
      const updatedAfter = new Date();

      // Mock empty database response
      mockOrderBy.mockResolvedValueOnce([]);

      // Call the service method
      const result = await syncService.fetchAllAfter<any>('tasks', updatedAfter);

      // Verify result is empty array
      expect(result).toEqual([]);
    });

    it('should work with all supported table names', async () => {
      const updatedAfter = new Date('2023-01-01');
      const supportedTables: SyncTableName[] = [
        'tasks',
        'parcels',
        'parcelItems',
        'products',
        'shipments',
        'users',
        'guests',
      ];

      // Test each supported table
      for (const tableName of supportedTables) {
        // Reset mocks for each iteration
        vi.resetAllMocks();

        // Mock database response
        mockOrderBy.mockResolvedValueOnce([{ id: 1, updatedAt: new Date() }]);

        // Call the service method
        const result = await syncService.fetchAllAfter(tableName, updatedAfter);

        // Verify result has expected length
        expect(result).toHaveLength(1);
      }
    });

    it('should handle database errors correctly', async () => {
      const updatedAfter = new Date('2023-01-01');

      // Mock a database error
      const dbError = new Error('Database connection error');
      mockOrderBy.mockRejectedValueOnce(dbError);

      // Call the service method and expect error to be thrown
      await expect(syncService.fetchAllAfter('tasks', updatedAfter)).rejects.toThrow(
        'Database connection error',
      );
    });
  });
});
