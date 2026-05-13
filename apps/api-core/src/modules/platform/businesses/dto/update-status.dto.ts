import { z } from 'zod';

export const UpdateStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended', 'pending']),
});

export type UpdateStatusDto = z.infer<typeof UpdateStatusSchema>;
