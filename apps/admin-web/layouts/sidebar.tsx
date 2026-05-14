'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  FileClock,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  Menu,
  Monitor,
  Package,
  PlusCircle,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Tags,
  UserCheck,
  UserCog,
  Users,
  Webhook,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

const NAV_GROUPS = [
  {
    label: 'Tổng quan',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/alerts', label: 'Cảnh báo & SLA', icon: AlertTriangle },
      { href: '/audit-logs', label: 'Nhật ký hoạt động', icon: FileClock },
    ],
  },
  {
    label: 'Doanh nghiệp',
    items: [
      { href: '/businesses', label: 'Danh sách doanh nghiệp', icon: Building2 },
      { href: '/businesses/new', label: 'Tạo doanh nghiệp', icon: PlusCircle },
      { href: '/subscriptions/trials', label: 'Trial & gia hạn', icon: RotateCcw },
      { href: '/subscriptions/plans', label: 'Gói dịch vụ', icon: Package },
      { href: '/billing/invoices', label: 'Hợp đồng & hóa đơn', icon: ReceiptText },
    ],
  },
  {
    label: 'Tài khoản & RBAC',
    items: [
      { href: '/accounts', label: 'Tài khoản platform', icon: Users },
      { href: '/rbac/roles', label: 'Vai trò platform', icon: ShieldCheck },
      { href: '/rbac/permissions', label: 'Phân quyền', icon: KeyRound },
      { href: '/sessions', label: 'Phiên đăng nhập', icon: Monitor },
      { href: '/security/devices', label: 'MFA & thiết bị', icon: Smartphone },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { href: '/operations/assignees', label: 'Nhân viên phụ trách', icon: UserCheck },
      { href: '/support/tickets', label: 'Ticket hỗ trợ', icon: LifeBuoy },
      { href: '/billing/reconciliation', label: 'Đối soát thanh toán', icon: Landmark },
      { href: '/support/impersonation', label: 'Impersonate hỗ trợ', icon: UserCog },
    ],
  },
  {
    label: 'Cấu hình',
    items: [
      { href: '/settings/catalogs', label: 'Danh mục', icon: Tags },
      { href: '/integrations/webhooks', label: 'Webhook/API', icon: Webhook },
      { href: '/settings/security', label: 'Bảo mật', icon: LockKeyhole },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  // Track only manual collapses. Active group is always shown regardless.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  function logout() {
    clearAuth();
    document.cookie = 'admin_token=; path=/; max-age=0';
    router.push('/login');
  }

  function toggleGroup(label: string) {
    if (collapsed) return;
    setOpenGroups((current) => ({ ...current, [label]: !current[label] }));
  }

  return (
    <aside
      className={cn(
        'shrink-0 h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200',
        collapsed ? 'w-16' : 'w-72',
      )}
    >
      <div className={cn('h-[72px] flex items-center border-b border-sidebar-border', collapsed ? 'justify-center px-2' : 'justify-between px-5')}>
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="Thavio" className="w-14 h-auto object-contain shrink-0" />
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none tracking-wide text-foreground">THAVIO</p>
              <p className="text-[11px] text-muted-foreground mt-1">Platform Admin</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="w-9 h-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
          aria-label={collapsed ? 'Hiện menu' : 'Ẩn menu'}
          title={collapsed ? 'Hiện menu' : 'Ẩn menu'}
        >
          <Menu size={18} />
        </button>
      </div>

      <nav className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2 space-y-2' : 'px-3 space-y-4')}>
        {NAV_GROUPS.map((group) => {
          const groupActive = group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
          // Always open if active (so navigating to a collapsed group's child auto-expands it)
          const groupOpen = collapsed ? true : ((openGroups[group.label] ?? true) || groupActive);

          return (
            <div key={group.label}>
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors',
                    groupActive ? 'text-sidebar-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown size={14} className={cn('transition-transform', !groupOpen && '-rotate-90')} />
                </button>
              )}

              {groupOpen && (
                <div className={cn('space-y-0.5', collapsed ? '' : 'mt-1')}>
                  {group.items.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + '/');
                    return (
                      <Link
                        key={href}
                        href={href}
                        title={collapsed ? label : undefined}
                        className={cn(
                          'flex items-center rounded-md text-sm font-medium transition-colors',
                          collapsed ? 'justify-center w-11 h-10 mx-auto' : 'gap-3 px-3 py-2',
                          active
                            ? 'bg-sidebar-accent text-sidebar-primary'
                            : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                        )}
                      >
                        <Icon size={16} className="shrink-0" />
                        {!collapsed && <span className="flex-1 truncate">{label}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold uppercase">
              {(user?.fullName ?? user?.email ?? 'AD').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.fullName ?? user?.email ?? 'Admin'}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.isPlatformAdmin ? 'Platform Admin' : 'Quản trị viên'}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          title={collapsed ? 'Đăng xuất' : undefined}
          className={cn(
            'flex items-center rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors',
            collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 w-full px-3 py-2',
          )}
        >
          <LogOut size={16} />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
