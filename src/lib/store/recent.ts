import { create } from "zustand";
import { persist } from "zustand/middleware";

type RecentState = {
  productIds: string[];
  searches: string[];
  viewProduct: (id: string) => void;
  addSearch: (q: string) => void;
  clearSearches: () => void;
};

export const useRecent = create<RecentState>()(
  persist(
    (set, get) => ({
      productIds: [],
      searches: [],
      viewProduct: (id) => {
        const list = [id, ...get().productIds.filter((x) => x !== id)].slice(0, 12);
        set({ productIds: list });
      },
      addSearch: (q) => {
        const s = q.trim();
        if (!s) return;
        const list = [s, ...get().searches.filter((x) => x.toLowerCase() !== s.toLowerCase())].slice(0, 8);
        set({ searches: list });
      },
      clearSearches: () => set({ searches: [] }),
    }),
    { name: "fresh15-recent" },
  ),
);
