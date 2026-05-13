import { z } from 'zod';

export const LoginSchema = z.object({
  businessCode: z.string().min(1),
  // Accept email, username, or phone number
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof LoginSchema>;
