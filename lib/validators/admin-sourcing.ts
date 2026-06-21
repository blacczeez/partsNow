import { z } from 'zod';

export const adminSourcingActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('retry_assign'),
  }),
  z.object({
    action: z.literal('message_customer'),
    message: z.string().min(1).max(1000),
  }),
  z.object({
    action: z.literal('dismiss'),
    note: z.string().max(500).optional(),
  }),
]);
