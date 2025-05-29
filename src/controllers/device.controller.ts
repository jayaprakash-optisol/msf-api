import { type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async.middleware';
import { DeviceService } from '../services/device.service';
import { IDeviceService, NewDevice } from '../types';
import { sendSuccess, UnauthorizedError } from '../utils';

export class DeviceController {
  private readonly deviceService: IDeviceService;

  constructor() {
    this.deviceService = DeviceService.getInstance();
  }

  /**
   * Register a new device
   */
  registerDevice = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const deviceData: NewDevice = req.body;
    const result = await this.deviceService.registerDevice(deviceData);

    sendSuccess(res, result.data, result.message, 201);
  });

  /**
   * Get device by ID
   */
  getDeviceById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const result = await this.deviceService.getDeviceById(id);

    sendSuccess(res, result.data, result.message);
  });

  /**
   * Validate device API key
   * Used internally by middleware
   */
  validateApiKey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { deviceId, apiKey } = req.body;

    const result = await this.deviceService.validateApiKey(deviceId, apiKey);

    if (!result.data) {
      throw new UnauthorizedError('Invalid API key');
    }

    sendSuccess(res, { valid: true }, 'API key is valid');
  });
}
