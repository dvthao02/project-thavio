'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Users, CheckCircle, PauseCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface DashboardStats {
  totalBusinesses: number;
  activeBusinesses: number;
  trialBusinesses: number;
  suspendedBusinesses: number;
  totalAccounts: number;
  recentBusinesses: Array<{
    id: string;
    businessCode: string;
    legalName: string;
    status: string;
    plan: string;
    createdAt: string;
  }>;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-success/10 text-success',
  trial: 'bg-warning/10 text-warning',
  suspended: 'bg-destructive/10 text-destructive',
  inactive: 'bg-muted text-muted-foreground',
};

const PLAN_BADGE: Record<string, string> = {
  starter: 'bg-muted text-muted-foreground',
  standard: 'bg-primary/10 text-primary',
  professional: 'bg-accent text-primary',
  enterprise: 'bg-primary text-primary-foreground',
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/platform/dashboard/stats').then((r) => r.data),
  });

  const stats = [
    {
      label: 'Total Businesses',
      value: data?.totalBusinesses ?? 0,
      icon: Building2,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Active',
      value: data?.activeBusinesses ?? 0,
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Trial',
      value: data?.trialBusinesses ?? 0,
      icon: PauseCircle,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Total Accounts',
      value: data?.totalAccounts ?? 0,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-md ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold text-foreground">
                  {isLoading ? '—' : value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recent Businesses</h2>
        </div>
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : data?.recentBusinesses?.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No businesses yet</div>
          ) : (
            data?.recentBusinesses?.map((b) => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase">
                  {b.businessCode.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{b.legalName}</p>
                  <p className="text-xs text-muted-foreground">{b.businessCode}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_BADGE[b.plan] ?? 'bg-muted text-muted-foreground'}`}>
                  {b.plan}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[b.status] ?? 'bg-muted text-muted-foreground'}`}>
                  {b.status}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(b.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
