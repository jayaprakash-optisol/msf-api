import { Request } from 'express';
import { ServiceResponse } from './common.interface';

export interface DeviceAuthRequest extends Request {
  deviceId?: string;
}

/**
 * Device type from the database
 */
export type Device = {
  id: string;
  location: string | null;
  deviceId: string;
  apiKey: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * New device without id and timestamps
 */
export type NewDevice = Omit<Device, 'id' | 'createdAt' | 'updatedAt' | 'apiKey'> & {
  apiKey?: string;
};

/**
 * Device service interface
 */
export interface IDeviceService {
  /**
   * Register a new device
   * @param deviceData - The data of the device to register
   * @returns A service response containing the device with generated API key
   */
  registerDevice(
    deviceData: NewDevice,
  ): Promise<ServiceResponse<Omit<Device, 'apiKey'> & { apiKey: string }>>;

  /**
   * Validate device API key
   * @param deviceId - The device ID
   * @param apiKey - The API key to validate
   * @returns A service response indicating if the API key is valid
   */
  validateApiKey(deviceId: string, apiKey: string): Promise<ServiceResponse<boolean>>;

  /**
   * Get device by ID
   * @param id - The device ID
   * @returns A service response containing the device if found
   */
  getDeviceById(id: string): Promise<ServiceResponse<Omit<Device, 'apiKey'>>>;

  /**
   * Get device by device ID
   * @param deviceId - The device ID
   * @returns A service response containing the device if found
   */
  getDeviceByDeviceId(deviceId: string): Promise<ServiceResponse<Omit<Device, 'apiKey'>>>;
}
