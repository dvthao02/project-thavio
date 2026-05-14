import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlatformUser {
  id: string;
  email: string | null;
  fullName: string | null;
  isPlatformAdmin: boolean;
}

interface AuthState {
  token: string | null;
  user: PlatformUser | null;
  setAuth: (token: string, user: PlatformUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_token', token);
          document.cookie = `admin_token=${token}; path=/; max-age=${8 * 3600}; SameSite=Lax`;
        }
        set({ token, user });
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_token');
          document.cookie = 'admin_token=; path=/; max-age=0; SameSite=Lax';
        }
        set({ token: null, user: null });
      },
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
