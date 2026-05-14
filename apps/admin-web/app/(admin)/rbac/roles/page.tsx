'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Building2, ChevronRight, ShieldCheck, Users } from 'lucide-react';
import { api } from '@/lib/api';

interface Role {
  id: string;
  roleKey: string;
  roleName: string;
  description: string | null;
  roleScope: 'platform' | 'tenant';
  isSystem: boolean;
  sortOrder: number;
  permissionCount: number;
  accountCount: number;
  createdAt: string;
}

const SCOPE_META: Record<string, { label: string; cls: string }> = {
  platform: { label: 'Platform', cls: 'bg-violet-500/10 text-violet-700' },
  business: { label: 'Business', cls: 'bg-sky-500/10 text-sky-700' },
};

export default function RolesPage() {
  const [scope, setScope] = useState<'all' | 'platform' | 'business'>('all');

  const { data: roles = [], isLoading, isError } = useQuery<Role[]>({
    queryKey: ['rbac-roles'],
    queryFn: () => api.get('/platform/rbac/roles').then((r) => r.data),
  });

  const filtered = scope === 'all' ? roles : roles.filter((r) => r.roleScope === scope);
  const platformCount = roles.filter((r) => r.roleScope === 'platform').length;
  const tenantCount = roles.filter((r) => r.roleScope === 'business').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Vai trò platform</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý các vai trò và phân quyền trong hệ thống.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck size={17} />
          </div>
          <p className="text-2xl font-bold text-foreground">{roles.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Tổng số vai trò</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-violet-500/10 text-violet-700">
            <ShieldCheck size={17} />
          </div>
          <p className="text-2xl font-bold text-foreground">{platformCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">Vai trò Platform</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-sky-500/10 text-sky-700">
            <Building2 size={17} />
          </div>
          <p className="text-2xl font-bold text-foreground">{tenantCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">Vai trò Business</p>
        </div>
      </div>

      <div className="inline-flex rounded-md border border-border bg-card p-1">
        {(['all', 'platform', 'business'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setScope(key)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              scope === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {key === 'all' ? 'Tất cả' : key === 'platform' ? 'Platform' : 'Business'}
          </button>
        ))}
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được danh sách vai trò.
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Vai trò</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Phạm vi</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Số quyền</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tài khoản</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <ShieldCheck size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Không có vai trò nào.</p>
                </td>
              </tr>
            ) : (
              filtered.map((role) => {
                const scopeMeta = SCOPE_META[role.roleScope] ?? SCOPE_META.platform;
                return (
                  <tr key={role.id} className="transition hover:bg-muted/20">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{role.roleName}</p>
                        {role.isSystem && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            Hệ thống
                          </span>
                        )}
                      </div>
                      <code className="mt-1 block text-xs text-muted-foreground">{role.roleKey}</code>
                      {role.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{role.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scopeMeta.cls}`}>
                        {scopeMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm">
                        <ShieldCheck size={14} className="text-muted-foreground" />
                        <span className="font-medium">{role.permissionCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users size={14} className="text-muted-foreground" />
                        <span className="font-medium">{role.accountCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/rbac/roles/${role.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted"
                      >
                        Chi tiết
                        <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
