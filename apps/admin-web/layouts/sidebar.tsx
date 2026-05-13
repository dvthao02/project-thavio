'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

const NAV = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/businesses', label: 'Doanh nghiệp', icon: Building2 },
  { href: '/accounts', label: 'Tài khoản', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  function logout() {
    clearAuth();
    document.cookie = 'admin_token=; path=/; max-age=0';
    router.push('/login');
  }

  return (
    <aside className="w-60 shrink-0 h-screen flex flex-col bg-sidebar border-r border-sidebar-border">
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Thavio" className="h-8 w-auto object-contain" />
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold uppercase">
            {(user?.username ?? 'AD').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{user?.username ?? 'Admin'}</p>
            <p className="text-xs text-muted-foreground truncate">Quản trị viên</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
        >
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
