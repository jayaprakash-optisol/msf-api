import { z } from 'zod';
import { createValidator } from '../utils';

/**
 * Schema for device registration
 */
export const deviceSchema = z.object({
  deviceId: z
    .string()
    .min(1, 'Device ID is required')
    .max(255, 'Device ID cannot exceed 255 characters'),
  location: z.string().max(255, 'Location cannot exceed 255 characters').nullable().optional(),
});

/**
 * Schema for validating device API key
 */
export const apiKeyValidationSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  apiKey: z.string().min(1, 'API key is required'),
});

/**
 * Validator middleware for device registration
 */
export const validateDeviceRegistration = createValidator(deviceSchema);

/**
 * Validator middleware for API key validation
 */
export const validateApiKey = createValidator(apiKeyValidationSchema);
