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

export const createPartCategorySchema = z.object({
  name: z.string().min(1).max(100),
  sort_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

export const updatePartCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

export const createPartSchema = z.object({
  name: z.string().min(1).max(200),
  category_id: uuidIdSchema,
  subcategory: z.string().max(200).optional(),
  oem_code: z.string().max(100).optional(),
  average_price: z.number().positive().optional(),
  weight_kg: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  compatible_vehicles: z.array(z.object({
    make: z.string(),
    model: z.string(),
    year_start: z.number().optional(),
    year_end: z.number().optional(),
    spec: z.string().optional(),
  })).optional(),
});

export const updatePartSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category_id: uuidIdSchema.optional(),
  subcategory: z.string().max(200).optional(),
  oem_code: z.string().max(100).optional(),
  average_price: z.number().positive().optional(),
  weight_kg: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  compatible_vehicles: z.array(z.object({
    make: z.string(),
    model: z.string(),
    year_start: z.number().optional(),
    year_end: z.number().optional(),
    spec: z.string().optional(),
  })).optional(),
  is_active: z.boolean().optional(),
});

export const createClusterSchema = z.object({
  name: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  delivery_radius_km: z.number().int().positive().default(15),
  is_active: z.boolean().optional(),
});

export const updateClusterSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  delivery_radius_km: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});
