import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const optionalText = z.preprocess(emptyToUndefined, z.string().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email('Email không hợp lệ').optional());

export const UpdateBusinessSchema = z.object({
  legalName: z.preprocess(emptyToUndefined, z.string().min(1, 'Tên pháp lý là bắt buộc').optional()),
  brandName: optionalText,
  email: optionalEmail,
  phone: optionalText,
  taxCode: optionalText,
  currencyCode: z.string().optional(),
  website: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
  legalAddress: optionalText,
  timezoneName: optionalText,
  note: optionalText,
});

export type UpdateBusinessDto = z.infer<typeof UpdateBusinessSchema>;
