'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, KeyRound, ShieldCheck, Users } from 'lucide-react';
import { api } from '@/lib/api';

interface Permission {
  id: string;
  permissionKey: string;
  permissionName: string;
  moduleKey: string;
  description: string | null;
}

interface AccountRow {
  id: string;
  fullName: string;
  email: string | null;
  scopeType: string;
}

interface RoleDetail {
  id: string;
  roleKey: string;
  roleName: string;
  description: string | null;
  roleScope: string;
  isSystem: boolean;
  createdAt: string;
  permissions: Permission[];
  accounts: AccountRow[];
}

const SCOPE_META: Record<string, { label: string; cls: string }> = {
  platform: { label: 'Platform', cls: 'bg-violet-500/10 text-violet-700' },
  business: { label: 'Business', cls: 'bg-sky-500/10 text-sky-700' },
};

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: role, isLoading, isError } = useQuery<RoleDetail>({
    queryKey: ['rbac-role', id],
    queryFn: () => api.get(`/platform/rbac/roles/${id}`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (isError || !role) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <ShieldCheck size={32} className="text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Không tìm thấy vai trò.</p>
        <Link href="/rbac/roles" className="text-sm text-primary hover:underline">Quay lại</Link>
      </div>
    );
  }

  const scopeMeta = SCOPE_META[role.roleScope] ?? SCOPE_META.platform;

  // Group permissions by module
  const byModule: Record<string, Permission[]> = {};
  for (const p of role.permissions) {
    if (!byModule[p.moduleKey]) byModule[p.moduleKey] = [];
    byModule[p.moduleKey].push(p);
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/rbac/roles" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{role.roleName}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scopeMeta.cls}`}>
              {scopeMeta.label}
            </span>
            {role.isSystem && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Hệ thống</span>
            )}
          </div>
          <code className="mt-1 block text-xs text-muted-foreground">{role.roleKey}</code>
        </div>
      </div>

      {role.description && (
        <p className="text-sm text-muted-foreground">{role.description}</p>
      )}

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound size={16} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Quyền hạn ({role.permissions.length})
          </h2>
        </div>

        {role.permissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Vai trò này chưa có quyền nào.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(byModule).sort().map(([moduleKey, perms]) => (
              <div key={moduleKey}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {moduleKey}
                </p>
                <div className="flex flex-wrap gap-2">
                  {perms.map((p) => (
                    <div key={p.id} className="group relative">
                      <span className="rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground cursor-default">
                        {p.permissionName}
                      </span>
                      <div className="pointer-events-none absolute bottom-full left-0 mb-1 hidden rounded bg-foreground px-2 py-1 text-xs text-background whitespace-nowrap group-hover:block z-10">
                        {p.permissionKey}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {role.accounts.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Tài khoản được gán ({role.accounts.length})
            </h2>
          </div>
          <div className="space-y-2">
            {role.accounts.map((acct) => (
              <div key={acct.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {acct.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{acct.fullName}</p>
                  <p className="text-xs text-muted-foreground">{acct.email}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {acct.scopeType}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
