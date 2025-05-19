import { createValidator } from '../utils/validator.util';
import { z } from 'zod';

export const guestRoleEnum = z.enum(['Stock Manager', 'Store Keeper']);
export const guestStatusEnum = z.enum(['Active', 'Inactive', 'Expired']);

export const createGuestSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  location: z.string().min(1),
  role: guestRoleEnum,
  accessPeriod: z.string().min(1),
});

export const updateGuestSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    location: z.string().optional(),
    role: guestRoleEnum.optional(),
    accessPeriod: z.string().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const guestQuerySchema = z.object({
  page: z
    .string()
    .transform(val => parseInt(val, 10))
    .optional(),
  limit: z
    .string()
    .transform(val => parseInt(val, 10))
    .optional(),
  status: guestStatusEnum.optional(),
  search: z.string().optional(),
});

export const confirmGuestCredentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const validateCreateGuest = createValidator(createGuestSchema);
export const validateUpdateGuest = createValidator(updateGuestSchema);
export const validateGuestQuery = createValidator(guestQuerySchema, 'query');
export const validateConfirmGuestCredentials = createValidator(
  confirmGuestCredentialsSchema,
  'body',
);
