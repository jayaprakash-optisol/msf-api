import { createValidator } from '../utils/validator.util';
import { z } from 'zod';

// User role enum
export const roleEnum = z.enum(['admin', 'user']);

// Zod schema for validating user registration
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: roleEnum.optional(),
});

// Zod schema for validating user login
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Zod schema for validating user updates
export const updateSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    role: roleEnum.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// Export validator middleware
export const validateRegisterUser = createValidator(registerSchema);
export const validateLoginUser = createValidator(loginSchema);
export const validateUpdateUser = createValidator(updateSchema);
