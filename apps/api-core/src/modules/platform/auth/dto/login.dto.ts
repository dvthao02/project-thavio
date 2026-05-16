import { z } from 'zod';

export const LoginSchema = z.object({
  // Platform account identifier: email, username, or phone (global account namespace)
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof LoginSchema>;
