import { z } from 'zod';

export const CreateBusinessSchema = z.object({
  businessCode: z.string().regex(/^[a-z0-9_]{3,50}$/, 'Must be 3-50 lowercase alphanumeric/underscore'),
  legalName: z.string().min(1),
  brandName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  taxCode: z.string().optional(),
  currencyCode: z.string().length(3).optional(),
  website: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
  legalAddress: z.string().optional(),
  note: z.string().optional(),
  timezone: z.string().optional(),
  plan: z.enum(['starter', 'standard', 'professional', 'enterprise']).optional().default('standard'),
  firstStore: z.object({
    storeName: z.string().min(1),
    storeCode: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }),
  ownerEmail: z.string().email().optional(),
  ownerPhone: z.string().optional(),
  ownerStaffCode: z.string().optional(),
  ownerPassword: z.string().min(8),
  ownerFullName: z.string().min(1),
}).refine((d) => d.ownerEmail || d.ownerPhone, {
  message: 'ownerEmail hoặc ownerPhone là bắt buộc',
  path: ['ownerEmail'],
});

export type CreateBusinessDto = z.infer<typeof CreateBusinessSchema>;
