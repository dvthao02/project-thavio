'use client';

import { useState } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

function getSafeRedirectTarget() {
  const fallback = '/admin/dashboard';
  const from = new URLSearchParams(window.location.search).get('from');

  if (!from || !from.startsWith('/') || from.startsWith('//') || from.includes('\\')) {
    return fallback;
  }

  if (from === '/login' || from.startsWith('/login?') || from === '/admin/login' || from.startsWith('/admin/login?')) {
    return fallback;
  }

  if (from.startsWith('/admin/')) {
    return from;
  }

  return `/admin${from}`;
}

function resolveLoginErrorMessage(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    if (err instanceof Error && err.message === 'AUTH_RESPONSE_INVALID') {
      return 'API đăng nhập trả dữ liệu không hợp lệ.';
    }
    return 'Đăng nhập thất bại. Vui lòng thử lại.';
  }

  if (err.request && !err.response) {
    return 'Không kết nối được API. Kiểm tra api-core có đang chạy ở localhost:3000 không.';
  }

  const rawMessage = err.response?.data?.message;
  const serverMessage = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;

  if (err.response?.status === 401) {
    if (serverMessage === 'Access denied') {
      return 'Tài khoản không có quyền truy cập khu vực quản trị.';
    }

    if (serverMessage === 'Account is not active') {
      return 'Tài khoản chưa kích hoạt hoặc đã bị khóa.';
    }

    return 'Sai tài khoản hoặc mật khẩu.';
  }

  if (typeof serverMessage === 'string' && serverMessage.trim().length > 0) {
    return serverMessage;
  }

  return 'Không gửi được yêu cầu đăng nhập.';
}

export default function LoginPage() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setError(resolveLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-cyan-200/55 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-blue-300/45 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-sky-100 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-8 md:grid-cols-2 md:px-8">
        <section className="hidden md:block">
          <div className="max-w-md">
            <Image src="/logo.png" alt="Thavio" width={198} height={58} priority className="mb-8" />
            <p className="mb-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
              Cổng quản trị
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900">
              Điều hành nền tảng
              <span className="block text-blue-700">nhanh, rõ và an toàn</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Truy cập hệ thống quản trị tập trung cho tài khoản nền tảng, theo dõi vận hành và xử lý sự cố theo thời gian thực.
            </p>
          </div>
        </section>

        <section className="w-full">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-white/70 bg-white/85 p-6 shadow-[0_25px_80px_-35px_rgba(15,23,42,0.35)] backdrop-blur md:p-8">
            <div className="mb-6 md:hidden">
              <Image src="/logo.png" alt="Thavio" width={160} height={48} priority className="mb-3" />
              <p className="text-sm text-slate-500">Quản trị nền tảng</p>
            </div>

            <h2 className="text-2xl font-semibold text-slate-900">Đăng nhập</h2>
            <p className="mt-1 text-sm text-slate-500">Sử dụng tài khoản quản trị để tiếp tục.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-slate-800">
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-800">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 transition hover:text-slate-700"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
