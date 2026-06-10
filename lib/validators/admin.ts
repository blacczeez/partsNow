import { z } from 'zod';
import { uuidIdSchema } from '@/lib/utils/validation';

export const reassignOrderSchema = z.object({
  assigneeId: uuidIdSchema,
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
  cluster_id: uuidIdSchema,
  location_in_market: z.string().max(200).optional(),
  specializations: z.array(z.string()).optional(),
  payment_terms: z.string().optional(),
});

export const updateVendorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contact_phone: z.string().min(7).max(20).optional(),
  contact_name: z.string().max(200).optional(),
  cluster_id: uuidIdSchema.optional(),
  location_in_market: z.string().max(200).optional(),
  specializations: z.array(z.string()).optional(),
  payment_terms: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const updateConfigSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export const priceReviewActionSchema = z.object({
  itemId: uuidIdSchema,
  action: z.enum(['send_to_customer', 'reject_item']),
  notes: z.string().max(500).optional(),
});
