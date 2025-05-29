import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../config/database.config';
import { devices } from '../models';
import { type Device, type IDeviceService, type NewDevice, type ServiceResponse } from '../types';
import {
  _ok,
  encrypt,
  decrypt,
  BadRequestError,
  NotFoundError,
  handleServiceError,
} from '../utils';

export class DeviceService implements IDeviceService {
  private static instance: DeviceService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DeviceService {
    if (!DeviceService.instance) {
      DeviceService.instance = new DeviceService();
    }
    return DeviceService.instance;
  }

  /**
   * Generate a secure API key
   * @returns Generated API key
   */
  private generateApiKey(): string {
    // Generate a random string of 32 bytes (256 bits) and encode it as base64
    return crypto.randomBytes(32).toString('base64');
  }

  private async _ensureDevice(deviceId: string): Promise<void> {
    try {
      const existingDevice = await db
        .select()
        .from(devices)
        .where(eq(devices.deviceId, deviceId))
        .limit(1);

      if (existingDevice.length > 0) {
        throw new BadRequestError('Device with this ID already exists');
      }
    } catch (error) {
      throw handleServiceError(error, 'Failed to ensure device');
    }
  }

  /**
   * Register a new device
   * @param deviceData - The data of the device to register
   * @returns A service response containing the device with generated encrypted API key
   */
  async registerDevice(
    deviceData: NewDevice,
  ): Promise<ServiceResponse<Omit<Device, 'apiKey'> & { apiKey: string }>> {
    try {
      // Check if device already exists
      const apiKey = this.generateApiKey();
      await this._ensureDevice(deviceData.deviceId);

      // Encrypt API key for storage
      const encryptedApiKey = encrypt(apiKey);

      // Create new device with encrypted API key
      const [newDevice] = await db
        .insert(devices)
        .values({
          ...deviceData,
          apiKey,
        })
        .returning();

      if (!newDevice) {
        throw new BadRequestError('Failed to create device');
      }

      // Return device data with unencrypted API key
      return _ok(
        {
          ...newDevice,
          apiKey: encryptedApiKey, // Return the encrypted API key
        },
        'Device registered successfully',
      );
    } catch (error) {
      throw handleServiceError(error, 'Failed to register device');
    }
  }

  /**
   * Validate device API key
   * @param deviceId - The device ID
   * @param apiKey - The API key to validate
   * @returns A service response indicating if the API key is valid
   */
  async validateApiKey(deviceId: string, apiKey: string): Promise<ServiceResponse<boolean>> {
    try {
      // Get the device
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.deviceId, deviceId))
        .limit(1);

      if (!device) {
        throw new NotFoundError('Device not found');
      }

      // Decrypt provided API key
      const decryptedApiKey = decrypt(apiKey);

      // Compare with stored API key
      const isValid = decryptedApiKey === device.apiKey;

      return _ok(isValid, isValid ? 'API key is valid' : 'Invalid API key');
    } catch (error) {
      throw handleServiceError(error, 'Failed to validate API key');
    }
  }

  /**
   * Get device by ID
   * @param id - The device ID
   * @returns A service response containing the device if found
   */
  async getDeviceById(id: string): Promise<ServiceResponse<Omit<Device, 'apiKey'>>> {
    try {
      const [device] = await db.select().from(devices).where(eq(devices.id, id)).limit(1);

      if (!device) {
        throw new NotFoundError('Device not found');
      }

      // Remove API key from response
      const { apiKey: _, ...deviceWithoutApiKey } = device;

      return _ok(deviceWithoutApiKey, 'Device found');
    } catch (error) {
      throw handleServiceError(error, 'Failed to get device');
    }
  }

  /**
   * Get device by device ID
   * @param deviceId - The device ID
   * @returns A service response containing the device if found
   */
  async getDeviceByDeviceId(deviceId: string): Promise<ServiceResponse<Omit<Device, 'apiKey'>>> {
    try {
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.deviceId, deviceId))
        .limit(1);

      if (!device) {
        throw new NotFoundError('Device not found');
      }

      // Remove API key from response
      const { apiKey: _, ...deviceWithoutApiKey } = device;

      return _ok(deviceWithoutApiKey, 'Device found');
    } catch (error) {
      throw handleServiceError(error, 'Failed to get device');
    }
  }
}
