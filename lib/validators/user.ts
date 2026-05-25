import { z } from 'zod';

export const updateProfileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.email('Enter a valid email address').optional().or(z.literal('')),
  profile: z
    .object({
      workshop_address: z.string().optional(),
      delivery_address: z.string().optional(),
    })
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const setupProfileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.email('Enter a valid email address').optional().or(z.literal('')),
  delivery_address: z.string().min(5, 'Enter a valid delivery address'),
});

export type SetupProfileInput = z.infer<typeof setupProfileSchema>;

export const createVehicleSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z
    .number()
    .int()
    .min(1980, 'Year must be 1980 or later')
    .max(new Date().getFullYear() + 1, 'Invalid year'),
  spec: z.enum(['American', 'European', 'Nigerian', 'Japanese', 'Other']).optional(),
  nickname: z.string().max(30).optional().or(z.literal('')),
  is_primary: z.boolean(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
