'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Building2, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface Business {
  id: string;
  businessCode: string;
  legalName: string;
  brandName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  subscriptionPlan: string;
  schemaName: string | null;
  timezoneName: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Hoạt động',  cls: 'bg-success/10 text-success' },
  trial:    { label: 'Dùng thử',   cls: 'bg-warning/10 text-warning' },
  suspended:{ label: 'Tạm khóa',   cls: 'bg-destructive/10 text-destructive' },
  inactive: { label: 'Ngừng HĐ',   cls: 'bg-muted text-muted-foreground' },
};

const STATUSES = [
  { key: 'active',    label: 'Hoạt động' },
  { key: 'trial',     label: 'Dùng thử' },
  { key: 'suspended', label: 'Tạm khóa' },
  { key: 'inactive',  label: 'Ngừng HĐ' },
];

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start py-3 border-b border-border last:border-0">
      <p className="w-40 shrink-0 text-xs font-medium text-muted-foreground pt-0.5">{label}</p>
      <div className="text-sm text-foreground">{value ?? '—'}</div>
    </div>
  );
}

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: business, isLoading } = useQuery<Business>({
    queryKey: ['business', id],
    queryFn: () => api.get(`/platform/businesses/${id}`).then((r) => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/platform/businesses/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business', id] });
      qc.invalidateQueries({ queryKey: ['businesses'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Building2 size={32} className="text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Không tìm thấy doanh nghiệp</p>
        <button onClick={() => router.push('/businesses')} className="text-sm text-primary hover:underline">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const sc = STATUS_CONFIG[business.status] ?? STATUS_CONFIG.inactive;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/businesses" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-foreground truncate">{business.legalName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{business.businessCode}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.cls}`}>
          {sc.label}
        </span>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-foreground mb-1">Thông tin doanh nghiệp</h2>
        <InfoRow label="Tên pháp lý" value={business.legalName} />
        <InfoRow label="Tên thương hiệu" value={business.brandName} />
        <InfoRow
          label="Mã doanh nghiệp"
          value={<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{business.businessCode}</code>}
        />
        <InfoRow
          label="Schema DB"
          value={<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{business.schemaName}</code>}
        />
        <InfoRow label="Email" value={business.email} />
        <InfoRow label="Số điện thoại" value={business.phone} />
        <InfoRow label="Múi giờ" value={business.timezoneName} />
        <InfoRow
          label="Gói dịch vụ"
          value={
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {business.subscriptionPlan}
            </span>
          }
        />
        <InfoRow
          label="Ngày tạo"
          value={new Date(business.createdAt).toLocaleString('vi-VN')}
        />
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Đổi trạng thái</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(({ key, label }) => {
            const isActive = business.status === key;
            return (
              <button
                key={key}
                onClick={() => !isActive && updateStatus.mutate(key)}
                disabled={isActive || updateStatus.isPending}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border font-medium transition ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary cursor-default'
                    : 'border-input hover:bg-muted text-foreground'
                } disabled:opacity-60`}
              >
                {isActive && <CheckCircle size={12} />}
                {label}
              </button>
            );
          })}
        </div>
        {updateStatus.isSuccess && (
          <p className="mt-3 text-xs text-success">Đã cập nhật trạng thái thành công.</p>
        )}
      </div>
    </div>
  );
}
