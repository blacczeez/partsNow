import { z } from 'zod';

export const reconcileShiftSchema = z.object({
  note: z.string().max(500).optional(),
});
