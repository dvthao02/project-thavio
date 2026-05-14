import { z } from 'zod';

export const ListAuditEventsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  eventType: z.string().optional(),
  objectType: z.string().optional(),
  objectId: z.string().optional(),
  accountId: z.string().uuid().optional(),
  businessId: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export type ListAuditEventsDto = z.infer<typeof ListAuditEventsSchema>;
