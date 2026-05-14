import { z } from 'zod';

export const ListAuditLogsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  tableName: z.string().optional(),
  operation: z.enum(['INSERT', 'UPDATE', 'DELETE']).optional(),
  recordId: z.string().uuid().optional(),
  search: z.string().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export type ListAuditLogsDto = z.infer<typeof ListAuditLogsSchema>;
