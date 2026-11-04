import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api, setAuthToken } from '@/lib/api';
import type { User } from '@/lib/schemas';

interface AuthState {
  token: string | null;
  user: User | null;
  expiresAt: number | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, display_name: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      expiresAt: null,
      login: async (email, password) => {
        const r = await api.login({ email, password });
        setAuthToken(r.access_token);
        set({ token: r.access_token, user: r.user, expiresAt: Date.now() + r.expires_in * 1000 });
      },
      register: async (email, password, display_name) => {
        const r = await api.register({ email, password, display_name });
        setAuthToken(r.access_token);
        set({ token: r.access_token, user: r.user, expiresAt: Date.now() + r.expires_in * 1000 });
      },
      logout: () => {
        setAuthToken(null);
        set({ token: null, user: null, expiresAt: null });
      },
      hydrate: () => {
        const { token, expiresAt } = get();
        if (token && expiresAt && expiresAt > Date.now()) setAuthToken(token);
        else if (token) get().logout();
      },
    }),
    { name: 'locate-u-auth', storage: createJSONStorage(() => localStorage) },
  ),
);
