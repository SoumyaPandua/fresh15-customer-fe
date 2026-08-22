import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";
type ThemeState = { theme: Theme; toggle: () => void; set: (t: Theme) => void };

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      toggle: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
      set: (theme) => set({ theme }),
    }),
    { name: "fresh15-theme" },
  ),
);

export function applyThemeClass(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}
