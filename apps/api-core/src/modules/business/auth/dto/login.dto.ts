import { z } from 'zod';

export const LoginSchema = z.object({
  businessCode: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof LoginSchema>;
