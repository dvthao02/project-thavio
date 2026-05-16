import { z } from 'zod';

export const LoginSchema = z.object({
  businessCode: z.string().trim().min(1, 'Mã doanh nghiệp là bắt buộc'),
  identifier: z.string().trim().min(1, 'Email, số điện thoại, username hoặc mã nhân viên là bắt buộc'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});

export type LoginDto = z.infer<typeof LoginSchema>;
