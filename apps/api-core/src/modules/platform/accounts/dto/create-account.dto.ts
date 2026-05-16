import { z } from 'zod';

export const CreateAccountSchema = z.object({
  username: z.string().trim().min(3, 'Username phải có tối thiểu 3 ký tự').max(80, 'Username tối đa 80 ký tự'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  fullName: z.string().trim().min(1, 'Họ và tên là bắt buộc'),
  email: z.string().trim().email('Email không hợp lệ').optional(),
  phone: z.string().trim().optional(),
  isPlatformAdmin: z.boolean().optional().default(false),
});

export type CreateAccountDto = z.infer<typeof CreateAccountSchema>;
