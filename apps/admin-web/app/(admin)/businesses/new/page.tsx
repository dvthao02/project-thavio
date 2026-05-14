'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Building2, Check,
  ChevronLeft, Eye, EyeOff, Store, User,
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

const TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Hồ Chí Minh (UTC+7)' },
  { value: 'Asia/Bangkok',     label: 'Bangkok (UTC+7)' },
  { value: 'Asia/Singapore',   label: 'Singapore (UTC+8)' },
  { value: 'UTC',              label: 'UTC' },
];

const PLANS = [
  { value: 'starter',      label: 'Starter' },
  { value: 'standard',     label: 'Standard' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise',   label: 'Enterprise' },
];

const STAFF_ROLES = [
  { value: 'admin',     label: 'Quản trị viên' },
  { value: 'cashier',   label: 'Thu ngân' },
  { value: 'inventory', label: 'Thủ kho' },
  { value: 'kitchen',   label: 'Bếp / Pha chế' },
  { value: 'delivery',  label: 'Giao hàng' },
  { value: 'staff',     label: 'Nhân viên' },
];

// ── Steps ──────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

const STEPS = [
  { num: 1 as Step, label: 'Doanh nghiệp', icon: Building2 },
  { num: 2 as Step, label: 'Cửa hàng',     icon: Store },
  { num: 3 as Step, label: 'Chủ sở hữu',   icon: User },
];

// ── Validation ──────────────────────────────────────────────────────────────────

const DEFAULT_BIZ   = { businessCode: '', legalName: '', brandName: '', email: '', phone: '', timezone: 'Asia/Ho_Chi_Minh', plan: 'standard' };
const DEFAULT_STORE = { storeName: '', storeCode: '', address: '', city: '' };
const DEFAULT_OWNER = { ownerFullName: '', ownerEmail: '', ownerPhone: '', ownerStaffCode: '', ownerPassword: '', confirmPassword: '' };

function validateStep1(f: typeof DEFAULT_BIZ) {
  const e: Record<string, string> = {};
  if (!f.legalName.trim()) e.legalName = 'Bắt buộc';
  if (!f.businessCode) e.businessCode = 'Bắt buộc';
  else if (!/^[a-z0-9_]{3,50}$/.test(f.businessCode))
    e.businessCode = 'Chỉ dùng chữ thường, số, dấu gạch dưới (3–50 ký tự)';
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Email không hợp lệ';
  return e;
}

function validateStep2(f: typeof DEFAULT_STORE) {
  const e: Record<string, string> = {};
  if (!f.storeName.trim()) e.storeName = 'Bắt buộc';
  return e;
}

function validateStep3(f: typeof DEFAULT_OWNER) {
  const e: Record<string, string> = {};
  if (!f.ownerFullName.trim()) e.ownerFullName = 'Bắt buộc';
  if (!f.ownerEmail && !f.ownerPhone) e.ownerEmail = 'Cần ít nhất email hoặc số điện thoại';
  if (f.ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.ownerEmail)) e.ownerEmail = 'Email không hợp lệ';
  if (!f.ownerPassword) e.ownerPassword = 'Bắt buộc';
  else if (f.ownerPassword.length < 8) e.ownerPassword = 'Tối thiểu 8 ký tự';
  if (f.confirmPassword && f.ownerPassword !== f.confirmPassword) e.confirmPassword = 'Mật khẩu không khớp';
  return e;
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function NewBusinessPage() {
  const router = useRouter();
  const { permissions } = useAuthStore();
  const canCreate = permissions.includes('platform.business.create');

  const [step, setStep]   = useState<Step>(1);
  const [biz, setBiz]     = useState(DEFAULT_BIZ);
  const [store, setStore] = useState(DEFAULT_STORE);
  const [owner, setOwner] = useState(DEFAULT_OWNER);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPwd, setShowPwd]             = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!canCreate) router.replace('/businesses'); }, [canCreate, router]);

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
    const errs = step === 1 ? validateStep1(biz) : step === 2 ? validateStep2(store) : {};
    if (Object.keys(errs).length) { setErrors(errs); return; }
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
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    mutation.mutate({
      businessCode: biz.businessCode,
      legalName: biz.legalName,
      ...(biz.brandName && { brandName: biz.brandName }),
      ...(biz.email && { email: biz.email }),
      ...(biz.phone && { phone: biz.phone }),
      timezone: biz.timezone,
      plan: biz.plan,
      firstStore: {
        storeName: store.storeName,
        storeCode: store.storeCode || 'STORE001',
        ...(store.address && { address: store.address }),
        ...(store.city && { city: store.city }),
      },
      ownerFullName: owner.ownerFullName,
      ...(owner.ownerEmail && { ownerEmail: owner.ownerEmail }),
      ...(owner.ownerPhone && { ownerPhone: owner.ownerPhone }),
      ...(owner.ownerStaffCode && { ownerStaffCode: owner.ownerStaffCode }),
      ownerPassword: owner.ownerPassword,
    });
  }

  if (!canCreate) return null;

  // ── Provisioning overlay ──
  if (mutation.isPending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-5 text-center max-w-xs">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Building2 size={28} className="text-primary" />
            <svg className="absolute inset-0 h-full w-full animate-spin" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3"
                strokeDasharray="44 132" className="text-primary" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Đang khởi tạo doanh nghiệp</p>
            <p className="mt-1 text-sm text-muted-foreground">Quá trình này mất khoảng 5–15 giây</p>
          </div>
          <div className="w-full space-y-2 text-xs text-muted-foreground text-left">
            {['Tạo cơ sở dữ liệu riêng', 'Cài đặt nghiệp vụ & triggers', 'Tạo cửa hàng & tài khoản chủ'].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />{s}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl" ref={topRef}>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/businesses" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tạo doanh nghiệp mới</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Tất cả doanh nghiệp mới bắt đầu với 10 ngày dùng thử miễn phí</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="mb-7 flex items-center">
        {STEPS.map(({ num, label, icon: Icon }, idx) => {
          const done   = step > num;
          const active = step === num;
          return (
            <div key={num} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                  done   ? 'border-primary bg-primary text-primary-foreground' :
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

      {/* ── Step 1: Doanh nghiệp ── */}
      {step === 1 && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Thông tin doanh nghiệp</h2>
          </div>

          <Field label="Tên pháp lý" required error={errors.legalName}>
            <input
              className={INPUT} value={biz.legalName} autoFocus
              onChange={(e) => setBiz((f) => ({ ...f, legalName: e.target.value }))}
              placeholder="Công ty TNHH Cà Phê Việt"
            />
          </Field>

          <Field
            label="Mã doanh nghiệp" required error={errors.businessCode}
            hint="Chỉ chữ thường, số, dấu gạch dưới — dùng làm tên schema DB, không thể đổi sau khi tạo"
          >
            <div className="relative">
              <input
                className={INPUT} value={biz.businessCode}
                onChange={(e) => { setSlugEdited(true); setBiz((f) => ({ ...f, businessCode: e.target.value })); }}
                placeholder="vd: ca_phe_viet"
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
              className={INPUT} value={biz.brandName}
              onChange={(e) => setBiz((f) => ({ ...f, brandName: e.target.value }))}
              placeholder="Cà Phê Việt"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email liên hệ" error={errors.email}>
              <input
                type="email" className={INPUT} value={biz.email}
                onChange={(e) => setBiz((f) => ({ ...f, email: e.target.value }))}
                placeholder="contact@business.vn"
              />
            </Field>
            <Field label="Số điện thoại">
              <input
                className={INPUT} value={biz.phone}
                onChange={(e) => setBiz((f) => ({ ...f, phone: e.target.value }))}
                placeholder="0901234567"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Múi giờ">
              <select className={INPUT} value={biz.timezone} onChange={(e) => setBiz((f) => ({ ...f, timezone: e.target.value }))}>
                {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Gói dịch vụ" hint="Có thể thay đổi sau">
              <select className={INPUT} value={biz.plan} onChange={(e) => setBiz((f) => ({ ...f, plan: e.target.value }))}>
                {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
          </div>
        </div>
      )}

      {/* ── Step 2: Cửa hàng ── */}
      {step === 2 && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Store size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Cửa hàng đầu tiên</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Cửa hàng mặc định để bắt đầu. Có thể thêm cửa hàng khác sau.</p>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tên cửa hàng" required error={errors.storeName}>
              <input
                className={INPUT} value={store.storeName} autoFocus
                onChange={(e) => setStore((f) => ({ ...f, storeName: e.target.value }))}
                placeholder="Chi nhánh chính"
              />
            </Field>
            <Field label="Mã cửa hàng" hint="Để trống → STORE001">
              <input
                className={INPUT} value={store.storeCode}
                onChange={(e) => setStore((f) => ({ ...f, storeCode: e.target.value }))}
                placeholder="STORE001"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Địa chỉ">
              <input
                className={INPUT} value={store.address}
                onChange={(e) => setStore((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Nguyễn Huệ"
              />
            </Field>
            <Field label="Thành phố / Tỉnh">
              <input
                className={INPUT} value={store.city}
                onChange={(e) => setStore((f) => ({ ...f, city: e.target.value }))}
                placeholder="Hồ Chí Minh"
              />
            </Field>
          </div>

          {/* Preview */}
          {store.storeName && (
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Store size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{store.storeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {[store.city, store.address].filter(Boolean).join(' · ') || 'Chưa có địa chỉ'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Chủ sở hữu ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Tài khoản chủ sở hữu</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Tài khoản đăng nhập vào POS và quản lý cửa hàng — được gán role <strong>OWNER</strong>.
              Đăng nhập được bằng email, SĐT, hoặc mã nhân viên.
            </p>

            <Field label="Họ và tên" required error={errors.ownerFullName}>
              <input
                className={INPUT} value={owner.ownerFullName} autoFocus
                onChange={(e) => setOwner((f) => ({ ...f, ownerFullName: e.target.value }))}
                placeholder="Nguyễn Văn A"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Email đăng nhập" error={errors.ownerEmail}
                hint={!owner.ownerEmail && !owner.ownerPhone ? 'Cần ít nhất 1 trong 2' : undefined}>
                <input
                  type="email" className={INPUT} value={owner.ownerEmail}
                  onChange={(e) => setOwner((f) => ({ ...f, ownerEmail: e.target.value }))}
                  placeholder="owner@business.vn"
                />
              </Field>
              <Field label="Số điện thoại đăng nhập">
                <input
                  className={INPUT} value={owner.ownerPhone}
                  onChange={(e) => setOwner((f) => ({ ...f, ownerPhone: e.target.value }))}
                  placeholder="0901234567"
                />
              </Field>
            </div>

            <Field label="Mã nhân viên (staff_code)" hint="Để trống → OWN001 · Dùng để đăng nhập nhanh">
              <input
                className={INPUT} value={owner.ownerStaffCode}
                onChange={(e) => setOwner((f) => ({ ...f, ownerStaffCode: e.target.value }))}
                placeholder="OWN001"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Mật khẩu" required error={errors.ownerPassword}>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className={INPUT + ' pr-9'} value={owner.ownerPassword}
                    onChange={(e) => setOwner((f) => ({ ...f, ownerPassword: e.target.value }))}
                    placeholder="≥ 8 ký tự"
                  />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {owner.ownerPassword.length >= 8 && !errors.ownerPassword && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1"><Check size={11} /> Đủ độ dài</p>
                )}
              </Field>
              <Field label="Xác nhận mật khẩu" error={errors.confirmPassword}>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    className={INPUT + ' pr-9'} value={owner.confirmPassword}
                    onChange={(e) => setOwner((f) => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Nhập lại"
                  />
                  <button type="button" onClick={() => setShowConfirmPwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {owner.confirmPassword && owner.ownerPassword === owner.confirmPassword && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1"><Check size={11} /> Khớp</p>
                )}
              </Field>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Mã DN</span>
              <code className="bg-muted px-1.5 py-0.5 rounded">{biz.businessCode}</code></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Gói</span>
              <span className="font-medium capitalize">{biz.plan}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tên pháp lý</span>
              <span className="font-medium truncate max-w-[140px]">{biz.legalName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cửa hàng</span>
              <span className="font-medium truncate max-w-[140px]">{store.storeName}</span></div>
          </div>

          {mutation.isError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {(mutation.error as any)?.response?.data?.message ?? 'Tạo doanh nghiệp thất bại. Vui lòng thử lại.'}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          {step > 1
            ? <button type="button" onClick={back}
                className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted transition">
                <ArrowLeft size={15} /> Quay lại
              </button>
            : <Link href="/businesses"
                className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted transition">
                <ArrowLeft size={15} /> Hủy
              </Link>
          }
        </div>
        {step < 3
          ? <button type="button" onClick={next}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
              Tiếp theo <ArrowRight size={15} />
            </button>
          : <button type="button" onClick={submit} disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition">
              <Building2 size={15} /> Tạo doanh nghiệp
            </button>
        }
      </div>
    </div>
  );
}
