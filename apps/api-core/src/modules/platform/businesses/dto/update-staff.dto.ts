import { z } from 'zod';
import type { StaffRoleValue } from './create-staff.dto';

const StaffRoleSchema: z.ZodType<StaffRoleValue> = z.enum(['admin', 'cashier', 'inventory', 'kitchen', 'delivery', 'staff']);
const StaffAssignmentRoleSchema = z.enum(['owner', 'admin', 'cashier', 'inventory', 'kitchen', 'delivery', 'staff']);

const emptyToNull = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const UpdateStaffSchema = z.object({
  fullName: z.string().trim().min(1, 'Họ và tên là bắt buộc').optional(),
  username: z.preprocess(emptyToNull, z.string().trim().min(3, 'Username phải có tối thiểu 3 ký tự').max(80, 'Username tối đa 80 ký tự').nullable().optional()),
  email: z.preprocess(emptyToNull, z.string().email('Email không hợp lệ').nullable().optional()),
  phone: z.preprocess(emptyToNull, z.string().nullable().optional()),
  staffCode: z.string().trim().min(1, 'Mã nhân viên là bắt buộc').optional(),
  role: StaffRoleSchema.optional(),
  password: z.preprocess(emptyToNull, z.string().min(8, 'Mật khẩu phải có tối thiểu 8 ký tự').nullable().optional()),
  primaryStoreId: z.string().uuid('Cửa hàng chính không hợp lệ').optional(),
  isActive: z.boolean().optional(),
  employmentStatus: z.enum(['active', 'inactive', 'terminated', 'on_leave']).optional(),
  storeRoles: z.array(z.object({
    storeId: z.string().uuid('Cửa hàng không hợp lệ'),
    role: StaffAssignmentRoleSchema,
  })).min(1, 'Nhân viên phải được gán ít nhất một cửa hàng').optional(),
});

export type UpdateStaffDto = z.infer<typeof UpdateStaffSchema>;
