import { z } from 'zod';

export const UpdateStoreSchema = z.object({
  storeName: z.string().min(1).optional(),
  storeCode: z.string().regex(/^[a-z0-9_]{2,30}$/, 'Mã phải 2-30 ký tự thường, số, gạch dưới').optional(),
  storeType: z.enum(['retail', 'warehouse', 'office', 'kiosk', 'fnb']).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')).transform((v) => v || null),
  address: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateStoreDto = z.infer<typeof UpdateStoreSchema>;
