'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { api } from '@/lib/api';

interface Account {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
}

interface ListResponse {
  data: Account[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-success/10 text-success',
  suspended: 'bg-destructive/10 text-destructive',
  inactive: 'bg-muted text-muted-foreground',
};

export default function AccountsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ['accounts', { search, page }],
    queryFn: () =>
      api
        .get('/platform/accounts', {
          params: { search: search || undefined, page, limit: 20 },
        })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/platform/accounts/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.total} platform accounts` : 'Manage platform accounts'}
          </p>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search email or username…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-8 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Account</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Username</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">Loading…</td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center">
                  <Users size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No accounts found</p>
                </td>
              </tr>
            ) : (
              data?.data.map((a) => (
                <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold uppercase">
                        {a.username.slice(0, 2)}
                      </div>
                      <span className="font-medium text-foreground">{a.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{a.username}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs capitalize">{a.role}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[a.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5">
                    {a.status === 'active' ? (
                      <button
                        onClick={() => updateStatus.mutate({ id: a.id, status: 'suspended' })}
                        className="text-xs text-destructive hover:underline"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus.mutate({ id: a.id, status: 'active' })}
                        className="text-xs text-success hover:underline"
                      >
                        Activate
                      </button>
                    )}
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
