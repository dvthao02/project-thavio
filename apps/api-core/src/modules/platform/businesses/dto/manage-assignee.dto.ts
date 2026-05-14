import { z } from 'zod';

export const AddAssigneeSchema = z.object({
  accountId: z.string().uuid(),
  accessLevel: z.enum(['admin', 'support', 'viewer']).default('support'),
});

export type AddAssigneeDto = z.infer<typeof AddAssigneeSchema>;
