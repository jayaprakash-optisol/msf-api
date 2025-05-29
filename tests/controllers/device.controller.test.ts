import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceController } from '../../src/controllers/device.controller';
import { DeviceService } from '../../src/services/device.service';
import { StatusCodes } from 'http-status-codes';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../utils/test-utils';
import { UnauthorizedError } from '../../src/utils/error.util';

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
vi.mock('../../src/services/device.service', () => {
  const deviceServiceMock = {
    registerDevice: vi.fn(),
    validateApiKey: vi.fn(),
    getDeviceById: vi.fn(),
  };

  return {
    DeviceService: {
      getInstance: vi.fn(() => deviceServiceMock),
    },
  };
});

// Mock device data
const mockDeviceData = {
  deviceId: 'test-device-id',
  name: 'Test Device',
  type: 'mobile',
};

describe('DeviceController', () => {
  let controller: DeviceController;
  let deviceService: any;

  beforeEach(() => {
    vi.resetAllMocks();
    deviceService = DeviceService.getInstance();
    controller = new DeviceController();
  });

  describe('constructor', () => {
    it('should initialize deviceService', () => {
      // This test ensures that lines 11-12 are covered
      expect(DeviceService.getInstance).toHaveBeenCalled();
      expect(controller).toBeInstanceOf(DeviceController);
    });
  });

  describe('registerDevice', () => {
    it('should register a device successfully', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockDeviceData });
      const { res, statusSpy, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      deviceService.registerDevice.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.CREATED,
        data: {
          id: 'mock-id',
          ...mockDeviceData,
          apiKey: 'encrypted-api-key',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        message: 'Device registered successfully',
      });

      // Call the controller method
      await controller.registerDevice(req, res, next);

      // Verify service was called
      expect(deviceService.registerDevice).toHaveBeenCalledWith(mockDeviceData);

      // Verify response
      expect(statusSpy).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'mock-id',
            deviceId: mockDeviceData.deviceId,
          }),
        }),
      );
    });

    it('should pass errors to next middleware', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockDeviceData });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      const error = new Error('Registration failed');
      deviceService.registerDevice.mockRejectedValueOnce(error);

      // Call the controller method
      await controller.registerDevice(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getDeviceById', () => {
    it('should get a device by ID successfully', async () => {
      // Setup mocks
      const req = createMockRequest({ params: { id: 'mock-id' } });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      deviceService.getDeviceById.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'mock-id',
          deviceId: mockDeviceData.deviceId,
          name: mockDeviceData.name,
          type: mockDeviceData.type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        message: 'Device found',
      });

      // Call the controller method
      await controller.getDeviceById(req, res, next);

      // Verify service was called
      expect(deviceService.getDeviceById).toHaveBeenCalledWith('mock-id');

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'mock-id',
            deviceId: mockDeviceData.deviceId,
          }),
        }),
      );
    });

    it('should pass errors to next middleware', async () => {
      // Setup mocks
      const req = createMockRequest({ params: { id: 'mock-id' } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      const error = new Error('Device not found');
      deviceService.getDeviceById.mockRejectedValueOnce(error);

      // Call the controller method
      await controller.getDeviceById(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key successfully', async () => {
      // Setup mocks
      const req = createMockRequest({
        body: {
          deviceId: mockDeviceData.deviceId,
          apiKey: 'valid-api-key',
        },
      });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      deviceService.validateApiKey.mockResolvedValueOnce({
        success: true,
        data: true,
        message: 'API key is valid',
      });

      // Call the controller method
      await controller.validateApiKey(req, res, next);

      // Verify service was called
      expect(deviceService.validateApiKey).toHaveBeenCalledWith(
        mockDeviceData.deviceId,
        'valid-api-key',
      );

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { valid: true },
          message: 'API key is valid',
        }),
      );
    });

    it('should throw UnauthorizedError if API key is invalid', async () => {
      // Setup mocks
      const req = createMockRequest({
        body: {
          deviceId: mockDeviceData.deviceId,
          apiKey: 'invalid-api-key',
        },
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      deviceService.validateApiKey.mockResolvedValueOnce({
        success: true,
        data: false,
        message: 'Invalid API key',
      });

      // Call the controller method
      await controller.validateApiKey(req, res, next);

      // Verify next was called with UnauthorizedError
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(next.mock.calls[0][0].message).toBe('Invalid API key');
    });

    it('should pass errors to next middleware', async () => {
      // Setup mocks
      const req = createMockRequest({
        body: {
          deviceId: mockDeviceData.deviceId,
          apiKey: 'valid-api-key',
        },
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      const error = new Error('Validation failed');
      deviceService.validateApiKey.mockRejectedValueOnce(error);

      // Call the controller method
      await controller.validateApiKey(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});