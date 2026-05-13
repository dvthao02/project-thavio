'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface CreateBusinessPayload {
  businessCode: string;
  legalName: string;
  brandName?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  plan: string;
  firstStore?: {
    storeName: string;
    storeCode: string;
  };
  ownerEmail?: string;
  ownerPassword?: string;
  ownerFullName?: string;
}

export default function NewBusinessPage() {
  const router = useRouter();
  const [form, setForm] = useState<CreateBusinessPayload>({
    businessCode: '',
    legalName: '',
    brandName: '',
    email: '',
    phone: '',
    timezone: 'Asia/Ho_Chi_Minh',
    plan: 'standard',
  });
  const [withStore, setWithStore] = useState(false);
  const [store, setStore] = useState({ storeName: '', storeCode: '' });
  const [withOwner, setWithOwner] = useState(false);
  const [owner, setOwner] = useState({ ownerEmail: '', ownerPassword: '', ownerFullName: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: CreateBusinessPayload) =>
      api.post('/platform/businesses', payload).then((r) => r.data),
    onSuccess: (data) => router.push(`/businesses/${data.id}`),
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? 'Failed to create business.');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const payload: CreateBusinessPayload = {
      businessCode: form.businessCode,
      legalName: form.legalName,
      ...(form.brandName && { brandName: form.brandName }),
      ...(form.email && { email: form.email }),
      ...(form.phone && { phone: form.phone }),
      timezone: form.timezone,
      plan: form.plan,
      ...(withStore && store.storeName && { firstStore: store }),
      ...(withOwner && owner.ownerEmail && { ...owner }),
    };
    mutation.mutate(payload);
  }

  const field = (label: string, children: React.ReactNode) => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );

  const input = (
    value: string,
    onChange: (v: string) => void,
    props?: React.InputHTMLAttributes<HTMLInputElement>,
  ) => (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      {...props}
    />
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/businesses" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Thêm doanh nghiệp</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Khởi tạo tenant mới trên nền tảng</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Thông tin doanh nghiệp</h2>
          <div className="grid grid-cols-2 gap-4">
            {field(
              'Mã doanh nghiệp *',
              input(form.businessCode, (v) => setForm({ ...form, businessCode: v }), {
                placeholder: 'test_coffee',
                required: true,
                pattern: '[a-z0-9_]{3,50}',
                title: 'Chỉ dùng chữ thường, số, dấu gạch dưới (3–50 ký tự)',
              }),
            )}
            {field(
              'Tên pháp lý *',
              input(form.legalName, (v) => setForm({ ...form, legalName: v }), {
                placeholder: 'Công ty TNHH Cà Phê',
                required: true,
              }),
            )}
          </div>
          {field(
            'Tên thương hiệu',
            input(form.brandName!, (v) => setForm({ ...form, brandName: v }), {
              placeholder: 'Tên hiển thị (tuỳ chọn)',
            }),
          )}
          <div className="grid grid-cols-2 gap-4">
            {field(
              'Email',
              input(form.email!, (v) => setForm({ ...form, email: v }), {
                type: 'email',
                placeholder: 'contact@business.vn',
              }),
            )}
            {field(
              'Số điện thoại',
              input(form.phone!, (v) => setForm({ ...form, phone: v }), {
                placeholder: '0901234567',
              }),
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field(
              'Múi giờ',
              <select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option>
                <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                <option value="UTC">UTC</option>
              </select>,
            )}
            {field(
              'Gói dịch vụ',
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="starter">Starter</option>
                <option value="standard">Standard</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>,
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Chi nhánh đầu tiên</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={withStore}
                onChange={(e) => setWithStore(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm text-muted-foreground">Thêm</span>
            </label>
          </div>
          {withStore && (
            <div className="grid grid-cols-2 gap-4">
              {field(
                'Tên chi nhánh',
                input(store.storeName, (v) => setStore({ ...store, storeName: v }), {
                  placeholder: 'Chi nhánh chính',
                }),
              )}
              {field(
                'Mã chi nhánh',
                input(store.storeCode, (v) => setStore({ ...store, storeCode: v }), {
                  placeholder: 'main',
                }),
              )}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Tài khoản chủ sở hữu</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={withOwner}
                onChange={(e) => setWithOwner(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm text-muted-foreground">Thêm</span>
            </label>
          </div>
          {withOwner && (
            <div className="space-y-4">
              {field(
                'Họ và tên',
                input(owner.ownerFullName, (v) => setOwner({ ...owner, ownerFullName: v }), {
                  placeholder: 'Nguyễn Văn A',
                }),
              )}
              <div className="grid grid-cols-2 gap-4">
                {field(
                  'Email',
                  input(owner.ownerEmail, (v) => setOwner({ ...owner, ownerEmail: v }), {
                    type: 'email',
                    placeholder: 'owner@business.vn',
                  }),
                )}
                {field(
                  'Mật khẩu',
                  input(owner.ownerPassword, (v) => setOwner({ ...owner, ownerPassword: v }), {
                    type: 'password',
                    placeholder: 'Tối thiểu 8 ký tự',
                  }),
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-md hover:bg-primary-600 disabled:opacity-50 transition"
          >
            {mutation.isPending ? 'Đang tạo…' : 'Tạo doanh nghiệp'}
          </button>
          <Link
            href="/businesses"
            className="text-sm font-medium px-5 py-2.5 rounded-md border border-input hover:bg-muted transition text-foreground"
          >
            Hủy
          </Link>
        </div>
      </form>
    </div>
  );
}
