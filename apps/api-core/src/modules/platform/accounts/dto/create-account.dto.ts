import { z } from 'zod';

export const CreateAccountSchema = z.object({
  username: z.string().min(3).max(80),
  password: z.string().min(8),
  fullName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isPlatformAdmin: z.boolean().optional().default(false),
});

export type CreateAccountDto = z.infer<typeof CreateAccountSchema>;
