'use client';

import { useState } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

function getSafeRedirectTarget() {
  const fallback = '/dashboard';
  const from = new URLSearchParams(window.location.search).get('from');

  if (!from || !from.startsWith('/') || from.startsWith('//') || from.includes('\\')) {
    return fallback;
  }

  if (from === '/login' || from.startsWith('/login?')) {
    return fallback;
  }

  return from;
}

export default function LoginPage() {
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
      if (!data?.accessToken || !data?.account) {
        throw new Error('AUTH_RESPONSE_INVALID');
      }

      setAuth(data.accessToken, data.account);
      document.cookie = `admin_token=${data.accessToken}; path=/; max-age=${8 * 3600}; SameSite=Lax`;

      window.location.assign(getSafeRedirectTarget());
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Sai tài khoản hoặc mật khẩu.');
        } else if (err.response?.data?.message) {
          const message = Array.isArray(err.response.data.message)
            ? err.response.data.message.join(', ')
            : err.response.data.message;
          setError(message);
        } else if (err.request) {
          setError('Không kết nối được API. Kiểm tra api-core có đang chạy ở localhost:3000 không.');
        } else {
          setError('Không gửi được yêu cầu đăng nhập.');
        }
      } else if (err instanceof Error && err.message === 'AUTH_RESPONSE_INVALID') {
        setError('API đăng nhập trả dữ liệu không hợp lệ.');
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại.');
      }
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
                placeholder="admin@thavio.vn"
                required
                autoComplete="username"
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
                autoComplete="current-password"
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
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
