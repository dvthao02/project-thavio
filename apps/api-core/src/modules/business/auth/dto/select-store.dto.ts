import { z } from 'zod';

export const SelectStoreSchema = z.object({
  storeId: z.string().uuid(),
});

export type SelectStoreDto = z.infer<typeof SelectStoreSchema>;
