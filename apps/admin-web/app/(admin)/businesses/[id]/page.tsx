'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Building2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Business {
  id: string;
  businessCode: string;
  legalName: string;
  brandName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  plan: string;
  schemaName: string | null;
  timezone: string | null;
  createdAt: string;
}

const STATUSES = ['active', 'trial', 'suspended', 'inactive'];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-success/10 text-success',
  trial: 'bg-warning/10 text-warning',
  suspended: 'bg-destructive/10 text-destructive',
  inactive: 'bg-muted text-muted-foreground',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start py-3 border-b border-border last:border-0">
      <p className="w-40 shrink-0 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{value}</div>
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
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Building2 size={32} className="text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Business not found</p>
        <button onClick={() => router.push('/businesses')} className="text-sm text-primary hover:underline">
          Back to businesses
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/businesses" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-foreground truncate">{business.legalName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{business.businessCode}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[business.status] ?? 'bg-muted text-muted-foreground'}`}>
          {business.status}
        </span>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Business Details</h2>
        <InfoRow label="Legal Name" value={business.legalName} />
        <InfoRow label="Brand Name" value={business.brandName ?? '—'} />
        <InfoRow label="Business Code" value={<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{business.businessCode}</code>} />
        <InfoRow label="Schema" value={<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{business.schemaName ?? '—'}</code>} />
        <InfoRow label="Email" value={business.email ?? '—'} />
        <InfoRow label="Phone" value={business.phone ?? '—'} />
        <InfoRow label="Timezone" value={business.timezone ?? '—'} />
        <InfoRow label="Plan" value={<span className="capitalize">{business.plan}</span>} />
        <InfoRow
          label="Created"
          value={new Date(business.createdAt).toLocaleString()}
        />
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Change Status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => updateStatus.mutate(s)}
              disabled={business.status === s || updateStatus.isPending}
              className={`text-xs px-3 py-1.5 rounded-md border font-medium capitalize transition disabled:opacity-50 ${
                business.status === s
                  ? 'border-primary bg-primary/10 text-primary cursor-default'
                  : 'border-input hover:bg-muted text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
