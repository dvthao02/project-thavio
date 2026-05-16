import { z } from 'zod';

export const ListBusinessesSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
  subscriptionStatus: z.enum(['trialing', 'trial_expired', 'active', 'past_due', 'suspended', 'cancelled', 'pending']).optional(),
  trial: z.enum(['active', 'trialing', 'expiring', 'expired']).optional(),
  plan: z.enum(['starter', 'standard', 'professional', 'enterprise']).optional(),
  search: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  assignedAccountId: z.string().uuid().optional(),
});

export type ListBusinessesDto = z.infer<typeof ListBusinessesSchema>;
