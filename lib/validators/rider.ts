import { z } from 'zod';

export const confirmPickupSchema = z.object({
  pickupPhotoUrl: z.string().optional(),
});

export type ConfirmPickupInput = z.infer<typeof confirmPickupSchema>;

export const confirmDeliverySchema = z.object({
  photoUrl: z.string().optional(),
  codAmountCollected: z.number().optional(),
});

export type ConfirmDeliveryInput = z.infer<typeof confirmDeliverySchema>;

export const reportFailureSchema = z.object({
  reason: z.enum([
    'customer_unavailable',
    'customer_refused',
    'wrong_address',
    'other',
  ]),
  notes: z.string().max(500).optional(),
  photoUrl: z.string().optional(),
});

export type ReportFailureInput = z.infer<typeof reportFailureSchema>;

export const updateLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  etaMinutes: z.number().int().positive().optional(),
});

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
