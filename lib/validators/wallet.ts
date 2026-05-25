import { z } from 'zod';

export const topUpSchema = z.object({
  amount: z
    .number()
    .min(5000, 'Minimum top-up is N5,000')
    .max(500000, 'Maximum top-up is N500,000'),
});

export type TopUpInput = z.infer<typeof topUpSchema>;

export const transactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type TransactionsQuery = z.infer<typeof transactionsQuerySchema>;
