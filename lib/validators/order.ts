import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        partId: z.string().uuid().optional(),
        description: z.string().min(1, 'Description is required'),
        quantity: z.number().int().positive().default(1),
        price: z.number().positive('Price must be greater than 0'),
        imageUrl: z.url().optional(),
      })
    )
    .min(1, 'At least one item is required'),
  vehicleId: z.string().uuid().optional(),
  deliveryAddress: z.string().min(10, 'Enter a valid delivery address'),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
  deliveryNotes: z.string().max(500).optional().or(z.literal('')),
  paymentMethod: z.enum(['wallet', 'card', 'cod']),
  sourceChannel: z.enum(['whatsapp', 'web', 'app']).default('web'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional().or(z.literal('')),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const rateOrderSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be 1-5').max(5, 'Rating must be 1-5'),
  comment: z.string().max(1000).optional().or(z.literal('')),
});

export const reportPartIssuesSchema = z.object({
  reports: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        issueSubtype: z.enum(['wrong_part', 'damaged', 'doesnt_fit', 'not_ordered']),
        notes: z.string().max(500).optional().or(z.literal('')),
        photoUrl: z.string().url().optional(),
      })
    )
    .min(1, 'Select at least one item to report'),
});

export type RateOrderInput = z.infer<typeof rateOrderSchema>;
export type ReportPartIssuesInput = z.infer<typeof reportPartIssuesSchema>;
