import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { Product } from "../types";
import { DEFAULT_SUBSTITUTION, type SubstitutionPreference } from "../substitution";

export type CartItem = {
  productId: string;
  name: string;
  emoji: string;
  gradient: Product["gradient"];
  price: number;
  mrp: number;
  unit: string;
  qty: number;
  substitutionPreference?: SubstitutionPreference;
  preferredReplacementProductId?: string | null;
  preferredReplacementName?: string | null;
};

type CartState = {
  items: CartItem[];
  appliedCoupon?: { code: string; discount: number };
  add: (p: Product) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  setSubstitution: (
    id: string,
    preference: SubstitutionPreference,
    replacement?: { id: string; name: string } | null,
  ) => void;
  applyCoupon: (code: string, discount: number) => void;
  clearCoupon: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (p) => {
        const items = get().items;
        const existing = items.find((i) => i.productId === p.id);
        if (existing) {
          set({ items: items.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + 1 } : i)) });
        } else {
          set({
            items: [
              ...items,
              {
                productId: p.id,
                name: p.name,
                emoji: p.emoji,
                gradient: p.gradient,
                price: p.price,
                mrp: p.mrp,
                unit: p.unit,
                qty: 1,
                substitutionPreference: DEFAULT_SUBSTITUTION,
                preferredReplacementProductId: null,
                preferredReplacementName: null,
              },
            ],
          });
        }
      },
      inc: (id) => set({ items: get().items.map((i) => (i.productId === id ? { ...i, qty: i.qty + 1 } : i)) }),
      dec: (id) => {
        const items = get().items
          .map((i) => (i.productId === id ? { ...i, qty: i.qty - 1 } : i))
          .filter((i) => i.qty > 0);
        set({ items });
      },
      remove: (id) => set({ items: get().items.filter((i) => i.productId !== id) }),
      clear: () => set({ items: [], appliedCoupon: undefined }),
      setSubstitution: (id, preference, replacement) =>
        set({
          items: get().items.map((i) =>
            i.productId === id
              ? {
                  ...i,
                  substitutionPreference: preference,
                  preferredReplacementProductId: preference === "SPECIFIC_ITEM" ? (replacement?.id ?? null) : null,
                  preferredReplacementName: preference === "SPECIFIC_ITEM" ? (replacement?.name ?? null) : null,
                }
              : i,
          ),
        }),
      applyCoupon: (code, discount) => set({ appliedCoupon: { code, discount } }),
      clearCoupon: () => set({ appliedCoupon: undefined }),
    }),
    { name: "fresh15-cart" },
  ),
);

export const selectCartTotals = (state: CartState) => {
  const subtotal = state.items.reduce((s, i) => s + i.price * i.qty, 0);
  const mrpTotal = state.items.reduce((s, i) => s + i.mrp * i.qty, 0);
  const savings = mrpTotal - subtotal;
  const couponDiscount = state.appliedCoupon?.discount ?? 0;
  const deliveryFee = subtotal === 0 ? 0 : subtotal >= 199 ? 0 : 25;
  const taxable = Math.max(0, subtotal - couponDiscount);
  const taxes = Math.round(taxable * 0.05);
  const total = Math.max(0, taxable + deliveryFee + taxes);
  const count = state.items.reduce((s, i) => s + i.qty, 0);
  return { subtotal, mrpTotal, savings, couponDiscount, deliveryFee, taxes, total, count };
};

export const useCartTotals = () => useCart(useShallow(selectCartTotals));

/**
 * Fallback store for authenticated carts: the Fresh15 backend is authoritative
 * for substitution preferences, but until the endpoint ships (or when a
 * response omits the fields) we keep the customer's choice here so it survives
 * quantity changes and reloads instead of vanishing.
 */
export type SubstitutionChoice = {
  preference: SubstitutionPreference;
  preferredReplacementProductId: string | null;
  preferredReplacementName: string | null;
};

type SubstitutionFallbackState = {
  byProductId: Record<string, SubstitutionChoice>;
  set: (productId: string, choice: SubstitutionChoice) => void;
  clear: () => void;
};

export const useSubstitutionFallback = create<SubstitutionFallbackState>()(
  persist(
    (set, get) => ({
      byProductId: {},
      set: (productId, choice) => set({ byProductId: { ...get().byProductId, [productId]: choice } }),
      clear: () => set({ byProductId: {} }),
    }),
    { name: "fresh15-substitutions" },
  ),
);
