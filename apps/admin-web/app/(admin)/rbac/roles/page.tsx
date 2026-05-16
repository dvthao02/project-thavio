'use client';

import { Suspense, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, ChevronRight, Crown, KeyRound, Loader2, Plus, Search, ShieldCheck, Users, X } from 'lucide-react';
import { api } from '@/lib/api';

interface Role {
  id: string;
  roleKey: string;
  roleName: string;
  description: string | null;
  roleScope: 'platform' | 'business';
  isSystem: boolean;
  sortOrder: number;
  permissionCount: number;
  accountCount: number;
  createdAt: string;
}

interface Permission {
  id: string;
  permissionKey: string;
  permissionName: string;
  moduleKey: string;
  description: string | null;
}

interface PermModule {
  moduleKey: string;
  count: number;
  permissions: Permission[];
}

const SCOPE_META: Record<string, { label: string; cls: string }> = {
  platform: { label: 'Platform', cls: 'bg-violet-500/10 text-violet-700' },
  business: { label: 'Business', cls: 'bg-sky-500/10 text-sky-700' },
};

const INPUT = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function CompactStat({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tone}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-bold leading-none text-foreground">{value}</p>
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        </div>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

const DEFAULT_FORM = { roleKey: '', roleName: '', description: '', roleScope: 'platform' as 'platform' | 'business' };
const ROLE_PRESETS: Record<'platform' | 'business', Array<{ label: string; roleName: string; roleKey: string; description: string; permissionModules: string[]; permissionKeys?: string[] }>> = {
  platform: [
    { label: 'Quản trị nền tảng', roleName: 'Quản trị nền tảng', roleKey: 'platform.admin', description: 'Toàn quyền quản trị nền tảng', permissionModules: ['*'] },
    { label: 'Hỗ trợ hệ thống', roleName: 'Hỗ trợ hệ thống', roleKey: 'platform.support', description: 'Hỗ trợ vận hành và xử lý sự cố', permissionModules: ['ALERT', 'AUDIT', 'SUPPORT', 'BUSINESS'] },
  ],
  business: [
    {
      label: 'Chủ sở hữu',
      roleName: 'Chủ sở hữu',
      roleKey: 'business.owner',
      description: 'Toàn quyền quản lý doanh nghiệp',
      permissionModules: ['*'],
    },
    {
      label: 'Quản lý cửa hàng',
      roleName: 'Quản lý cửa hàng',
      roleKey: 'business.store.manager',
      description: 'Quản lý toàn bộ vận hành cửa hàng, nhân viên và báo cáo',
      permissionModules: ['approval', 'audit', 'cash', 'customer', 'inventory', 'invoice', 'kitchen', 'loyalty', 'notification', 'order', 'payment', 'pos', 'product', 'production', 'promotion', 'purchase', 'receivable', 'report', 'service', 'setting', 'shift', 'shipping', 'staff', 'supplier', 'table', 'wallet'],
      permissionKeys: ['store.config.update', 'store.update', 'store.view', 'role.view'],
    },
    {
      label: 'Thu ngân',
      roleName: 'Thu ngân',
      roleKey: 'business.cashier',
      description: 'Thực hiện giao dịch bán hàng, quản lý két tiền và ca làm việc',
      permissionModules: [],
      permissionKeys: [
        'pos.enter', 'pos.open_register', 'receipt.print',
        'order.create', 'order.view', 'order.update_draft', 'order.discount.apply', 'order.split_bill', 'order.cancel', 'order.void',
        'payment.cash', 'payment.card', 'payment.e_wallet', 'payment.bank_transfer', 'payment.voucher', 'payment.point', 'payment.partial', 'payment.process', 'payment.view', 'payment.refund',
        'cash.view', 'cash.drawer.count', 'cash.drawer.reconcile', 'cash.movement.create',
        'invoice.view', 'invoice.create',
        'shift.open', 'shift.close', 'shift.view',
        'customer.view', 'customer.create',
        'product.view',
      ],
    },
    {
      label: 'Nhân viên bán hàng',
      roleName: 'Nhân viên bán hàng',
      roleKey: 'business.sales',
      description: 'Bán hàng tại quầy POS, không quản lý két tiền và ca',
      permissionModules: [],
      permissionKeys: [
        'pos.enter', 'pos.open_register', 'receipt.print',
        'order.create', 'order.view', 'order.update_draft', 'order.discount.apply',
        'payment.cash', 'payment.card', 'payment.e_wallet', 'payment.process', 'payment.view', 'payment.voucher', 'payment.point', 'payment.partial',
        'customer.view', 'customer.create',
        'product.view',
        'shift.view',
      ],
    },
    {
      label: 'Nhân viên phục vụ (F&B)',
      roleName: 'Nhân viên phục vụ',
      roleKey: 'business.server',
      description: 'Phục vụ bàn, gọi món và theo dõi trạng thái bếp',
      permissionModules: [],
      permissionKeys: [
        'pos.enter', 'receipt.print',
        'table.view', 'table.manage',
        'order.create', 'order.view', 'order.update_draft', 'order.merge_table', 'order.move_table', 'order.split_bill',
        'kitchen.view',
        'product.view',
        'shift.view',
      ],
    },
    {
      label: 'Nhân viên bếp',
      roleName: 'Nhân viên bếp',
      roleKey: 'business.kitchen',
      description: 'Nhận và xử lý ticket bếp, cập nhật trạng thái món',
      permissionModules: [],
      permissionKeys: [
        'kitchen.view', 'kitchen.update',
        'order.view',
        'production.view', 'production.manage', 'waste.create',
      ],
    },
    {
      label: 'Thủ kho',
      roleName: 'Thủ kho',
      roleKey: 'business.warehouse',
      description: 'Quản lý tồn kho, nhập hàng và kiểm kê',
      permissionModules: [],
      permissionKeys: [
        'inventory.view', 'inventory.adjust', 'inventory.deduct', 'inventory.reserve', 'inventory.stocktake', 'inventory.stocktake.approve', 'inventory.transaction.view', 'inventory.transfer', 'inventory.transfer.approve', 'inventory.costing.view',
        'purchase.view', 'purchase.create', 'purchase.receive', 'purchase.return',
        'supplier.view', 'supplier.create', 'supplier.update',
        'product.view',
      ],
    },
    {
      label: 'Kế toán',
      roleName: 'Kế toán',
      roleKey: 'business.accountant',
      description: 'Quản lý sổ sách, đối soát thanh toán và báo cáo tài chính',
      permissionModules: [],
      permissionKeys: [
        'finance.view', 'finance.journal.post', 'finance.period.lock', 'finance.period.reopen',
        'report.cost_profit.view', 'report.export', 'report.inventory.view', 'report.profit.view', 'report.sales.view', 'report.staff.view',
        'receivable.adjust', 'receivable.collect', 'receivable.create', 'receivable.export', 'receivable.view', 'receivable.write_off',
        'payment.view', 'payment.reconcile', 'payment.refund', 'payment.refund_override',
        'cash.view', 'cash.bank_deposit',
        'invoice.view', 'invoice.create', 'invoice.cancel', 'invoice.credit_note.create',
        'activity_log.view',
        'purchase.payable.view',
      ],
    },
    {
      label: 'Nhân viên giao hàng',
      roleName: 'Nhân viên giao hàng',
      roleKey: 'business.delivery',
      description: 'Xử lý và vận chuyển đơn hàng giao tận nơi',
      permissionModules: [],
      permissionKeys: [
        'shipping.view', 'shipping.create', 'shipping.update', 'shipping.cod_reconcile',
        'order.view',
        'payment.cash', 'payment.view',
      ],
    },
    {
      label: 'Chăm sóc khách hàng',
      roleName: 'Chăm sóc khách hàng',
      roleKey: 'business.crm',
      description: 'Quản lý thông tin khách hàng, tích điểm và chương trình khách hàng thân thiết',
      permissionModules: [],
      permissionKeys: [
        'customer.view', 'customer.create', 'customer.update', 'customer.point.adjust', 'customer.merge', 'customer.campaign.manage', 'customer.disable', 'customer.export',
        'loyalty.view', 'loyalty.manage',
        'wallet.view', 'wallet.adjust',
        'notification.view', 'notification.send',
        'order.view',
      ],
    },
    {
      label: 'Quản lý mua hàng',
      roleName: 'Quản lý mua hàng',
      roleKey: 'business.purchasing',
      description: 'Đặt hàng nhà cung cấp, nhận hàng và theo dõi công nợ',
      permissionModules: [],
      permissionKeys: [
        'purchase.view', 'purchase.create', 'purchase.cancel', 'purchase.receive', 'purchase.return', 'purchase.payable.view', 'purchase.payment.process',
        'supplier.view', 'supplier.create', 'supplier.update', 'supplier.disable',
        'inventory.view', 'inventory.transaction.view',
        'product.view',
      ],
    },
    {
      label: 'Quản lý sản phẩm',
      roleName: 'Quản lý sản phẩm',
      roleKey: 'business.product.manager',
      description: 'Quản lý danh mục sản phẩm, giá, khuyến mãi và kênh bán',
      permissionModules: [],
      permissionKeys: [
        'product.view', 'product.create', 'product.update', 'product.delete', 'product.export', 'product.import', 'product.price.update', 'product.cost.update', 'product.barcode.manage', 'product.lot.manage', 'product.serial.manage', 'product.media.manage', 'product.recipe.manage',
        'promotion.view', 'promotion.create', 'promotion.update', 'promotion.delete',
        'channel.view', 'channel.manage', 'channel.sync',
        'inventory.view', 'inventory.view_cost',
      ],
    },
  ],
};
const ROLE_PRIORITY: Record<string, number> = {
  'platform.admin': 1,
  'platform.support': 2,
  'business.owner': 3,
  'business.store.manager': 4,
  'business.cashier': 5,
  'business.sales': 6,
  'business.server': 7,
  'business.kitchen': 8,
  'business.warehouse': 9,
  'business.accountant': 10,
  'business.delivery': 11,
  'business.crm': 12,
  'business.purchasing': 13,
  'business.product.manager': 14,
};

function RolesPageInner() {
  const searchParams = useSearchParams();
  const scopeParam = searchParams?.get('scope') ?? null;
  const forcedScope = scopeParam === 'platform' || scopeParam === 'business' ? scopeParam : null;
  const [scope, setScope] = useState<'all' | 'platform' | 'business'>(forcedScope ?? 'all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [useCustomRoleKey, setUseCustomRoleKey] = useState(false);
  const [presetKey, setPresetKey] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState('');
  const qc = useQueryClient();

  useEffect(() => {
    if (!createOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCreate(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [createOpen]);

  useEffect(() => {
    if (forcedScope) setScope(forcedScope);
  }, [forcedScope]);

  const { data: roles = [], isLoading, isError } = useQuery<Role[]>({
    queryKey: ['rbac-roles'],
    queryFn: () => api.get('/platform/rbac/roles').then((r) => r.data),
  });

  const { data: allPermsData, isLoading: permsLoading } = useQuery<{ total: number; modules: PermModule[] }>({
    queryKey: ['rbac-permissions', form.roleScope],
    queryFn: () => api.get('/platform/rbac/permissions', { params: { scope: form.roleScope } }).then((r) => r.data),
    enabled: createOpen,
  });

  useEffect(() => {
    if (!createOpen || !presetKey || !allPermsData) return;
    const preset = ROLE_PRESETS[form.roleScope].find((p) => p.roleKey === presetKey);
    if (!preset) return;
    const ids = new Set<string>();
    const useAll = preset.permissionModules.includes('*');
    const modules = new Set(preset.permissionModules.map((m) => m.toUpperCase()));
    const keys = new Set((preset.permissionKeys ?? []).map((k) => k.toLowerCase()));
    for (const module of allPermsData.modules) {
      for (const perm of module.permissions) {
        if (
          useAll ||
          modules.has(module.moduleKey.toUpperCase()) ||
          keys.has(perm.permissionKey.toLowerCase())
        ) {
          ids.add(perm.id);
        }
      }
    }
    setSelectedPerms(ids);
  }, [allPermsData, createOpen, form.roleScope, presetKey]);

  const createMut = useMutation({
    mutationFn: async (payload: { form: typeof form; permIds: string[] }) => {
      const submitForm = {
        ...payload.form,
        roleKey: payload.form.roleKey?.trim() ? payload.form.roleKey.trim() : undefined,
      };
      const created = await api.post('/platform/rbac/roles', submitForm).then((r) => r.data);
      if (payload.permIds.length > 0) {
        await Promise.all(
          payload.permIds.map((permissionId) =>
            api.post(`/platform/rbac/roles/${created.id}/permissions`, { permissionId })
          )
        );
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rbac-roles'] });
      closeCreate();
    },
  });

  const closeCreate = () => {
    setCreateOpen(false);
    setForm(DEFAULT_FORM);
    setUseCustomRoleKey(false);
    setPresetKey('');
    setSelectedPerms(new Set());
    setPermSearch('');
  };

  const filtered = (scope === 'all' ? roles : roles.filter((r) => r.roleScope === scope))
    .slice()
    .sort((a, b) => {
      const pa = ROLE_PRIORITY[a.roleKey] ?? 999;
      const pb = ROLE_PRIORITY[b.roleKey] ?? 999;
      if (pa !== pb) return pa - pb;
      if (a.roleScope !== b.roleScope) return a.roleScope === 'platform' ? -1 : 1;
      return a.roleName.localeCompare(b.roleName, 'vi');
    });
  const platformRoles = roles.filter((r) => r.roleScope === 'platform');
  const businessRoles = roles.filter((r) => r.roleScope === 'business');
  const platformCount = platformRoles.length;
  const businessCount = businessRoles.length;
  const platformSystemCount = platformRoles.filter((r) => r.isSystem).length;
  const businessSystemCount = businessRoles.filter((r) => r.isSystem).length;
  const platformPerms = platformRoles.reduce((s, r) => s + r.permissionCount, 0);
  const businessPerms = businessRoles.reduce((s, r) => s + r.permissionCount, 0);

  const visibleModules = (allPermsData?.modules ?? [])
    .map((m) => ({
      ...m,
      permissions: permSearch
        ? m.permissions.filter(
            (p) =>
              p.permissionName.toLowerCase().includes(permSearch.toLowerCase()) ||
              p.permissionKey.toLowerCase().includes(permSearch.toLowerCase())
          )
        : m.permissions,
    }))
    .filter((m) => m.permissions.length > 0);

  const toggleModule = (modulePerms: Permission[]) => {
    const allSelected = modulePerms.every((p) => selectedPerms.has(p.id));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (allSelected) modulePerms.forEach((p) => next.delete(p.id));
      else modulePerms.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const togglePerm = (id: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Vai trò</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý các vai trò và phân quyền trong hệ thống.
          </p>
        </div>
        <button
          onClick={() => {
            setForm((f) => ({ ...f, roleScope: scope === 'business' ? 'business' : 'platform' }));
            setUseCustomRoleKey(false);
            setPresetKey('');
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          <Plus size={16} /> Tạo vai trò
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CompactStat
          label="Vai trò nền tảng"
          value={platformCount}
          sub={`${platformSystemCount} hệ thống · ${platformCount - platformSystemCount} tùy chỉnh`}
          icon={ShieldCheck}
          tone="bg-violet-500/10 text-violet-700"
        />
        <CompactStat
          label="Vai trò doanh nghiệp"
          value={businessCount}
          sub={`${businessSystemCount} hệ thống · ${businessCount - businessSystemCount} tùy chỉnh`}
          icon={Building2}
          tone="bg-sky-500/10 text-sky-700"
        />
        <CompactStat
          label="Quyền platform"
          value={platformPerms}
          sub="Gán vào vai trò nền tảng"
          icon={KeyRound}
          tone="bg-violet-500/10 text-violet-700"
        />
        <CompactStat
          label="Quyền doanh nghiệp"
          value={businessPerms}
          sub="Gán vào vai trò doanh nghiệp"
          icon={Crown}
          tone="bg-sky-500/10 text-sky-700"
        />
      </div>

      {!forcedScope ? (
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
      ) : (
        <div className="inline-flex rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground">
          {forcedScope === 'platform' ? 'Vai trò nền tảng' : 'Vai trò doanh nghiệp'}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không tải được danh sách vai trò.
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Vai trò</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Số quyền</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tài khoản</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center">
                  <ShieldCheck size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Không có vai trò nào.</p>
                </td>
              </tr>
            ) : (
              filtered.map((role) => {
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
                      <div className="group/tip relative inline-flex items-center gap-1.5 text-sm">
                        <ShieldCheck size={14} className="text-muted-foreground" />
                        <span className="font-medium">{role.permissionCount}</span>
                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 hidden group-hover/tip:block whitespace-nowrap rounded-md bg-popover border border-border px-2.5 py-1.5 text-xs text-popover-foreground shadow-md z-10">
                          {role.permissionCount} quyền được gán
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="group/tip relative inline-flex items-center gap-1.5 text-sm">
                        <Users size={14} className="text-muted-foreground" />
                        <span className="font-medium">{role.accountCount}</span>
                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 hidden group-hover/tip:block whitespace-nowrap rounded-md bg-popover border border-border px-2.5 py-1.5 text-xs text-popover-foreground shadow-md z-10">
                          {role.accountCount} tài khoản được gán vai trò này
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/admin/rbac/roles/${role.id}`}
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

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex flex-col rounded-lg border border-border bg-background shadow-xl" style={{ width: '66.666vw', maxHeight: '90vh' }}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">Tạo vai trò mới</h3>
              <button onClick={closeCreate} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* Left: role info */}
              <div className="w-80 shrink-0 overflow-y-auto border-r border-border p-6">
                <div className="space-y-4">
                  <Field label="Mẫu vai trò">
                    <select
                      className={INPUT}
                      value={presetKey}
                      onChange={(e) => {
                        const nextPresetKey = e.target.value;
                        setPresetKey(nextPresetKey);
                        if (!nextPresetKey) return;
                        const selected = ROLE_PRESETS[form.roleScope].find((p) => p.roleKey === nextPresetKey);
                        if (!selected) return;
                        setForm((f) => ({
                          ...f,
                          roleName: selected.roleName,
                          roleKey: selected.roleKey,
                          description: selected.description,
                        }));
                        setSelectedPerms(new Set());
                        setUseCustomRoleKey(false);
                      }}
                    >
                      <option value="">Tự tạo mới (không dùng mẫu)</option>
                      {ROLE_PRESETS[form.roleScope].map((preset) => (
                        <option key={preset.roleKey} value={preset.roleKey}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Tên vai trò *">
                    <input
                      className={INPUT}
                      value={form.roleName}
                      onChange={(e) => setForm((f) => ({ ...f, roleName: e.target.value }))}
                      placeholder="Quản trị viên"
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={useCustomRoleKey}
                      onChange={(e) => {
                        setUseCustomRoleKey(e.target.checked);
                        if (!e.target.checked) setForm((f) => ({ ...f, roleKey: '' }));
                      }}
                    />
                    Tùy chỉnh role key (nâng cao)
                  </label>
                  {useCustomRoleKey ? (
                    <Field label="Role Key">
                      <input
                        className={INPUT}
                        value={form.roleKey}
                        onChange={(e) => setForm((f) => ({ ...f, roleKey: e.target.value.toLowerCase() }))}
                        placeholder={`${form.roleScope}.custom.role`}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">Chỉ chữ thường, số, dấu chấm, gạch ngang, gạch dưới</p>
                    </Field>
                  ) : (
                    <p className="text-xs text-muted-foreground">Role key sẽ tự sinh theo phạm vi + tên vai trò, hoặc theo mẫu hệ thống.</p>
                  )}
                  <Field label="Phạm vi *">
                    <select
                      className={INPUT}
                      value={form.roleScope}
                      onChange={(e) => {
                        const nextScope = e.target.value as 'platform' | 'business';
                        setForm((f) => ({ ...f, roleScope: nextScope, roleKey: useCustomRoleKey ? f.roleKey : '' }));
                        setPresetKey('');
                        setSelectedPerms(new Set());
                      }}
                    >
                      <option value="platform">Platform</option>
                      <option value="business">Business</option>
                    </select>
                  </Field>
                  <Field label="Mô tả">
                    <textarea
                      className={INPUT}
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Mô tả vai trò..."
                    />
                  </Field>
                </div>
              </div>

              {/* Right: permission picker */}
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    Quyền hạn
                    {selectedPerms.size > 0 && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {selectedPerms.size} đã chọn
                      </span>
                    )}
                  </p>
                  {selectedPerms.size > 0 && (
                    <button
                      onClick={() => setSelectedPerms(new Set())}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>
                <div className="border-b border-border px-4 py-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm quyền..."
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {permsLoading ? (
                    <div className="flex h-24 items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : visibleModules.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {permSearch ? 'Không tìm thấy quyền phù hợp.' : 'Không có quyền nào.'}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {visibleModules.map((m) => {
                        const allChecked = m.permissions.every((p) => selectedPerms.has(p.id));
                        const someChecked = !allChecked && m.permissions.some((p) => selectedPerms.has(p.id));
                        return (
                          <div key={m.moduleKey}>
                            <label className="flex cursor-pointer items-center gap-2.5 rounded-md bg-muted/50 px-2.5 py-2">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={(el) => { if (el) el.indeterminate = someChecked; }}
                                onChange={() => toggleModule(m.permissions)}
                                className="rounded"
                              />
                              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                {m.moduleKey}
                              </span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {m.permissions.filter((p) => selectedPerms.has(p.id)).length}/{m.permissions.length}
                              </span>
                            </label>
                            <div className="mt-1 grid grid-cols-2 xl:grid-cols-3">
                              {m.permissions.map((p) => (
                                <label
                                  key={p.id}
                                  className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedPerms.has(p.id)}
                                    onChange={() => togglePerm(p.id)}
                                    className="mt-0.5 h-3.5 w-3.5 rounded accent-primary"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-foreground leading-tight">{p.permissionName}</p>
                                    <code className="text-[10px] text-muted-foreground leading-tight block truncate">{p.permissionKey}</code>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              {createMut.isError ? (
                <p className="text-xs text-destructive">
                  {(createMut.error as any)?.response?.data?.message ?? 'Lỗi khi tạo vai trò.'}
                </p>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  onClick={closeCreate}
                  className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted transition"
                >
                  Hủy
                </button>
                <button
                  onClick={() => createMut.mutate({ form, permIds: Array.from(selectedPerms) })}
                  disabled={createMut.isPending || !form.roleName}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
                >
                  {createMut.isPending ? 'Đang tạo...' : 'Tạo vai trò'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RolesPage() {
  return (
    <Suspense>
      <RolesPageInner />
    </Suspense>
  );
}
