import { z } from 'zod';

export const CreateBusinessSchema = z.object({
  businessCode: z.string().regex(/^[a-z0-9_]{3,50}$/, 'Must be 3-50 lowercase alphanumeric/underscore'),
  legalName: z.string().min(1),
  brandName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  plan: z.enum(['starter', 'standard', 'professional', 'enterprise']).optional().default('standard'),
  firstStore: z
    .object({
      storeName: z.string().min(1),
      storeCode: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
    })
    .optional(),
  ownerEmail: z.string().email().optional(),
  ownerPassword: z.string().min(8).optional(),
  ownerFullName: z.string().optional(),
});

export type CreateBusinessDto = z.infer<typeof CreateBusinessSchema>;
