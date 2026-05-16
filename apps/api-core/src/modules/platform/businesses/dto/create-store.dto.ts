import { z } from 'zod';

export const CreateStoreSchema = z.object({
  storeName: z.string().min(1, 'Tên cửa hàng là bắt buộc'),
  storeCode: z.string().regex(/^[a-z0-9_]{2,30}$/, 'Mã phải 2-30 ký tự thường, số, hoặc gạch dưới').optional(),
  storeType: z.enum(['retail', 'warehouse', 'office', 'kiosk', 'fnb']).default('retail'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')).transform((v) => v || undefined),
  address: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().optional(),
});

export type CreateStoreDto = z.infer<typeof CreateStoreSchema>;
