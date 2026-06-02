import { z } from 'zod';

export const reassignOrderSchema = z.object({
  assigneeId: z.string().uuid(),
  role: z.enum(['runner', 'rider']),
});

export const adminCancelOrderSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const topUpFloatSchema = z.object({
  amount: z.number().positive(),
});

export const createVendorSchema = z.object({
  name: z.string().min(1).max(200),
  contact_phone: z.string().min(7).max(20),
  contact_name: z.string().max(200).optional(),
  cluster_id: z.string().uuid(),
  location_in_market: z.string().max(200).optional(),
  specializations: z.array(z.string()).optional(),
  payment_terms: z.string().optional(),
});

export const updateVendorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contact_phone: z.string().min(7).max(20).optional(),
  contact_name: z.string().max(200).optional(),
  cluster_id: z.string().uuid().optional(),
  location_in_market: z.string().max(200).optional(),
  specializations: z.array(z.string()).optional(),
  payment_terms: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const updateConfigSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});
