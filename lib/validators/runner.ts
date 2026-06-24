import { z } from 'zod';

export const startShiftSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export type StartShiftInput = z.infer<typeof startShiftSchema>;

export const endShiftSchema = z.object({
  notes: z.string().max(500).optional().or(z.literal('')),
});

export type EndShiftInput = z.infer<typeof endShiftSchema>;

export const rejectOrderSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500),
});

export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;

export const markItemFoundSchema = z
  .object({
    vendorId: z.string().uuid().optional(),
    quickAddVendor: z
      .object({
        name: z.string().min(1).max(200),
        locationInMarket: z.string().max(200).optional(),
      })
      .optional(),
    vendorPrice: z.number().positive('Price must be greater than 0'),
    qcImageUrl: z.string().min(1, 'QC photo is required'),
  })
  .refine((data) => Boolean(data.vendorId || data.quickAddVendor?.name?.trim()), {
    message: 'Select a vendor or add a stall name',
    path: ['vendorId'],
  });

export type MarkItemFoundInput = z.infer<typeof markItemFoundSchema>;

export const markItemUnavailableSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500),
});

export type MarkItemUnavailableInput = z.infer<typeof markItemUnavailableSchema>;

export const clarifyOrderSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000),
});

export type ClarifyOrderInput = z.infer<typeof clarifyOrderSchema>;
