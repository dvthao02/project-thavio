'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search, Building2 } from 'lucide-react';
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
  createdAt: string;
}

interface ListResponse {
  data: Business[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-success/10 text-success',
  trial: 'bg-warning/10 text-warning',
  suspended: 'bg-destructive/10 text-destructive',
  inactive: 'bg-muted text-muted-foreground',
};

export default function BusinessesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ['businesses', { search, status, page }],
    queryFn: () =>
      api
        .get('/platform/businesses', { params: { search: search || undefined, status: status || undefined, page, limit: 20 } })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Businesses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.total} businesses registered` : 'Manage all businesses on the platform'}
          </p>
        </div>
        <Link
          href="/businesses/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-600 transition"
        >
          <Plus size={16} />
          New Business
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name or code…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="text-sm border border-input rounded-md bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Business</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Code</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Plan</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">Loading…</td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center">
                  <Building2 size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No businesses found</p>
                </td>
              </tr>
            ) : (
              data?.data.map((b) => (
                <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase shrink-0">
                        {b.businessCode.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{b.legalName}</p>
                        {b.brandName && <p className="text-xs text-muted-foreground truncate">{b.brandName}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{b.businessCode}</code>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {b.email ?? b.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs capitalize">{b.plan}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[b.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/businesses/${b.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {data && data.total > 20 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs px-3 py-1.5 border border-input rounded-md disabled:opacity-40 hover:bg-muted transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 20 >= data.total}
                className="text-xs px-3 py-1.5 border border-input rounded-md disabled:opacity-40 hover:bg-muted transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
