'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, KeyRound, LogOut, Monitor, Smartphone, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/layouts/sidebar';
import { useAuthStore } from '@/stores/auth.store';

function AccountMenu() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [open, setOpen] = useState(false);

  const displayName = user?.fullName ?? user?.email ?? 'Admin';
  const initials = displayName.slice(0, 2);
  const roleLabel = user?.isPlatformAdmin ? 'Platform Admin' : 'Quản trị viên';

  async function logout() {
    setOpen(false);
    await api.post('/platform/auth/logout').catch(() => undefined);
    clearAuth();
    document.cookie = 'admin_token=; path=/; max-age=0';
    router.push('/login');
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative z-50 flex items-center gap-3 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-muted"
      >
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold uppercase">
          {initials}
        </div>
        <div className="hidden min-w-0 sm:block">
          <p className="max-w-[180px] truncate text-sm font-medium text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </div>
        <ChevronDown size={15} className={cn('text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 rounded-lg border border-border bg-card p-1 shadow-xl">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
          </div>

          <Link
            href="/accounts"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <UserRound size={16} />
            <span>Thông tin tài khoản</span>
          </Link>
          <Link
            href="/settings/security"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <KeyRound size={16} />
            <span>Đổi mật khẩu</span>
          </Link>
          <Link
            href="/sessions"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Monitor size={16} />
            <span>Phiên đăng nhập</span>
          </Link>
          <Link
            href="/security/devices"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Smartphone size={16} />
            <span>MFA & thiết bị</span>
          </Link>

          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const handleToggle = useCallback(() => setSidebarCollapsed((v) => !v), []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggle} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end border-b border-border bg-background/95 px-5 backdrop-blur">
          <AccountMenu />
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
