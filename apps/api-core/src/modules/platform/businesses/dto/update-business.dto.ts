import { z } from 'zod';

export const UpdateBusinessSchema = z.object({
  legalName: z.string().min(1).optional(),
  brandName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  taxCode: z.string().optional(),
  currencyCode: z.string().optional(),
  timezoneName: z.string().optional(),
  note: z.string().optional(),
});

export type UpdateBusinessDto = z.infer<typeof UpdateBusinessSchema>;
