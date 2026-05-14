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
  permissions: string[];
  setAuth: (token: string, user: PlatformUser) => void;
  setPermissions: (permissions: string[]) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      permissions: [],
      setAuth: (token, user) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_token', token);
          document.cookie = `admin_token=${token}; path=/; max-age=${8 * 3600}; SameSite=Lax`;
        }
        set({ token, user });
      },
      setPermissions: (permissions) => set({ permissions }),
      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_token');
          document.cookie = 'admin_token=; path=/; max-age=0; SameSite=Lax';
        }
        set({ token: null, user: null, permissions: [] });
      },
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({ user: state.user, permissions: state.permissions }),
    },
  ),
);
