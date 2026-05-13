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
        }
        set({ token, user });
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_token');
        }
        set({ token: null, user: null });
      },
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
