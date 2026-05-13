import { z } from 'zod';

export const ListAccountsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['pending', 'active', 'locked', 'disabled']).optional(),
  search: z.string().optional(),
});

export type ListAccountsDto = z.infer<typeof ListAccountsSchema>;
