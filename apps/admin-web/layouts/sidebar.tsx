'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      { href: '/dashboard',   label: 'Tổng quan',            icon: LayoutDashboard, permission: 'platform.dashboard.view' },
      { href: '/alerts',      label: 'Cảnh báo & SLA',       icon: AlertTriangle,   permission: 'platform.alert.view' },
      { href: '/audit-logs',  label: 'Nhật ký hoạt động',    icon: FileClock,       permission: 'platform.audit.view' },
    ],
  },
  {
    label: 'Doanh nghiệp',
    items: [
      { href: '/businesses',            label: 'Danh sách doanh nghiệp', icon: Building2,  permission: 'platform.business.view' },
      { href: '/businesses/new',        label: 'Tạo doanh nghiệp',       icon: PlusCircle, permission: 'platform.business.create' },
      { href: '/subscriptions/trials',  label: 'Dùng thử & gia hạn',     icon: RotateCcw,  permission: 'platform.subscription.view' },
      { href: '/subscriptions/plans',   label: 'Gói dịch vụ',            icon: Package,    permission: 'platform.subscription.view' },
      { href: '/billing/invoices',      label: 'Hợp đồng & hóa đơn',     icon: ReceiptText, permission: 'platform.billing.view' },
    ],
  },
  {
    label: 'Tài khoản & RBAC',
    items: [
      { href: '/accounts',         label: 'Tài khoản nền tảng', icon: Users,       permission: 'platform.account.view' },
      { href: '/rbac/roles',       label: 'Vai trò nền tảng',   icon: ShieldCheck, permission: 'platform.rbac.view' },
      { href: '/rbac/permissions', label: 'Phân quyền',          icon: KeyRound,    permission: 'platform.rbac.view' },
      { href: '/sessions',         label: 'Phiên đăng nhập',     icon: Monitor,     permission: 'platform.session.view' },
      { href: '/security/devices', label: 'MFA & thiết bị',      icon: Smartphone,  permission: 'platform.security.view' },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { href: '/operations/assignees',    label: 'Nhân viên phụ trách', icon: UserCheck, permission: 'platform.operation.view' },
      { href: '/support/tickets',         label: 'Yêu cầu hỗ trợ',     icon: LifeBuoy,  permission: 'platform.support_ticket.view' },
      { href: '/billing/reconciliation',  label: 'Đối soát thanh toán', icon: Landmark,  permission: 'platform.billing.view' },
      { href: '/support/impersonation',   label: 'Hỗ trợ truy cập',     icon: UserCog,   permission: 'platform.support.impersonate' },
    ],
  },
  {
    label: 'Cấu hình',
    items: [
      { href: '/settings/catalogs',      label: 'Danh mục',           icon: Tags,      permission: 'platform.settings.view' },
      { href: '/integrations/webhooks',  label: 'Tích hợp & Webhook', icon: Webhook,   permission: 'platform.integration.view' },
      { href: '/settings/security',      label: 'Bảo mật',            icon: LockKeyhole, permission: 'platform.settings.view' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { permissions } = useAuthStore();

  const canView = (item: NavItem): boolean => {
    if (!item.permission) return true;
    return permissions.includes(item.permission);
  };

  function toggleGroup(label: string) {
    if (collapsed) return;
    setOpenGroups((current) => ({ ...current, [label]: !current[label] }));
  }

  return (
    <aside
      className={cn(
        'shrink-0 h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div
        className={cn(
          'h-14 flex items-center border-b border-sidebar-border',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="Thavio" className="w-12 h-auto object-contain shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none tracking-wide text-foreground">THAVIO</p>
              <p className="text-[11px] text-muted-foreground mt-1">Quản trị nền tảng</p>
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
          const visibleItems = group.items.filter(canView);
          if (visibleItems.length === 0) return null;

          const groupActive = visibleItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
          const groupOpen = collapsed ? true : (openGroups[group.label] ?? true) || groupActive;

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
                  {visibleItems.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(`${href}/`);
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
    </aside>
  );
}
