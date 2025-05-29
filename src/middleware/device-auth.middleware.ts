import { NextFunction, Response } from 'express';
import { DeviceService } from '../services/device.service';
import { UnauthorizedError } from '../utils';
import { DeviceAuthRequest } from '../types';

/**
 * Middleware to authenticate device using API key from headers
 */
export const authenticateDevice = async (
  req: DeviceAuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const deviceId = req.headers['x-device-id'] as string | undefined;
    const apiKey = req.headers['x-api-key'] as string | undefined;

    if (!deviceId || !apiKey) {
      throw new UnauthorizedError('Device ID and API key are required');
    }

    const deviceService = DeviceService.getInstance();
    const result = await deviceService.validateApiKey(deviceId, apiKey);

    if (!result.data) {
      throw new UnauthorizedError('Invalid API key');
    }

    // Attach device ID to request for use in subsequent handlers
    req.deviceId = deviceId;

    next();
  } catch (error) {
    next(error);
  }
};
