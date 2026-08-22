import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role?: string;
  isEmailVerified?: boolean;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isGuest: boolean;
  login: (u: AuthUser, token?: string) => void;
  loginAsGuest: () => void;
  logout: () => void;
  updateProfile: (patch: Partial<AuthUser>) => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isGuest: false,
      login: (user, token) => set({ user, token: token ?? null, isGuest: false }),
      loginAsGuest: () => set({ user: null, token: null, isGuest: true }),
      logout: () => set({ user: null, token: null, isGuest: false }),
      updateProfile: (patch) => {
        const u = get().user;
        if (!u) return;
        set({ user: { ...u, ...patch } });
      },
    }),
    { name: "fresh15-auth" },
  ),
);
