import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateDevice } from '../../src/middleware/device-auth.middleware';
import { createMockRequest, createMockResponse, createMockNext } from '../utils/test-utils';
import { DeviceService } from '../../src/services/device.service';
import type { DeviceAuthRequest } from '../../src/types';

// Mock DeviceService
vi.mock('../../src/services/device.service', () => ({
  DeviceService: {
    getInstance: vi.fn().mockReturnValue({
      validateApiKey: vi.fn(),
    }),
  },
}));

describe('Device Auth Middleware', () => {
  let mockDeviceService: { validateApiKey: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.resetAllMocks();
    mockDeviceService = {
      validateApiKey: vi.fn(),
    };
    vi.mocked(DeviceService.getInstance).mockReturnValue(mockDeviceService as any);
  });

  describe('authenticateDevice middleware', () => {
    it('should call next() if API key is valid', async () => {
      // Mock request with device ID and API key
      const req = createMockRequest({
        headers: {
          'x-device-id': 'test-device-id',
          'x-api-key': 'valid-api-key',
        },
      }) as DeviceAuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock DeviceService.validateApiKey to return success
      mockDeviceService.validateApiKey.mockResolvedValue({
        success: true,
        data: true,
        message: 'API key is valid',
        statusCode: 200,
      });

      // Call middleware
      await authenticateDevice(req, res, next);

      // Should set req.deviceId and call next
      expect(req.deviceId).toBe('test-device-id');
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();

      // Verify validateApiKey was called with correct arguments
      expect(mockDeviceService.validateApiKey).toHaveBeenCalledWith(
        'test-device-id',
        'valid-api-key'
      );
    });

    it('should return 401 if device ID is missing', async () => {
      // Mock request without device ID
      const req = createMockRequest({
        headers: {
          'x-api-key': 'valid-api-key',
        },
      }) as DeviceAuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call middleware
      await authenticateDevice(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Device ID and API key are required',
          statusCode: 401,
        })
      );

      // Verify validateApiKey was not called
      expect(mockDeviceService.validateApiKey).not.toHaveBeenCalled();
    });

    it('should return 401 if API key is missing', async () => {
      // Mock request without API key
      const req = createMockRequest({
        headers: {
          'x-device-id': 'test-device-id',
        },
      }) as DeviceAuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Call middleware
      await authenticateDevice(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Device ID and API key are required',
          statusCode: 401,
        })
      );

      // Verify validateApiKey was not called
      expect(mockDeviceService.validateApiKey).not.toHaveBeenCalled();
    });

    it('should return 401 if API key is invalid', async () => {
      // Mock request with device ID and API key
      const req = createMockRequest({
        headers: {
          'x-device-id': 'test-device-id',
          'x-api-key': 'invalid-api-key',
        },
      }) as DeviceAuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock DeviceService.validateApiKey to return failure
      mockDeviceService.validateApiKey.mockResolvedValue({
        success: true,
        data: false,
        message: 'Invalid API key',
        statusCode: 200,
      });

      // Call middleware
      await authenticateDevice(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid API key',
          statusCode: 401,
        })
      );

      // Verify validateApiKey was called with correct arguments
      expect(mockDeviceService.validateApiKey).toHaveBeenCalledWith(
        'test-device-id',
        'invalid-api-key'
      );
    });

    it('should handle service errors', async () => {
      // Mock request with device ID and API key
      const req = createMockRequest({
        headers: {
          'x-device-id': 'test-device-id',
          'x-api-key': 'valid-api-key',
        },
      }) as DeviceAuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock DeviceService.validateApiKey to throw error
      mockDeviceService.validateApiKey.mockRejectedValue(new Error('Service error'));

      // Call middleware
      await authenticateDevice(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(expect.any(Error));

      // Verify validateApiKey was called with correct arguments
      expect(mockDeviceService.validateApiKey).toHaveBeenCalledWith(
        'test-device-id',
        'valid-api-key'
      );
    });

    it('should handle device not found error', async () => {
      // Mock request with device ID and API key
      const req = createMockRequest({
        headers: {
          'x-device-id': 'non-existent-device-id',
          'x-api-key': 'valid-api-key',
        },
      }) as DeviceAuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock DeviceService.validateApiKey to throw NotFoundError
      const notFoundError = new Error('Device not found');
      notFoundError.name = 'NotFoundError';
      mockDeviceService.validateApiKey.mockRejectedValue(notFoundError);

      // Call middleware
      await authenticateDevice(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Device not found',
      }));

      // Verify validateApiKey was called with correct arguments
      expect(mockDeviceService.validateApiKey).toHaveBeenCalledWith(
        'non-existent-device-id',
        'valid-api-key'
      );
    });

    it('should handle unexpected errors', async () => {
      // Mock request with device ID and API key
      const req = createMockRequest({
        headers: {
          'x-device-id': 'test-device-id',
          'x-api-key': 'valid-api-key',
        },
      }) as DeviceAuthRequest;
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock DeviceService.getInstance to throw error
      vi.mocked(DeviceService.getInstance).mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      // Call middleware
      await authenticateDevice(req, res, next);

      // Should pass error to next
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});