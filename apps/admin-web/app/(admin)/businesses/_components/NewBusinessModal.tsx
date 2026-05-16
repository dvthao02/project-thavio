'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Building2, ChevronDown, ChevronUp, Eye, EyeOff, Globe2, Loader2, X,
} from 'lucide-react';
import { api } from '@/lib/api';

const INPUT =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50';

const PLANS = [
  { value: 'starter', label: 'Starter' },
  { value: 'standard', label: 'Tiêu chuẩn' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const DEFAULT = {
  legalName: '',
  businessCode: '',
  ownerFullName: '',
  ownerEmail: '',
  ownerPhone: '',
  ownerUsername: '',
  ownerPassword: '',
  brandName: '',
  email: '',
  phone: '',
  taxCode: '',
  website: '',
  legalAddress: '',
  note: '',
  plan: 'standard',
};

function validate(form: typeof DEFAULT) {
  const errors: Record<string, string> = {};
  if (!form.legalName.trim()) errors.legalName = 'Bắt buộc';
  if (!form.businessCode.trim()) errors.businessCode = 'Bắt buộc';
  else if (!/^[a-z0-9_]{3,50}$/.test(form.businessCode))
    errors.businessCode = 'Chỉ dùng chữ thường, số và dấu gạch dưới, 3–50 ký tự';
  if (!form.ownerFullName.trim()) errors.ownerFullName = 'Bắt buộc';
  if (!form.ownerEmail && !form.ownerPhone) errors.ownerEmail = 'Cần ít nhất email hoặc số điện thoại';
  if (form.ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail))
    errors.ownerEmail = 'Email không hợp lệ';
  if (form.ownerUsername && !/^[a-z0-9_.]{3,50}$/.test(form.ownerUsername))
    errors.ownerUsername = 'Chỉ dùng chữ thường, số, dấu chấm và gạch dưới, 3–50 ký tự';
  if (!form.ownerPassword) errors.ownerPassword = 'Bắt buộc';
  else if (form.ownerPassword.length < 8) errors.ownerPassword = 'Tối thiểu 8 ký tự';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email không hợp lệ';
  if (form.website && !/^https?:\/\/.+\..+/.test(form.website))
    errors.website = 'Website cần bắt đầu bằng http:// hoặc https://';
  return errors;
}

interface Props {
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function NewBusinessModal({ onClose, onCreated }: Props) {
  const errorRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState(DEFAULT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugEdited, setSlugEdited] = useState(false);
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showExtra, setShowExtra] = useState(false);

  useEffect(() => {
    if (!slugEdited && form.legalName) {
      setForm((f) => ({ ...f, businessCode: toSlug(form.legalName) }));
    }
  }, [form.legalName, slugEdited]);

  useEffect(() => {
    if (!usernameEdited && form.ownerEmail) {
      const local = form.ownerEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '_');
      setForm((f) => ({ ...f, ownerUsername: local.slice(0, 50) }));
    }
  }, [form.ownerEmail, usernameEdited]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: (payload: object) => api.post('/platform/businesses', payload).then((res) => res.data),
    onSuccess: (data) => onCreated(data.businessCode),
    onError: () => setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50),
  });

  function set(key: keyof typeof DEFAULT) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function submit() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    mutation.mutate({
      businessCode: form.businessCode,
      legalName: form.legalName,
      ...(form.brandName && { brandName: form.brandName }),
      ...(form.email && { email: form.email }),
      ...(form.phone && { phone: form.phone }),
      ...(form.taxCode && { taxCode: form.taxCode }),
      ...(form.website && { website: form.website }),
      ...(form.legalAddress && { legalAddress: form.legalAddress }),
      ...(form.note && { note: form.note }),
      plan: form.plan,
      firstStore: { storeName: 'Chi nhánh chính' },
      ownerFullName: form.ownerFullName,
      ...(form.ownerEmail && { ownerEmail: form.ownerEmail }),
      ...(form.ownerPhone && { ownerPhone: form.ownerPhone }),
      ...(form.ownerUsername && { ownerUsername: form.ownerUsername }),
      ownerPassword: form.ownerPassword,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-lg flex-col rounded-xl border border-border bg-background shadow-2xl"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Building2 size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Tạo doanh nghiệp mới</h2>
              <p className="text-xs text-muted-foreground">Bắt đầu với 10 ngày dùng thử miễn phí.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground transition hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Loading overlay */}
        {mutation.isPending && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-xl bg-background/90 backdrop-blur-sm">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Building2 size={24} className="text-primary" />
              <svg className="absolute inset-0 h-full w-full animate-spin" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor"
                  strokeDasharray="38 114" strokeWidth="3" className="text-primary" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">Đang khởi tạo doanh nghiệp…</p>
            <p className="text-xs text-muted-foreground">Thường mất 5–15 giây</p>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">

            {/* Doanh nghiệp */}
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Doanh nghiệp</p>
              <div className="space-y-3">
                <Field label="Tên pháp lý" required error={errors.legalName}>
                  <input autoFocus className={INPUT} value={form.legalName} onChange={set('legalName')}
                    placeholder="Công ty TNHH Cà Phê Việt" />
                </Field>
                <Field label="Mã doanh nghiệp" required error={errors.businessCode}
                  hint="Dùng làm định danh và tên schema. Không nên đổi sau khi tạo.">
                  <input className={INPUT} value={form.businessCode}
                    onChange={(e) => { setSlugEdited(true); setForm((f) => ({ ...f, businessCode: e.target.value })); }}
                    placeholder="ca_phe_viet" />
                </Field>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Chủ sở hữu */}
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Chủ sở hữu</p>
              <div className="space-y-3">
                <Field label="Họ và tên" required error={errors.ownerFullName}>
                  <input className={INPUT} value={form.ownerFullName} onChange={set('ownerFullName')}
                    placeholder="Nguyễn Văn A" />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Email đăng nhập" error={errors.ownerEmail}
                    hint={!form.ownerEmail && !form.ownerPhone ? 'Cần ít nhất email hoặc SĐT.' : undefined}>
                    <input className={INPUT} type="email" value={form.ownerEmail} onChange={set('ownerEmail')}
                      placeholder="owner@business.vn" />
                  </Field>
                  <Field label="Số điện thoại đăng nhập">
                    <input className={INPUT} value={form.ownerPhone} onChange={set('ownerPhone')}
                      placeholder="0901234567" />
                  </Field>
                </div>
                <Field label="Username đăng nhập" error={errors.ownerUsername}
                  hint="Tự động tạo từ email nếu để trống. Dùng chữ thường, số, dấu chấm, gạch dưới.">
                  <input className={INPUT} value={form.ownerUsername}
                    onChange={(e) => { setUsernameEdited(true); setForm((f) => ({ ...f, ownerUsername: e.target.value.toLowerCase() })); }}
                    placeholder="nguyen.van.a" />
                </Field>
                <Field label="Mật khẩu" required error={errors.ownerPassword}>
                  <div className="relative">
                    <input className={`${INPUT} pr-9`} type={showPassword ? 'text' : 'password'}
                      value={form.ownerPassword} onChange={set('ownerPassword')} placeholder="Tối thiểu 8 ký tự" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </Field>
              </div>
            </div>

            {/* Thông tin bổ sung */}
            <div className="rounded-lg border border-border">
              <button type="button" onClick={() => setShowExtra((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground">
                <span>Thông tin bổ sung <span className="font-normal opacity-60">(tùy chọn)</span></span>
                {showExtra ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showExtra && (
                <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
                  <Field label="Tên thương hiệu">
                    <input className={INPUT} value={form.brandName} onChange={set('brandName')} placeholder="Cà Phê Việt" />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Email liên hệ" error={errors.email}>
                      <input className={INPUT} type="email" value={form.email} onChange={set('email')}
                        placeholder="contact@business.vn" />
                    </Field>
                    <Field label="Số điện thoại doanh nghiệp">
                      <input className={INPUT} value={form.phone} onChange={set('phone')} placeholder="0901234567" />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Mã số thuế">
                      <input className={INPUT} value={form.taxCode} onChange={set('taxCode')} placeholder="0312345678" />
                    </Field>
                    <Field label="Gói dịch vụ">
                      <select className={INPUT} value={form.plan} onChange={set('plan')}>
                        {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Website" error={errors.website}>
                    <div className="relative">
                      <Globe2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input className={`${INPUT} pl-8`} value={form.website} onChange={set('website')}
                        placeholder="https://business.vn" />
                    </div>
                  </Field>
                  <Field label="Địa chỉ pháp lý">
                    <textarea className={INPUT} rows={2} value={form.legalAddress} onChange={set('legalAddress')}
                      placeholder="Địa chỉ đăng ký kinh doanh" />
                  </Field>
                  <Field label="Ghi chú">
                    <textarea className={INPUT} rows={2} value={form.note} onChange={set('note')}
                      placeholder="Nguồn lead, yêu cầu đặc biệt..." />
                  </Field>
                </div>
              )}
            </div>

            {mutation.isError && (
              <div ref={errorRef} className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {(mutation.error as any)?.response?.data?.message ?? 'Tạo doanh nghiệp thất bại. Vui lòng thử lại.'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-md border border-input px-4 py-2 text-sm font-medium transition hover:bg-muted">
            Hủy
          </button>
          <button type="button" onClick={submit} disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
            Tạo doanh nghiệp
          </button>
        </div>
      </div>
    </div>
  );
}
