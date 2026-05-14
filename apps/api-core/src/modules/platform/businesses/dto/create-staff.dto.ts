import { z } from 'zod';

export const CreateStaffSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  staffCode: z.string().optional(),
  role: z.enum(['admin', 'cashier', 'inventory', 'kitchen', 'delivery', 'staff']).default('staff'),
  password: z.string().min(8),
  primaryStoreId: z.string().uuid(),
});

export type CreateStaffDto = z.infer<typeof CreateStaffSchema>;
