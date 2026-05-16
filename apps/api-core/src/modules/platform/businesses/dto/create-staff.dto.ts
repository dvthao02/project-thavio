import { z } from 'zod';

const StaffRoleSchema = z.enum(['admin', 'cashier', 'inventory', 'kitchen', 'delivery', 'staff']);

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const CreateStaffSchema = z.object({
  fullName: z.string().trim().min(1, 'Họ và tên là bắt buộc'),
  username: z.preprocess(emptyToUndefined, z.string().trim().min(3, 'Username phải có tối thiểu 3 ký tự').max(80, 'Username tối đa 80 ký tự').optional()),
  email: z.preprocess(emptyToUndefined, z.string().email('Email không hợp lệ').optional()),
  phone: z.preprocess(emptyToUndefined, z.string().optional()),
  staffCode: z.preprocess(emptyToUndefined, z.string().optional()),
  role: StaffRoleSchema.default('staff'),
  password: z.string().min(8, 'Mật khẩu phải có tối thiểu 8 ký tự'),
  primaryStoreId: z.string().uuid('Cửa hàng chính không hợp lệ'),
  storeRoles: z.array(z.object({
    storeId: z.string().uuid('Cửa hàng không hợp lệ'),
    role: StaffRoleSchema,
  })).optional(),
});

export type CreateStaffDto = z.infer<typeof CreateStaffSchema>;
export type StaffRoleValue = z.infer<typeof StaffRoleSchema>;
