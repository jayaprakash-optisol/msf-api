import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceService } from '../../src/services/device.service';
import { db } from '../../src/config/database.config';
import crypto from 'crypto';

// Use vi.hoisted to ensure mocks are available before imports
const mockErrorClasses = vi.hoisted(() => {
  class MockBadRequestError extends Error {
    constructor(message) {
      super(message);
      this.name = 'BadRequestError';
      this.statusCode = 400;
      this.isOperational = true;
    }
  }

  class MockNotFoundError extends Error {
    constructor(message) {
      super(message);
      this.name = 'NotFoundError';
      this.statusCode = 404;
      this.isOperational = true;
    }
  }

  return {
    BadRequestError: MockBadRequestError,
    NotFoundError: MockNotFoundError,
  };
});

// Use vi.hoisted to ensure mocks are available before imports
const mockUtils = vi.hoisted(() => {
  return {
    _ok: vi.fn().mockImplementation((data, message) => ({
      success: true,
      message,
      data,
      statusCode: 200,
    })),
    encrypt: vi.fn().mockReturnValue('encrypted-api-key'),
    decrypt: vi.fn().mockReturnValue('mock-api-key'),
    handleServiceError: vi.fn().mockImplementation((error, message) => {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(message || String(error));
    }),
  };
});

// Mock crypto
vi.mock('crypto', () => {
  return {
    default: {
      randomBytes: vi.fn().mockReturnValue({
        toString: vi.fn().mockReturnValue('mock-api-key'),
      }),
    },
    randomBytes: vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue('mock-api-key'),
    }),
  };
});

// Mock database
vi.mock('../../src/config/database.config', () => {
  // Create a more flexible mock for select that can be customized per test
  const mockSelect = vi.fn().mockImplementation(() => {
    const mockFrom = vi.fn().mockImplementation(() => {
      const mockWhere = vi.fn().mockImplementation(() => {
        const mockLimit = vi.fn().mockImplementation(() => []);
        return { limit: mockLimit };
      });
      return { where: mockWhere };
    });
    return { from: mockFrom };
  });

  // Create a more flexible mock for insert that can be customized per test
  const mockInsert = vi.fn().mockImplementation(() => {
    const mockValues = vi.fn().mockImplementation(() => {
      const mockReturning = vi.fn().mockResolvedValue([
        {
          id: 'mock-id',
          deviceId: 'mock-device-id',
          name: 'Mock Device',
          type: 'mobile',
          apiKey: 'mock-api-key',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      return { returning: mockReturning };
    });
    return { values: mockValues };
  });

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
    },
  };
});

// Mock utils module
vi.mock('../../src/utils', () => {
  return {
    _ok: mockUtils._ok,
    encrypt: mockUtils.encrypt,
    decrypt: mockUtils.decrypt,
    handleServiceError: mockUtils.handleServiceError,
    BadRequestError: mockErrorClasses.BadRequestError,
    NotFoundError: mockErrorClasses.NotFoundError,
  };
});

describe('DeviceService', () => {
  let deviceService: DeviceService;

  beforeEach(() => {
    vi.resetAllMocks();

    // Reset singleton
    // @ts-ignore
    DeviceService.instance = undefined;
    deviceService = DeviceService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DeviceService.getInstance();
      const instance2 = DeviceService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(DeviceService);
    });
  });

  describe('_ensureDevice', () => {
    it('should check if device exists and throw error if it does', async () => {
      // Setup mock for db.select to return an existing device
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([{ id: 'existing-id' }]),
          }),
        }),
      } as any);

      // Call the private method directly
      await expect((deviceService as any)._ensureDevice('existing-device-id')).rejects.toThrow('Device with this ID already exists');
    });

    it('should not throw error if device does not exist', async () => {
      // Setup mock for db.select to return no devices
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([]),
          }),
        }),
      } as any);

      // Call the private method directly
      await expect((deviceService as any)._ensureDevice('new-device-id')).resolves.not.toThrow();
    });

    it('should handle database errors', async () => {
      // Setup mock for db.select to throw an error
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      // Call the private method directly
      await expect((deviceService as any)._ensureDevice('test-device-id')).rejects.toThrow('Database error');
    });
  });

  describe('registerDevice', () => {
    it('should register a new device successfully', async () => {
      // Create a spy on the private _ensureDevice method
      const ensureDeviceSpy = vi.spyOn(deviceService as any, '_ensureDevice').mockResolvedValueOnce(undefined);

      // Mock crypto.randomBytes
      vi.mocked(crypto.randomBytes).mockReturnValueOnce({
        toString: vi.fn().mockReturnValueOnce('mock-api-key'),
      } as any);

      // Mock encrypt
      vi.mocked(mockUtils.encrypt).mockReturnValueOnce('encrypted-api-key');

      // Mock db.insert
      const mockDevice = {
        id: 'mock-id',
        deviceId: 'test-device-id',
        name: 'Test Device',
        type: 'mobile',
        apiKey: 'mock-api-key',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.insert).mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([mockDevice]),
        }),
      } as any);

      // Mock _ok
      const mockResponse = {
        success: true,
        message: 'Device registered successfully',
        data: {
          ...mockDevice,
          apiKey: 'encrypted-api-key',
        },
        statusCode: 201,
      };

      vi.mocked(mockUtils._ok).mockReturnValueOnce(mockResponse);

      // Test data
      const deviceData = {
        deviceId: 'test-device-id',
        name: 'Test Device',
        type: 'mobile',
      };

      // Call the method
      const result = await deviceService.registerDevice(deviceData);

      // Verify crypto.randomBytes was called to generate API key
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);

      // Verify encrypt was called with the generated API key
      expect(mockUtils.encrypt).toHaveBeenCalledWith('mock-api-key');

      // Verify db.insert was called
      expect(db.insert).toHaveBeenCalled();

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.message).toBe('Device registered successfully');
      expect(result.data).toEqual(expect.objectContaining({
        deviceId: 'test-device-id',
        name: 'Test Device',
        type: 'mobile',
        apiKey: 'encrypted-api-key',
      }));
    });

    it('should throw BadRequestError if device already exists', async () => {
      // Setup mock for _ensureDevice (device exists)
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([{ id: 'existing-id' }]),
          }),
        }),
      }));

      const deviceData = {
        deviceId: 'existing-device-id',
        name: 'Existing Device',
        type: 'mobile',
      };

      await expect(deviceService.registerDevice(deviceData)).rejects.toThrow('Device with this ID already exists');
    });

    it('should throw BadRequestError if device creation fails', async () => {
      // Setup mock for _ensureDevice (device doesn't exist)
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([]),
          }),
        }),
      }));

      // Setup mock for db.insert (returns empty array)
      vi.mocked(db.insert).mockImplementationOnce(() => ({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }));

      const deviceData = {
        deviceId: 'test-device-id',
        name: 'Test Device',
        type: 'mobile',
      };

      await expect(deviceService.registerDevice(deviceData)).rejects.toThrow('Failed to create device');
    });

    it('should throw BadRequestError if newDevice is null', async () => {
      // Setup mock for _ensureDevice (device doesn't exist)
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([]),
          }),
        }),
      }));

      // Setup mock for db.insert (returns null for newDevice)
      vi.mocked(db.insert).mockImplementationOnce(() => ({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([null]),
        }),
      }));

      const deviceData = {
        deviceId: 'test-device-id',
        name: 'Test Device',
        type: 'mobile',
      };

      await expect(deviceService.registerDevice(deviceData)).rejects.toThrow('Failed to create device');
    });

    it('should throw BadRequestError if returning array is empty', async () => {
      // Setup mock for _ensureDevice (device doesn't exist)
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([]),
          }),
        }),
      }));

      // Setup mock for db.insert (returns empty array)
      vi.mocked(db.insert).mockImplementationOnce(() => ({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }));

      const deviceData = {
        deviceId: 'test-device-id',
        name: 'Test Device',
        type: 'mobile',
      };

      await expect(deviceService.registerDevice(deviceData)).rejects.toThrow('Failed to create device');
    });

    it('should throw BadRequestError if db.insert returns undefined in array', async () => {
      // Setup mock for _ensureDevice (device doesn't exist)
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([]),
          }),
        }),
      }));

      // Setup mock for db.insert to return an array with undefined
      vi.mocked(db.insert).mockImplementationOnce(() => ({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([undefined]),
        }),
      }));

      const deviceData = {
        deviceId: 'test-device-id',
        name: 'Test Device',
        type: 'mobile',
      };

      await expect(deviceService.registerDevice(deviceData)).rejects.toThrow('Failed to create device');
    });

    it('should throw BadRequestError if db.insert returns empty object in array', async () => {
      // Setup mock for _ensureDevice (device doesn't exist)
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([]),
          }),
        }),
      }));

      // Setup mock for db.insert to return an array with an empty object
      vi.mocked(db.insert).mockImplementationOnce(() => ({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{}]),
        }),
      }));

      const deviceData = {
        deviceId: 'test-device-id',
        name: 'Test Device',
        type: 'mobile',
      };

      await expect(deviceService.registerDevice(deviceData)).rejects.toThrow('Failed to create device');
    });

    it('should handle database errors during device registration', async () => {
      // Setup mock for _ensureDevice (throws error)
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const deviceData = {
        deviceId: 'test-device-id',
        name: 'Test Device',
        type: 'mobile',
      };

      await expect(deviceService.registerDevice(deviceData)).rejects.toThrow('Database error');
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key successfully when valid', async () => {
      // Setup mock for db.select (device exists)
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([
              {
                id: 'mock-id',
                deviceId: 'test-device-id',
                apiKey: 'mock-api-key',
              },
            ]),
          }),
        }),
      }));

      // Mock _ok to return a success response
      const mockOkResponse = {
        success: true,
        message: 'API key is valid',
        data: true,
        statusCode: 200,
      };
      vi.mocked(mockUtils._ok).mockReturnValueOnce(mockOkResponse);

      const result = await deviceService.validateApiKey('test-device-id', 'encrypted-api-key');

      // Verify decrypt was called with the provided API key
      expect(mockUtils.decrypt).toHaveBeenCalledWith('encrypted-api-key');

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.message).toBe('API key is valid');
      expect(result.data).toBe(true);
    });

    it('should return false when API key is invalid', async () => {
      // Setup mock for db.select (device exists)
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([
              {
                id: 'mock-id',
                deviceId: 'test-device-id',
                apiKey: 'different-api-key',
              },
            ]),
          }),
        }),
      }));

      // Mock decrypt to return a different key
      vi.mocked(mockUtils.decrypt).mockReturnValueOnce('wrong-api-key');

      // Mock _ok to return a failure response
      const mockOkResponse = {
        success: true,
        message: 'Invalid API key',
        data: false,
        statusCode: 200,
      };
      vi.mocked(mockUtils._ok).mockReturnValueOnce(mockOkResponse);

      const result = await deviceService.validateApiKey('test-device-id', 'encrypted-api-key');

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.message).toBe('Invalid API key');
      expect(result.data).toBe(false);
    });

    it('should throw NotFoundError if device not found', async () => {
      // Setup mock for db.select (device not found)
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([]),
          }),
        }),
      }));

      await expect(deviceService.validateApiKey('non-existent-device-id', 'encrypted-api-key')).rejects.toThrow('Device not found');
    });

    it('should handle database errors during API key validation', async () => {
      // Setup mock for db.select (throws error)
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      await expect(deviceService.validateApiKey('test-device-id', 'encrypted-api-key')).rejects.toThrow('Database error');
    });
  });

  describe('getDeviceById', () => {
    it('should get device by ID successfully', async () => {
      // Setup mock for db.select (device exists)
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([
              {
                id: 'mock-id',
                deviceId: 'test-device-id',
                name: 'Test Device',
                type: 'mobile',
                apiKey: 'mock-api-key',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      }));

      // Mock _ok to return a success response
      const deviceWithoutApiKey = {
        id: 'mock-id',
        deviceId: 'test-device-id',
        name: 'Test Device',
        type: 'mobile',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOkResponse = {
        success: true,
        message: 'Device found',
        data: deviceWithoutApiKey,
        statusCode: 200,
      };

      vi.mocked(mockUtils._ok).mockReturnValueOnce(mockOkResponse);

      const result = await deviceService.getDeviceById('mock-id');

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.message).toBe('Device found');
      expect(result.data).toEqual(expect.objectContaining({
        id: 'mock-id',
        deviceId: 'test-device-id',
        name: 'Test Device',
        type: 'mobile',
      }));
      expect(result.data).not.toHaveProperty('apiKey');
    });

    it('should throw NotFoundError if device not found by ID', async () => {
      // Setup mock for db.select (device not found)
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([]),
          }),
        }),
      }));

      await expect(deviceService.getDeviceById('non-existent-id')).rejects.toThrow('Device not found');
    });

    it('should handle database errors when getting device by ID', async () => {
      // Setup mock for db.select (throws error)
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      await expect(deviceService.getDeviceById('mock-id')).rejects.toThrow('Database error');
    });
  });

  describe('getDeviceByDeviceId', () => {
    it('should get device by device ID successfully', async () => {
      // Setup mock for db.select (device exists)
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([
              {
                id: 'mock-id',
                deviceId: 'test-device-id',
                name: 'Test Device',
                type: 'mobile',
                apiKey: 'mock-api-key',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      }));

      // Mock _ok to return a success response
      const deviceWithoutApiKey = {
        id: 'mock-id',
        deviceId: 'test-device-id',
        name: 'Test Device',
        type: 'mobile',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOkResponse = {
        success: true,
        message: 'Device found',
        data: deviceWithoutApiKey,
        statusCode: 200,
      };

      vi.mocked(mockUtils._ok).mockReturnValueOnce(mockOkResponse);

      const result = await deviceService.getDeviceByDeviceId('test-device-id');

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.message).toBe('Device found');
      expect(result.data).toEqual(expect.objectContaining({
        id: 'mock-id',
        deviceId: 'test-device-id',
        name: 'Test Device',
        type: 'mobile',
      }));
      expect(result.data).not.toHaveProperty('apiKey');
    });

    it('should throw NotFoundError if device not found by device ID', async () => {
      // Setup mock for db.select (device not found)
      vi.mocked(db.select).mockImplementationOnce(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([]),
          }),
        }),
      }));

      await expect(deviceService.getDeviceByDeviceId('non-existent-device-id')).rejects.toThrow('Device not found');
    });

    it('should handle database errors when getting device by device ID', async () => {
      // Setup mock for db.select (throws error)
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      await expect(deviceService.getDeviceByDeviceId('test-device-id')).rejects.toThrow('Database error');
    });
  });
});
