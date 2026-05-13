'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/platform/auth/login', { identifier, password });
      setAuth(data.accessToken, data.account);
      document.cookie = `admin_token=${data.accessToken}; path=/; max-age=${8 * 3600}`;
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Thavio" width={160} height={48} priority className="mb-2" />
          <p className="text-sm text-muted-foreground">Quản trị nền tảng</p>
        </div>

        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <h1 className="text-lg font-semibold text-foreground mb-6">Đăng nhập</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-foreground mb-1.5">
                Email hoặc tên đăng nhập
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@pos-master.vn"
                required
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
