import { createValidator } from '../utils/validator.util';
import { z } from 'zod';

const validTableNames = [
  'tasks',
  'parcels',
  'parcelItems',
  'products',
  'shipments',
  'users',
  'guests',
  'devices',
] as const;

export const syncQuerySchema = z.object({
  tableName: z.enum(validTableNames, {
    errorMap: () => ({ message: `tableName must be one of: ${validTableNames.join(', ')}` }),
  }),
  lastSync: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'lastSync must be a valid ISO date string',
  }),
});

export const validateSyncQuery = createValidator(syncQuerySchema, 'query');
