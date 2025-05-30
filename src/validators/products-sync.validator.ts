import { z } from 'zod';
import { validate } from '../middleware/validator.middleware';

/**
 * Schema for manual product sync request body
 */
export const manualSyncSchema = z.object({
  resetLastUpdate: z
    .boolean()
    .optional()
    .describe('Whether to reset last update date before sync (forces full sync)'),
});

/**
 * Schema for reset last update date request body
 */
export const resetLastUpdateSchema = z.object({
  daysAgo: z
    .number()
    .int()
    .min(1, 'daysAgo must be at least 1')
    .max(365, 'daysAgo cannot exceed 365 days')
    .optional()
    .default(7)
    .describe('Number of days ago to set as last update date'),
});

/**
 * Validator middleware for manual product sync
 */
export const validateManualSync = validate(manualSyncSchema, 'body');

/**
 * Validator middleware for reset last update date
 */
export const validateResetLastUpdate = validate(resetLastUpdateSchema, 'body');
