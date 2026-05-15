'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  FileText,
  Globe2,
  ImageIcon,
  MapPin,
  Store,
  User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

type Step = 1 | 2 | 3;

const INPUT =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50';

const DEFAULT_BIZ = {
  businessCode: '',
  legalName: '',
  brandName: '',
  email: '',
  phone: '',
  taxCode: '',
  website: '',
  legalAddress: '',
  note: '',
  currencyCode: 'VND',
  timezone: 'Asia/Ho_Chi_Minh',
  plan: 'standard',
};

const DEFAULT_STORE = {
  storeName: '',
  storeCode: '',
  logoUrl: '',
  email: '',
  phone: '',
  addressLine: '',
  provinceName: '',
  districtName: '',
  wardName: '',
};

const DEFAULT_OWNER = {
  ownerFullName: '',
  ownerEmail: '',
  ownerPhone: '',
  ownerStaffCode: '',
  ownerPassword: '',
  confirmPassword: '',
};

const STEPS = [
  { num: 1 as Step, label: 'Doanh nghiệp', icon: Building2 },
  { num: 2 as Step, label: 'Cửa hàng', icon: Store },
  { num: 3 as Step, label: 'Chủ sở hữu', icon: User },
];

const TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Việt Nam (UTC+7)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (UTC+7)' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
  { value: 'UTC', label: 'UTC' },
];

const PLANS = [
  { value: 'starter', label: 'Starter' },
  { value: 'standard', label: 'Tiêu chuẩn' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

const CURRENCIES = [
  { value: 'VND', label: 'VND' },
  { value: 'USD', label: 'USD' },
];

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

function validateStep1(form: typeof DEFAULT_BIZ) {
  const errors: Record<string, string> = {};
  if (!form.legalName.trim()) errors.legalName = 'Bắt buộc';
  if (!form.businessCode.trim()) errors.businessCode = 'Bắt buộc';
  else if (!/^[a-z0-9_]{3,50}$/.test(form.businessCode)) {
    errors.businessCode = 'Chỉ dùng chữ thường, số và dấu gạch dưới, từ 3 đến 50 ký tự';
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email không hợp lệ';
  if (form.website && !/^https?:\/\/.+\..+/.test(form.website)) errors.website = 'Website cần bắt đầu bằng http:// hoặc https://';
  return errors;
}

function validateStep2(form: typeof DEFAULT_STORE) {
  const errors: Record<string, string> = {};
  if (!form.storeName.trim()) errors.storeName = 'Bắt buộc';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.storeEmail = 'Email không hợp lệ';
  if (form.logoUrl && !/^https?:\/\/.+\..+/.test(form.logoUrl)) errors.logoUrl = 'Logo cần là URL hợp lệ';
  return errors;
}

function validateStep3(form: typeof DEFAULT_OWNER) {
  const errors: Record<string, string> = {};
  if (!form.ownerFullName.trim()) errors.ownerFullName = 'Bắt buộc';
  if (!form.ownerEmail && !form.ownerPhone) errors.ownerEmail = 'Cần ít nhất email hoặc số điện thoại';
  if (form.ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail)) errors.ownerEmail = 'Email không hợp lệ';
  if (!form.ownerPassword) errors.ownerPassword = 'Bắt buộc';
  else if (form.ownerPassword.length < 8) errors.ownerPassword = 'Tối thiểu 8 ký tự';
  if (form.confirmPassword && form.ownerPassword !== form.confirmPassword) errors.confirmPassword = 'Mật khẩu không khớp';
  return errors;
}

function buildStoreAddress(store: typeof DEFAULT_STORE) {
  return [store.addressLine, store.wardName, store.districtName, store.provinceName].filter(Boolean).join(', ');
}

export default function NewBusinessPage() {
  const router = useRouter();
  const topRef = useRef<HTMLDivElement>(null);
  const { permissions } = useAuthStore();
  const canCreate = permissions.includes('platform.business.create');
  const [mounted, setMounted] = useState(false);

  const [step, setStep] = useState<Step>(1);
  const [biz, setBiz] = useState(DEFAULT_BIZ);
  const [store, setStore] = useState(DEFAULT_STORE);
  const [owner, setOwner] = useState(DEFAULT_OWNER);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugEdited, setSlugEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !canCreate) router.replace('/businesses');
  }, [mounted, canCreate, router]);

  useEffect(() => {
    if (!slugEdited && biz.legalName) {
      setBiz((current) => ({ ...current, businessCode: toSlug(biz.legalName) }));
    }
  }, [biz.legalName, slugEdited]);

  const mutation = useMutation({
    mutationFn: (payload: object) => api.post('/platform/businesses', payload).then((res) => res.data),
    onSuccess: (data) => router.push(`/businesses/${data.id}`),
  });

  function scrollTop() {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function next() {
    const nextErrors = step === 1 ? validateStep1(biz) : validateStep2(store);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setStep((value) => (value + 1) as Step);
    scrollTop();
  }

  function back() {
    setErrors({});
    setStep((value) => (value - 1) as Step);
    scrollTop();
  }

  function submit() {
    const nextErrors = validateStep3(owner);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const address = buildStoreAddress(store);
    setErrors({});
    mutation.mutate({
      businessCode: biz.businessCode,
      legalName: biz.legalName,
      ...(biz.brandName && { brandName: biz.brandName }),
      ...(biz.email && { email: biz.email }),
      ...(biz.phone && { phone: biz.phone }),
      ...(biz.taxCode && { taxCode: biz.taxCode }),
      ...(biz.website && { website: biz.website }),
      ...(biz.legalAddress && { legalAddress: biz.legalAddress }),
      ...(biz.note && { note: biz.note }),
      currencyCode: biz.currencyCode,
      timezone: biz.timezone,
      plan: biz.plan,
      firstStore: {
        storeName: store.storeName,
        storeCode: store.storeCode || 'STORE001',
        ...(store.logoUrl && { logoUrl: store.logoUrl }),
        ...(store.email && { email: store.email }),
        ...(store.phone && { phone: store.phone }),
        ...(address && { address }),
        ...(store.provinceName && { city: store.provinceName }),
      },
      ownerFullName: owner.ownerFullName,
      ...(owner.ownerEmail && { ownerEmail: owner.ownerEmail }),
      ...(owner.ownerPhone && { ownerPhone: owner.ownerPhone }),
      ...(owner.ownerStaffCode && { ownerStaffCode: owner.ownerStaffCode }),
      ownerPassword: owner.ownerPassword,
    });
  }

  if (!mounted || !canCreate) return null;

  if (mutation.isPending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
        <div className="flex max-w-sm flex-col items-center gap-5 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Building2 size={28} className="text-primary" />
            <svg className="absolute inset-0 h-full w-full animate-spin" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeDasharray="44 132"
                strokeWidth="3"
                className="text-primary"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Đang khởi tạo doanh nghiệp</p>
            <p className="mt-1 text-sm text-muted-foreground">Quá trình này thường mất khoảng 5 đến 15 giây.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef} className="w-full px-1">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/businesses" className="text-muted-foreground transition-colors hover:text-foreground">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tạo doanh nghiệp mới</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Doanh nghiệp mới bắt đầu với 10 ngày dùng thử miễn phí.
          </p>
        </div>
      </div>

      <div className="mb-6 flex w-full items-center px-6">
        {STEPS.map(({ num, label, icon: Icon }, index) => {
          const done = step > num;
          const active = step === num;
          return (
            <div key={num} className="flex flex-1 items-center">
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                    done
                      ? 'border-primary bg-primary text-primary-foreground'
                      : active
                        ? 'border-primary bg-background text-primary'
                        : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  {done ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <span className={`whitespace-nowrap text-xs font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <div className={`mx-3 mb-5 h-px flex-1 transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
              ) : null}
            </div>
          );
        })}
      </div>

      {step === 1 ? (
        <div className="grid w-full items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="h-full space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <Building2 size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Thông tin doanh nghiệp</h2>
          </div>

          <Field label="Tên pháp lý" required error={errors.legalName}>
            <input
              autoFocus
              className={INPUT}
              value={biz.legalName}
              onChange={(event) => setBiz((current) => ({ ...current, legalName: event.target.value }))}
              placeholder="Công ty TNHH Cà Phê Việt"
            />
          </Field>

          <Field
            label="Mã doanh nghiệp"
            required
            error={errors.businessCode}
            hint="Dùng làm mã định danh và schema dữ liệu, không nên đổi sau khi tạo."
          >
            <input
              className={INPUT}
              value={biz.businessCode}
              onChange={(event) => {
                setSlugEdited(true);
                setBiz((current) => ({ ...current, businessCode: event.target.value }));
              }}
              placeholder="ca_phe_viet"
            />
          </Field>

          <Field label="Tên thương hiệu" hint="Nếu để trống sẽ dùng tên pháp lý.">
            <input
              className={INPUT}
              value={biz.brandName}
              onChange={(event) => setBiz((current) => ({ ...current, brandName: event.target.value }))}
              placeholder="Cà Phê Việt"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Email liên hệ" error={errors.email}>
              <input
                className={INPUT}
                type="email"
                value={biz.email}
                onChange={(event) => setBiz((current) => ({ ...current, email: event.target.value }))}
                placeholder="contact@business.vn"
              />
            </Field>
            <Field label="Số điện thoại">
              <input
                className={INPUT}
                value={biz.phone}
                onChange={(event) => setBiz((current) => ({ ...current, phone: event.target.value }))}
                placeholder="0901234567"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Múi giờ">
              <select
                className={INPUT}
                value={biz.timezone}
                onChange={(event) => setBiz((current) => ({ ...current, timezone: event.target.value }))}
              >
                {TIMEZONES.map((timezone) => (
                  <option key={timezone.value} value={timezone.value}>
                    {timezone.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Gói dịch vụ" hint="Doanh nghiệp vẫn bắt đầu bằng 10 ngày dùng thử.">
              <select
                className={INPUT}
                value={biz.plan}
                onChange={(event) => setBiz((current) => ({ ...current, plan: event.target.value }))}
              >
                {PLANS.map((plan) => (
                  <option key={plan.value} value={plan.value}>
                    {plan.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <div className="flex h-full flex-col space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Thông tin bổ sung</h2>
          </div>

          <Field label="Mã số thuế">
            <input
              className={INPUT}
              value={biz.taxCode}
              onChange={(event) => setBiz((current) => ({ ...current, taxCode: event.target.value }))}
              placeholder="0312345678"
            />
          </Field>

          <Field label="Website" error={errors.website}>
            <div className="relative">
              <Globe2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${INPUT} pl-8`}
                value={biz.website}
                onChange={(event) => setBiz((current) => ({ ...current, website: event.target.value }))}
                placeholder="https://business.vn"
              />
            </div>
          </Field>

          <Field label="Tiền tệ">
            <select
              className={INPUT}
              value={biz.currencyCode}
              onChange={(event) => setBiz((current) => ({ ...current, currencyCode: event.target.value }))}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Địa chỉ pháp lý">
            <textarea
              className={INPUT}
              rows={3}
              value={biz.legalAddress}
              onChange={(event) => setBiz((current) => ({ ...current, legalAddress: event.target.value }))}
              placeholder="Địa chỉ đăng ký kinh doanh"
            />
          </Field>

          <Field label="Ghi chú vận hành">
            <textarea
              className={INPUT}
              rows={3}
              value={biz.note}
              onChange={(event) => setBiz((current) => ({ ...current, note: event.target.value }))}
              placeholder="Nguồn lead, yêu cầu đặc biệt, thông tin onboarding..."
            />
          </Field>

        </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="w-full space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <Store size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Cửa hàng đầu tiên</h2>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Cửa hàng mặc định để doanh nghiệp bắt đầu sử dụng. Có thể thêm chi nhánh khác sau.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tên cửa hàng" required error={errors.storeName}>
              <input
                autoFocus
                className={INPUT}
                value={store.storeName}
                onChange={(event) => setStore((current) => ({ ...current, storeName: event.target.value }))}
                placeholder="Chi nhánh chính"
              />
            </Field>
            <Field label="Mã cửa hàng" hint="Để trống sẽ dùng STORE001.">
              <input
                className={INPUT}
                value={store.storeCode}
                onChange={(event) => setStore((current) => ({ ...current, storeCode: event.target.value }))}
                placeholder="STORE001"
              />
            </Field>
          </div>

          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-4">
              <div className="flex h-24 items-center justify-center overflow-hidden rounded-md bg-background">
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.logoUrl} alt="Logo cửa hàng" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon size={24} />
                    <span className="text-xs">Logo cửa hàng</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="URL logo cửa hàng" error={errors.logoUrl} hint="Hiện dùng URL ảnh. Backend cần bổ sung upload nếu muốn lưu file.">
                <input
                  className={INPUT}
                  value={store.logoUrl}
                  onChange={(event) => setStore((current) => ({ ...current, logoUrl: event.target.value }))}
                  placeholder="https://cdn.business.vn/logo.png"
                />
              </Field>
              <Field label="Email cửa hàng" error={errors.storeEmail}>
                <input
                  className={INPUT}
                  type="email"
                  value={store.email}
                  onChange={(event) => setStore((current) => ({ ...current, email: event.target.value }))}
                  placeholder="store@business.vn"
                />
              </Field>
              <Field label="Số điện thoại cửa hàng">
                <input
                  className={INPUT}
                  value={store.phone}
                  onChange={(event) => setStore((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="0901234567"
                />
              </Field>
            </div>
          </div>

          <div className="space-y-4 rounded-md border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Khu vực cửa hàng</h3>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Field label="Tỉnh / Thành phố">
                <input
                  className={INPUT}
                  value={store.provinceName}
                  onChange={(event) => setStore((current) => ({ ...current, provinceName: event.target.value }))}
                  placeholder="Hồ Chí Minh"
                />
              </Field>
              <Field label="Quận / Huyện">
                <input
                  className={INPUT}
                  value={store.districtName}
                  onChange={(event) => setStore((current) => ({ ...current, districtName: event.target.value }))}
                  placeholder="Quận 1"
                />
              </Field>
              <Field label="Phường / Xã">
                <input
                  className={INPUT}
                  value={store.wardName}
                  onChange={(event) => setStore((current) => ({ ...current, wardName: event.target.value }))}
                  placeholder="Bến Nghé"
                />
              </Field>
            </div>

            <Field label="Địa chỉ chi tiết" hint="Số nhà, tên đường, tòa nhà hoặc khu vực nhận diện.">
              <input
                className={INPUT}
                value={store.addressLine}
                onChange={(event) => setStore((current) => ({ ...current, addressLine: event.target.value }))}
                placeholder="123 Nguyễn Huệ"
              />
            </Field>
          </div>

          {store.storeName ? (
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Store size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{store.storeName}</p>
                  <p className="text-xs text-muted-foreground">{buildStoreAddress(store) || 'Chưa có địa chỉ'}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="w-full space-y-4">
          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div className="mb-1 flex items-center gap-2">
              <User size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Tài khoản chủ sở hữu</h2>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Tài khoản đầu tiên trong doanh nghiệp, được gán vai trò OWNER trong cửa hàng.
            </p>

            <Field label="Họ và tên" required error={errors.ownerFullName}>
              <input
                autoFocus
                className={INPUT}
                value={owner.ownerFullName}
                onChange={(event) => setOwner((current) => ({ ...current, ownerFullName: event.target.value }))}
                placeholder="Nguyễn Văn A"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Email đăng nhập"
                error={errors.ownerEmail}
                hint={!owner.ownerEmail && !owner.ownerPhone ? 'Cần ít nhất email hoặc số điện thoại.' : undefined}
              >
                <input
                  className={INPUT}
                  type="email"
                  value={owner.ownerEmail}
                  onChange={(event) => setOwner((current) => ({ ...current, ownerEmail: event.target.value }))}
                  placeholder="owner@business.vn"
                />
              </Field>
              <Field label="Số điện thoại đăng nhập">
                <input
                  className={INPUT}
                  value={owner.ownerPhone}
                  onChange={(event) => setOwner((current) => ({ ...current, ownerPhone: event.target.value }))}
                  placeholder="0901234567"
                />
              </Field>
            </div>

            <Field label="Mã nhân viên" hint="Để trống sẽ dùng OWN001.">
              <input
                className={INPUT}
                value={owner.ownerStaffCode}
                onChange={(event) => setOwner((current) => ({ ...current, ownerStaffCode: event.target.value }))}
                placeholder="OWN001"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Mật khẩu" required error={errors.ownerPassword}>
                <div className="relative">
                  <input
                    className={`${INPUT} pr-9`}
                    type={showPassword ? 'text' : 'password'}
                    value={owner.ownerPassword}
                    onChange={(event) => setOwner((current) => ({ ...current, ownerPassword: event.target.value }))}
                    placeholder="Tối thiểu 8 ký tự"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              <Field label="Xác nhận mật khẩu" error={errors.confirmPassword}>
                <div className="relative">
                  <input
                    className={`${INPUT} pr-9`}
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={owner.confirmPassword}
                    onChange={(event) => setOwner((current) => ({ ...current, confirmPassword: event.target.value }))}
                    placeholder="Nhập lại mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs md:grid-cols-2">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Mã doanh nghiệp</span>
              <code className="rounded bg-muted px-1.5 py-0.5">{biz.businessCode || '-'}</code>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Gói</span>
              <span className="font-medium">{PLANS.find((plan) => plan.value === biz.plan)?.label ?? biz.plan}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Doanh nghiệp</span>
              <span className="max-w-[220px] truncate font-medium">{biz.legalName || '-'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Cửa hàng</span>
              <span className="max-w-[220px] truncate font-medium">{store.storeName || '-'}</span>
            </div>
          </div>

          {mutation.isError ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {(mutation.error as any)?.response?.data?.message ?? 'Tạo doanh nghiệp thất bại. Vui lòng thử lại.'}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex w-full items-center justify-between">
        <div>
          {step > 1 ? (
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <ArrowLeft size={15} />
              Quay lại
            </button>
          ) : (
            <Link
              href="/businesses"
              className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <ArrowLeft size={15} />
              Hủy
            </Link>
          )}
        </div>

        {step < 3 ? (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Tiếp theo
            <ArrowRight size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            <Building2 size={15} />
            Tạo doanh nghiệp
          </button>
        )}
      </div>
    </div>
  );
}
