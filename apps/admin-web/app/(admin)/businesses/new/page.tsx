'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2,
  ChevronLeft, Clock3, Eye, EyeOff, Package, Shield, Sparkles, Store, User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

// ── Helpers ────────────────────────────────────────────────────────────────────

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

const INPUT = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50';

function Field({
  label, required, hint, error, children,
}: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Plan config ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    key: 'starter',
    label: 'Starter',
    desc: 'Phù hợp kinh doanh nhỏ',
    features: ['1 cửa hàng', '5 tài khoản', 'POS cơ bản'],
    cls: 'border-slate-200 text-slate-600',
    activeCls: 'border-slate-500 bg-slate-50',
    icon: Package,
  },
  {
    key: 'standard',
    label: 'Standard',
    desc: 'Tiêu chuẩn cho SMB',
    features: ['3 cửa hàng', '15 tài khoản', 'Báo cáo nâng cao'],
    cls: 'border-primary/30 text-primary',
    activeCls: 'border-primary bg-primary/5',
    icon: Sparkles,
  },
  {
    key: 'professional',
    label: 'Professional',
    desc: 'Chuỗi cửa hàng',
    features: ['Không giới hạn', 'API access', 'Ưu tiên hỗ trợ'],
    cls: 'border-cyan-200 text-cyan-700',
    activeCls: 'border-cyan-500 bg-cyan-50',
    icon: Shield,
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    desc: 'Doanh nghiệp lớn',
    features: ['SLA tùy chỉnh', 'Onboarding riêng', 'Tích hợp ERP'],
    cls: 'border-slate-700 text-slate-900',
    activeCls: 'border-slate-900 bg-slate-900 text-white',
    icon: Clock3,
  },
] as const;

const TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Hồ Chí Minh (UTC+7)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (UTC+7)' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
  { value: 'UTC', label: 'UTC' },
];

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

const STEPS = [
  { num: 1 as Step, label: 'Doanh nghiệp', icon: Building2 },
  { num: 2 as Step, label: 'Cửa hàng',     icon: Store },
  { num: 3 as Step, label: 'Chủ sở hữu',   icon: User },
];

const DEFAULT_BIZ = {
  businessCode: '', legalName: '', brandName: '',
  email: '', phone: '', timezone: 'Asia/Ho_Chi_Minh', plan: 'standard' as string,
};
const DEFAULT_STORE = { storeName: '', storeCode: '', address: '', city: '' };
const DEFAULT_OWNER = { ownerFullName: '', ownerEmail: '', ownerPassword: '', confirmPassword: '' };

// ── Validation ──────────────────────────────────────────────────────────────────

function validateStep1(f: typeof DEFAULT_BIZ): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!f.legalName.trim()) errs.legalName = 'Bắt buộc';
  if (!f.businessCode) errs.businessCode = 'Bắt buộc';
  else if (!/^[a-z0-9_]{3,50}$/.test(f.businessCode))
    errs.businessCode = 'Chỉ dùng chữ thường, số, dấu gạch dưới (3–50 ký tự)';
  if (!f.email) errs.email = 'Bắt buộc';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errs.email = 'Email không hợp lệ';
  return errs;
}

function validateStep2(f: typeof DEFAULT_STORE): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!f.storeName.trim()) errs.storeName = 'Bắt buộc';
  return errs;
}

function validateStep3(f: typeof DEFAULT_OWNER): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!f.ownerFullName.trim()) errs.ownerFullName = 'Bắt buộc';
  if (!f.ownerEmail) errs.ownerEmail = 'Bắt buộc';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.ownerEmail)) errs.ownerEmail = 'Email không hợp lệ';
  if (!f.ownerPassword) errs.ownerPassword = 'Bắt buộc';
  else if (f.ownerPassword.length < 8) errs.ownerPassword = 'Tối thiểu 8 ký tự';
  if (f.ownerPassword && f.confirmPassword && f.ownerPassword !== f.confirmPassword)
    errs.confirmPassword = 'Mật khẩu không khớp';
  return errs;
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function NewBusinessPage() {
  const router = useRouter();
  const { permissions } = useAuthStore();
  const canCreate = permissions.includes('platform.business.create');

  const [step, setStep] = useState<Step>(1);
  const [biz, setBiz] = useState(DEFAULT_BIZ);
  const [store, setStore] = useState(DEFAULT_STORE);
  const [owner, setOwner] = useState(DEFAULT_OWNER);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canCreate) router.replace('/businesses');
  }, [canCreate, router]);

  // Auto-derive businessCode from legalName
  useEffect(() => {
    if (!slugEdited && biz.legalName) {
      setBiz((f) => ({ ...f, businessCode: toSlug(f.legalName) }));
    }
  }, [biz.legalName, slugEdited]);

  const mutation = useMutation({
    mutationFn: (payload: object) => api.post('/platform/businesses', payload).then((r) => r.data),
    onSuccess: (data) => router.push(`/businesses/${data.id}`),
  });

  function next() {
    const validate = step === 1 ? validateStep1(biz) : step === 2 ? validateStep2(store) : {};
    if (Object.keys(validate).length > 0) { setErrors(validate); return; }
    setErrors({});
    setStep((s) => (s + 1) as Step);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function back() {
    setErrors({});
    setStep((s) => (s - 1) as Step);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function submit() {
    const errs = validateStep3(owner);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    mutation.mutate({
      businessCode: biz.businessCode,
      legalName: biz.legalName,
      ...(biz.brandName && { brandName: biz.brandName }),
      email: biz.email,
      ...(biz.phone && { phone: biz.phone }),
      timezone: biz.timezone,
      plan: biz.plan,
      firstStore: {
        storeName: store.storeName,
        storeCode: store.storeCode || 'STORE001',
        ...(store.address && { address: store.address }),
        ...(store.city && { city: store.city }),
      },
      ownerEmail: owner.ownerEmail,
      ownerPassword: owner.ownerPassword,
      ownerFullName: owner.ownerFullName,
    });
  }

  if (!canCreate) return null;

  // ── Provisioning loading overlay ──
  if (mutation.isPending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-5 text-center px-8">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Building2 size={28} className="text-primary" />
            <svg className="absolute inset-0 h-full w-full animate-spin" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3"
                strokeDasharray="44 132" className="text-primary" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Đang khởi tạo doanh nghiệp</p>
            <p className="mt-1 text-sm text-muted-foreground">Đang tạo schema, cửa hàng và tài khoản chủ…</p>
          </div>
          <div className="flex flex-col gap-2 text-xs text-muted-foreground">
            {['Tạo cơ sở dữ liệu riêng', 'Áp dụng quy tắc nghiệp vụ', 'Tạo tài khoản chủ sở hữu'].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedPlan = PLANS.find((p) => p.key === biz.plan) ?? PLANS[1];

  return (
    <div className="max-w-2xl" ref={topRef}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/businesses" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">Tạo doanh nghiệp mới</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Khởi tạo doanh nghiệp và cửa hàng đầu tiên trên nền tảng</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="mb-7">
        <div className="flex items-center">
          {STEPS.map(({ num, label, icon: Icon }, idx) => {
            const done = step > num;
            const active = step === num;
            return (
              <div key={num} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                    done  ? 'border-primary bg-primary text-primary-foreground' :
                    active ? 'border-primary bg-background text-primary' :
                             'border-border bg-background text-muted-foreground'
                  }`}>
                    {done ? <Check size={16} /> : <Icon size={16} />}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'
                  }`}>{label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-3 mb-5 transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Doanh nghiệp */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Thông tin doanh nghiệp</h2>
            </div>

            <Field label="Tên pháp lý" required error={errors.legalName}>
              <input
                className={INPUT}
                value={biz.legalName}
                onChange={(e) => setBiz((f) => ({ ...f, legalName: e.target.value }))}
                placeholder="Công ty TNHH Cà Phê Việt"
                autoFocus
              />
            </Field>

            <Field
              label="Mã doanh nghiệp" required
              hint="Chỉ dùng chữ thường, số, dấu gạch dưới — dùng làm tên schema DB, không thể đổi sau khi tạo"
              error={errors.businessCode}
            >
              <div className="relative">
                <input
                  className={INPUT}
                  value={biz.businessCode}
                  onChange={(e) => { setSlugEdited(true); setBiz((f) => ({ ...f, businessCode: e.target.value })); }}
                  placeholder="vd: my_coffee"
                />
                {!slugEdited && biz.businessCode && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Tự động
                  </span>
                )}
              </div>
            </Field>

            <Field label="Tên thương hiệu" hint="Hiển thị trong POS — để trống sẽ dùng tên pháp lý">
              <input
                className={INPUT}
                value={biz.brandName}
                onChange={(e) => setBiz((f) => ({ ...f, brandName: e.target.value }))}
                placeholder="Cà Phê Việt"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Email liên hệ" required error={errors.email}>
                <input
                  type="email"
                  className={INPUT}
                  value={biz.email}
                  onChange={(e) => setBiz((f) => ({ ...f, email: e.target.value }))}
                  placeholder="contact@business.vn"
                />
              </Field>
              <Field label="Số điện thoại">
                <input
                  className={INPUT}
                  value={biz.phone}
                  onChange={(e) => setBiz((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="0901234567"
                />
              </Field>
            </div>

            <Field label="Múi giờ">
              <select
                className={INPUT}
                value={biz.timezone}
                onChange={(e) => setBiz((f) => ({ ...f, timezone: e.target.value }))}
              >
                {TIMEZONES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Plan selector */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Gói dịch vụ</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PLANS.map(({ key, label, desc, features, cls, activeCls, icon: PlanIcon }) => {
                const active = biz.plan === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBiz((f) => ({ ...f, plan: key }))}
                    className={`relative rounded-lg border-2 p-3.5 text-left transition-all ${
                      active ? activeCls : `border-border hover:border-muted-foreground/40 ${key === 'enterprise' ? 'bg-slate-50' : ''}`
                    }`}
                  >
                    {active && (
                      <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check size={11} />
                      </div>
                    )}
                    <PlanIcon size={18} className={active ? (key === 'enterprise' ? 'text-white' : cls.split(' ')[1]) : 'text-muted-foreground'} />
                    <p className={`mt-2 text-sm font-semibold ${active && key === 'enterprise' ? 'text-white' : 'text-foreground'}`}>{label}</p>
                    <p className={`text-xs mt-0.5 ${active && key === 'enterprise' ? 'text-slate-300' : 'text-muted-foreground'}`}>{desc}</p>
                    <ul className="mt-2.5 space-y-0.5">
                      {features.map((f) => (
                        <li key={f} className={`flex items-center gap-1.5 text-xs ${active && key === 'enterprise' ? 'text-slate-200' : 'text-muted-foreground'}`}>
                          <CheckCircle2 size={11} className={active ? (key === 'enterprise' ? 'text-slate-300' : 'text-primary') : 'text-muted-foreground/50'} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Cửa hàng */}
      {step === 2 && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Store size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Cửa hàng đầu tiên</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Cửa hàng mặc định để bắt đầu. Bạn có thể thêm cửa hàng khác sau khi khởi tạo.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tên cửa hàng" required error={errors.storeName}>
              <input
                className={INPUT}
                value={store.storeName}
                onChange={(e) => setStore((f) => ({ ...f, storeName: e.target.value }))}
                placeholder="Chi nhánh chính"
                autoFocus
              />
            </Field>
            <Field label="Mã cửa hàng" hint="Để trống → dùng STORE001">
              <input
                className={INPUT}
                value={store.storeCode}
                onChange={(e) => setStore((f) => ({ ...f, storeCode: e.target.value }))}
                placeholder="STORE001"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Địa chỉ">
              <input
                className={INPUT}
                value={store.address}
                onChange={(e) => setStore((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Nguyễn Huệ"
              />
            </Field>
            <Field label="Thành phố / Tỉnh">
              <input
                className={INPUT}
                value={store.city}
                onChange={(e) => setStore((f) => ({ ...f, city: e.target.value }))}
                placeholder="Hồ Chí Minh"
              />
            </Field>
          </div>

          {/* Preview */}
          <div className="mt-2 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Xem trước</p>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                <Store size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{store.storeName || 'Tên cửa hàng'}</p>
                <p className="text-xs text-muted-foreground">
                  {[store.city, store.address].filter(Boolean).join(', ') || 'Chưa có địa chỉ'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Chủ sở hữu */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Tài khoản chủ sở hữu</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Tài khoản đăng nhập vào POS / quản lý cửa hàng. Được gán role <strong>OWNER</strong> tự động.
            </p>

            <Field label="Họ và tên" required error={errors.ownerFullName}>
              <input
                className={INPUT}
                value={owner.ownerFullName}
                onChange={(e) => setOwner((f) => ({ ...f, ownerFullName: e.target.value }))}
                placeholder="Nguyễn Văn A"
                autoFocus
              />
            </Field>

            <Field label="Email đăng nhập" required error={errors.ownerEmail}>
              <input
                type="email"
                className={INPUT}
                value={owner.ownerEmail}
                onChange={(e) => setOwner((f) => ({ ...f, ownerEmail: e.target.value }))}
                placeholder="owner@business.vn"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Mật khẩu" required error={errors.ownerPassword}>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className={INPUT + ' pr-9'}
                    value={owner.ownerPassword}
                    onChange={(e) => setOwner((f) => ({ ...f, ownerPassword: e.target.value }))}
                    placeholder="≥ 8 ký tự"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {owner.ownerPassword && owner.ownerPassword.length >= 8 && !errors.ownerPassword && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <Check size={11} /> Đủ độ dài
                  </p>
                )}
              </Field>
              <Field label="Xác nhận mật khẩu" error={errors.confirmPassword}>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    className={INPUT + ' pr-9'}
                    value={owner.confirmPassword}
                    onChange={(e) => setOwner((f) => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Nhập lại mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {owner.confirmPassword && owner.ownerPassword === owner.confirmPassword && !errors.confirmPassword && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <Check size={11} /> Khớp
                  </p>
                )}
              </Field>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tóm tắt</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mã DN</span>
                <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">{biz.businessCode}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gói</span>
                <span className="font-medium text-foreground capitalize">{selectedPlan.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tên pháp lý</span>
                <span className="font-medium text-foreground truncate max-w-[140px]">{biz.legalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cửa hàng</span>
                <span className="font-medium text-foreground truncate max-w-[140px]">{store.storeName}</span>
              </div>
            </div>
          </div>

          {mutation.isError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {(mutation.error as any)?.response?.data?.message ?? 'Tạo doanh nghiệp thất bại. Vui lòng thử lại.'}
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          {step > 1 ? (
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted transition"
            >
              <ArrowLeft size={15} /> Quay lại
            </button>
          ) : (
            <Link
              href="/businesses"
              className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted transition"
            >
              <ArrowLeft size={15} /> Hủy
            </Link>
          )}
        </div>
        <div>
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
            >
              Tiếp theo <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
            >
              <Building2 size={15} /> Tạo doanh nghiệp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
