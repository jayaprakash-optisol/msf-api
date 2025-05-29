import { describe, it, expect, vi, beforeAll } from 'vitest';
import express, { Application } from 'express';
import request from 'supertest';
import deviceRoutes from '../../src/routes/device.routes';
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
  createValidator: vi.fn().mockImplementation((schema) => (req, res, next) => next()),
}));

// Mock the device controller methods
vi.mock('../../src/controllers/device.controller', () => {
  return {
    DeviceController: vi.fn().mockImplementation(() => ({
      registerDevice: vi.fn((req, res) => {
        return res.status(StatusCodes.CREATED).json({
          success: true,
          message: 'Device registered successfully',
          data: {
            id: 'mock-id',
            deviceId: req.body.deviceId,
            name: req.body.name,
            type: req.body.type,
            apiKey: 'encrypted-api-key',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      }),
      getDeviceById: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'Device found',
          data: {
            id: req.params.id,
            deviceId: 'test-device-id',
            name: 'Test Device',
            type: 'mobile',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      }),
      validateApiKey: vi.fn((req, res) => {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'API key is valid',
          data: true,
        });
      }),
    })),
  };
});

// Mock middleware
vi.mock('../../src/middleware', () => ({
  rateLimiter: () => (req, res, next) => next(),
}));

// Mock validators
vi.mock('../../src/validators', () => ({
  validateDeviceRegistration: (req, res, next) => next(),
  validateApiKey: (req, res, next) => {
    req.deviceId = 'test-device-id';
    next();
  },
}));

describe('Device Routes (Integration)', () => {
  let app: Application;
  let api: any;

  beforeAll(() => {
    // Create test Express application
    app = express();
    app.use(express.json());

    // Mount device routes on /api/devices
    app.use('/api/devices', deviceRoutes);

    // Create supertest agent
    api = request(app);
  });

  describe('POST /api/devices', () => {
    it('should register a new device successfully', async () => {
      const mockDeviceData = {
        deviceId: 'test-device-id',
        name: 'Test Device',
        type: 'mobile',
      };

      const response = await api
        .post('/api/devices')
        .send(mockDeviceData)
        .expect(StatusCodes.CREATED);

      expect(response.body).toEqual({
        success: true,
        message: 'Device registered successfully',
        data: expect.objectContaining({
          id: expect.any(String),
          deviceId: mockDeviceData.deviceId,
          name: mockDeviceData.name,
          type: mockDeviceData.type,
          apiKey: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      });
    });
  });

  describe('GET /api/devices/:id', () => {
    it('should get a device by ID successfully', async () => {
      const response = await api
        .get('/api/devices/mock-id')
        .set('x-device-id', 'test-device-id')
        .set('x-api-key', 'mock-api-key')
        .expect(StatusCodes.OK);

      expect(response.body).toEqual({
        success: true,
        message: 'Device found',
        data: expect.objectContaining({
          id: 'mock-id',
          deviceId: 'test-device-id',
          name: 'Test Device',
          type: 'mobile',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      });
    });

    it.skip('should return 401 if API key is missing', async () => {
      // Mock validateApiKey to throw an error for this test
      vi.mock('../../src/validators', () => ({
        validateDeviceRegistration: (req, res, next) => next(),
        validateApiKey: (req, res, next) => {
          return res.status(StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: 'API key is required',
            data: null,
          });
        },
      }), { virtual: true });

      const response = await api
        .get('/api/devices/mock-id')
        .expect(StatusCodes.UNAUTHORIZED);

      expect(response.body).toEqual({
        success: false,
        message: 'API key is required',
        data: null,
      });

      // Reset the mock
      vi.mock('../../src/validators', () => ({
        validateDeviceRegistration: (req, res, next) => next(),
        validateApiKey: (req, res, next) => {
          req.deviceId = 'test-device-id';
          next();
        },
      }), { virtual: true });
    });
  });

  describe('POST /api/devices/validate', () => {
    it('should validate API key successfully', async () => {
      const response = await api
        .post('/api/devices/validate')
        .set('x-device-id', 'test-device-id')
        .set('x-api-key', 'mock-api-key')
        .expect(StatusCodes.OK);

      expect(response.body).toEqual({
        success: true,
        message: 'API key is valid',
        data: true,
      });
    });

    it.skip('should return 401 if API key is invalid', async () => {
      // Mock validateApiKey to throw an error for this test
      vi.mock('../../src/validators', () => ({
        validateDeviceRegistration: (req, res, next) => next(),
        validateApiKey: (req, res, next) => {
          return res.status(StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid API key',
            data: null,
          });
        },
      }), { virtual: true });

      const response = await api
        .post('/api/devices/validate')
        .set('x-device-id', 'test-device-id')
        .set('x-api-key', 'invalid-api-key')
        .expect(StatusCodes.UNAUTHORIZED);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid API key',
        data: null,
      });

      // Reset the mock
      vi.mock('../../src/validators', () => ({
        validateDeviceRegistration: (req, res, next) => next(),
        validateApiKey: (req, res, next) => {
          req.deviceId = 'test-device-id';
          next();
        },
      }), { virtual: true });
    });
  });
});
