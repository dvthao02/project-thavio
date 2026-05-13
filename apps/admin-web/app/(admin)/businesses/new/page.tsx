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
  email: string;
  phone?: string;
  timezone: string;
  plan: string;
  firstStore: {
    storeName: string;
    storeCode?: string;
    address?: string;
    city?: string;
  };
  ownerEmail: string;
  ownerPassword: string;
  ownerFullName: string;
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring';

export default function NewBusinessPage() {
  const router = useRouter();

  const [biz, setBiz] = useState({
    businessCode: '',
    legalName: '',
    brandName: '',
    email: '',
    phone: '',
    timezone: 'Asia/Ho_Chi_Minh',
    plan: 'standard',
  });
  const [store, setStore] = useState({ storeName: '', storeCode: '', address: '', city: '' });
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
      setError(msg ?? 'Tạo doanh nghiệp thất bại.');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const payload: CreateBusinessPayload = {
      businessCode: biz.businessCode,
      legalName: biz.legalName,
      ...(biz.brandName && { brandName: biz.brandName }),
      email: biz.email,
      ...(biz.phone && { phone: biz.phone }),
      timezone: biz.timezone,
      plan: biz.plan,
      firstStore: {
        storeName: store.storeName,
        ...(store.storeCode && { storeCode: store.storeCode }),
        ...(store.address && { address: store.address }),
        ...(store.city && { city: store.city }),
      },
      ownerEmail: owner.ownerEmail,
      ownerPassword: owner.ownerPassword,
      ownerFullName: owner.ownerFullName,
    };
    mutation.mutate(payload);
  }

  const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
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
        {/* Thông tin doanh nghiệp */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Thông tin doanh nghiệp</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mã doanh nghiệp" required>
              <input
                value={biz.businessCode}
                onChange={(e) => setBiz({ ...biz, businessCode: e.target.value })}
                className={inputCls}
                placeholder="vd: my_coffee"
                required
                pattern="[a-z0-9_]{3,50}"
                title="Chỉ dùng chữ thường, số, dấu gạch dưới (3–50 ký tự)"
              />
            </Field>
            <Field label="Tên pháp lý" required>
              <input
                value={biz.legalName}
                onChange={(e) => setBiz({ ...biz, legalName: e.target.value })}
                className={inputCls}
                placeholder="Công ty TNHH Cà Phê"
                required
              />
            </Field>
          </div>

          <Field label="Tên thương hiệu">
            <input
              value={biz.brandName}
              onChange={(e) => setBiz({ ...biz, brandName: e.target.value })}
              className={inputCls}
              placeholder="Tên hiển thị (để trống = dùng tên pháp lý)"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email liên hệ" required>
              <input
                value={biz.email}
                onChange={(e) => setBiz({ ...biz, email: e.target.value })}
                className={inputCls}
                type="email"
                placeholder="contact@business.vn"
                required
              />
            </Field>
            <Field label="Số điện thoại">
              <input
                value={biz.phone}
                onChange={(e) => setBiz({ ...biz, phone: e.target.value })}
                className={inputCls}
                placeholder="0901234567"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Múi giờ">
              <select
                value={biz.timezone}
                onChange={(e) => setBiz({ ...biz, timezone: e.target.value })}
                className={inputCls}
              >
                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option>
                <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                <option value="UTC">UTC</option>
              </select>
            </Field>
            <Field label="Gói dịch vụ">
              <select
                value={biz.plan}
                onChange={(e) => setBiz({ ...biz, plan: e.target.value })}
                className={inputCls}
              >
                <option value="starter">Starter</option>
                <option value="standard">Standard</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Chi nhánh đầu tiên */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Chi nhánh đầu tiên</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tên chi nhánh" required>
              <input
                value={store.storeName}
                onChange={(e) => setStore({ ...store, storeName: e.target.value })}
                className={inputCls}
                placeholder="Chi nhánh chính"
                required
              />
            </Field>
            <Field label="Mã chi nhánh">
              <input
                value={store.storeCode}
                onChange={(e) => setStore({ ...store, storeCode: e.target.value })}
                className={inputCls}
                placeholder="STORE001"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Địa chỉ">
              <input
                value={store.address}
                onChange={(e) => setStore({ ...store, address: e.target.value })}
                className={inputCls}
                placeholder="123 Nguyễn Huệ"
              />
            </Field>
            <Field label="Thành phố">
              <input
                value={store.city}
                onChange={(e) => setStore({ ...store, city: e.target.value })}
                className={inputCls}
                placeholder="Hồ Chí Minh"
              />
            </Field>
          </div>
        </div>

        {/* Tài khoản chủ sở hữu */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Tài khoản chủ sở hữu</h2>
          <p className="text-xs text-muted-foreground -mt-2">
            Tài khoản đăng nhập vào POS/admin cửa hàng, được gán role OWNER.
          </p>
          <Field label="Họ và tên" required>
            <input
              value={owner.ownerFullName}
              onChange={(e) => setOwner({ ...owner, ownerFullName: e.target.value })}
              className={inputCls}
              placeholder="Nguyễn Văn A"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email đăng nhập" required>
              <input
                value={owner.ownerEmail}
                onChange={(e) => setOwner({ ...owner, ownerEmail: e.target.value })}
                className={inputCls}
                type="email"
                placeholder="owner@business.vn"
                required
              />
            </Field>
            <Field label="Mật khẩu" required>
              <input
                value={owner.ownerPassword}
                onChange={(e) => setOwner({ ...owner, ownerPassword: e.target.value })}
                className={inputCls}
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                required
                minLength={8}
              />
            </Field>
          </div>
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
