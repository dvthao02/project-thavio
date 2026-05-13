import { z } from 'zod';

export const ListBusinessesSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['active', 'inactive', 'suspended', 'trial', 'pending']).optional(),
  search: z.string().optional(),
});

export type ListBusinessesDto = z.infer<typeof ListBusinessesSchema>;
