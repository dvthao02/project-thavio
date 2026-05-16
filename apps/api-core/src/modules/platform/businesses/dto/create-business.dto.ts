import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const optionalText = z.preprocess(emptyToUndefined, z.string().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email('Email không hợp lệ').optional());

export const CreateBusinessSchema = z.object({
  businessCode: z.string().trim().regex(/^[a-z0-9_]{3,50}$/, 'Mã doanh nghiệp phải gồm 3-50 ký tự chữ thường, số hoặc gạch dưới'),
  legalName: z.string().trim().min(1, 'Tên pháp lý là bắt buộc'),
  brandName: optionalText,
  email: optionalEmail,
  phone: optionalText,
  taxCode: optionalText,
  currencyCode: z.string().length(3).optional(),
  website: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
  legalAddress: optionalText,
  note: optionalText,
  timezone: optionalText,
  plan: z.enum(['starter', 'standard', 'professional', 'enterprise']).optional().default('standard'),
  firstStore: z.object({
    storeName: z.string().trim().min(1, 'Tên cửa hàng là bắt buộc'),
    storeCode: optionalText,
    address: optionalText,
    city: optionalText,
    phone: optionalText,
    email: optionalEmail,
  }),
  ownerEmail: optionalEmail,
  ownerPhone: optionalText,
  ownerUsername: z.preprocess(emptyToUndefined, z.string().regex(/^[a-z0-9_.]{3,50}$/, 'Username chỉ dùng chữ thường, số, dấu chấm và gạch dưới, 3–50 ký tự').optional()),
  ownerStaffCode: optionalText,
  ownerPassword: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  ownerFullName: z.string().trim().min(1, 'Tên chủ sở hữu là bắt buộc'),
}).refine((d) => d.ownerEmail || d.ownerPhone, {
  message: 'Email hoặc số điện thoại chủ sở hữu là bắt buộc',
  path: ['ownerEmail'],
});

export type CreateBusinessDto = z.infer<typeof CreateBusinessSchema>;
