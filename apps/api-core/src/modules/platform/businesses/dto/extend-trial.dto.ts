import { z } from 'zod';

export const ExtendTrialSchema = z.object({
  days: z.coerce.number().int().min(1).max(90),
});

export type ExtendTrialDto = z.infer<typeof ExtendTrialSchema>;
