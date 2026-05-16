import { z } from 'zod';

export const AddAssigneeSchema = z.object({
  accountId: z.string().uuid(),
  accessLevel: z.enum(['admin', 'manager', 'staff', 'auditor']).default('admin'),
});

export type AddAssigneeDto = z.infer<typeof AddAssigneeSchema>;
