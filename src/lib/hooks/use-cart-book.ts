import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cartApi, type CartSnapshot } from "@/lib/cart-api";
import { useAuth } from "@/lib/store/auth";
import { useShallow } from "zustand/react/shallow";
import { useCart, selectCartTotals, type CartItem } from "@/lib/store/cart";
import type { Product } from "@/lib/types";
import { type SubstitutionPreference } from "@/lib/substitution";
import { useServiceability } from "@/lib/store/serviceability";

export type CartLineUI = CartItem & { image?: string | undefined; stock?: number; isActive?: boolean };

const EMPTY: CartSnapshot = { lines: [], totalItems: 0, totalQuantity: 0, subtotal: 0 };

/**
 * Single source of truth for the cart.
 * Authenticated customers read/write the real backend (authoritative);
 * guests keep the local persisted store. The two never merge.
 */
export function useCartBook() {
  const token = useAuth((s) => s.token);
  const isAuthed = Boolean(token);
  const qc = useQueryClient();
  // Subscribe to the exact slices used here (actions are stable) instead of the
  // whole store, so unrelated store writes don't re-render every ProductCard.
  const local = useCart(
    useShallow((s) => ({
      items: s.items,
      appliedCoupon: s.appliedCoupon,
      add: s.add,
      inc: s.inc,
      dec: s.dec,
      remove: s.remove,
      clear: s.clear,
      setSubstitution: s.setSubstitution,
      applyCoupon: s.applyCoupon,
      clearCoupon: s.clearCoupon,
    })),
  );
  const coupon = local.appliedCoupon;
  const serviceability = useServiceability();

  const query = useQuery({
    queryKey: ["cart", token ?? "guest"],
    queryFn: () => cartApi.get(token),
    enabled: isAuthed,
    staleTime: 15_000,
  });

  const cachedSnapshot = query.data;

  const lines = Array.isArray(cachedSnapshot?.lines) ? cachedSnapshot.lines : [];

  const snapshot: CartSnapshot = {
    lines,
    totalItems: Number(cachedSnapshot?.totalItems) || lines.length,
    totalQuantity: Number(cachedSnapshot?.totalQuantity) || lines.reduce((sum, line) => sum + line.qty, 0),
    subtotal: Number(cachedSnapshot?.subtotal) || lines.reduce((sum, line) => sum + line.subtotal, 0),
  };

  const items: CartLineUI[] = isAuthed
    ? lines.map((l) => ({
        productId: l.productId,
        name: l.product.name,
        emoji: l.product.emoji,
        gradient: l.product.gradient,
        price: l.price,
        mrp: l.product.mrp,
        unit: l.product.unit,
        qty: l.qty,
        image: l.product.image,
        stock: l.product.stock,
        isActive: l.product.isActive !== false,
        substitutionPreference: l.substitutionPreference,
        preferredReplacementProductId: l.preferredReplacementProductId,
        preferredReplacementName: l.preferredReplacementName,
      }))
    : local.items;

  const baseTotals = selectCartTotals({ items, appliedCoupon: coupon } as never);
  const configuredFee = serviceability.baseDeliveryFee;
  const freeAbove = serviceability.freeDeliveryAbove;
  const deliveryFee = serviceability.serviceable
    ? (baseTotals.subtotal >= freeAbove ? 0 : configuredFee)
    : baseTotals.deliveryFee;
  const totals = {
    ...baseTotals,
    deliveryFee,
    total: Math.max(0, baseTotals.subtotal - baseTotals.couponDiscount + deliveryFee + baseTotals.taxes),
  };

  const cartKey = ["cart", token ?? "guest"] as const;
  const setCart = (cart: CartSnapshot) => qc.setQueryData(cartKey, cart);

  const mutation = useMutation({
    mutationFn: async (run: () => Promise<{ cart: CartSnapshot; message?: string }>) => run(),
    onSuccess: (res) => {
      // A partial/unknown response shape must never wipe the cart — refetch instead.
      if (res.cart.lines.length === 0 && (qc.getQueryData<CartSnapshot>(cartKey)?.lines.length ?? 0) > 0) {
        void qc.invalidateQueries({ queryKey: cartKey });
        return;
      }
      setCart(res.cart);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not update your cart"),
  });

  const run = async (fn: () => Promise<{ cart: CartSnapshot; message?: string }>) => {
    try {
      await mutation.mutateAsync(fn);
    } catch {
      /* surfaced via toast */
    }
  };

  const qtyOf = (productId: string) => items.find((i) => i.productId === productId)?.qty ?? 0;

  return {
    isAuthed,
    items,
    totals,
    appliedCoupon: coupon,
    applyCoupon: local.applyCoupon,
    clearCoupon: local.clearCoupon,
    isLoading: isAuthed && query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    busy: mutation.isPending,
    qtyOf,
    async add(product: Product) {
      if (!isAuthed) return local.add(product);
      await run(() => cartApi.add(token, product.id, 1));
    },
    async inc(productId: string) {
      if (!isAuthed) return local.inc(productId);
      await run(() => cartApi.setQuantity(token, productId, qtyOf(productId) + 1));
    },
    async dec(productId: string) {
      if (!isAuthed) return local.dec(productId);
      const next = qtyOf(productId) - 1;
      if (next <= 0) await run(() => cartApi.remove(token, productId));
      else await run(() => cartApi.setQuantity(token, productId, next));
    },
    async remove(productId: string) {
      if (!isAuthed) return local.remove(productId);
      await run(() => cartApi.remove(token, productId));
    },
    /**
     * Persist the out-of-stock substitution preference for one line.
     * Guests use the local store; authenticated customers hit
     * PATCH /api/cart/:productId/substitution (backend is authoritative).
     */
    async setSubstitution(
      productId: string,
      preference: SubstitutionPreference,
      replacement?: { id: string; name: string } | null,
    ) {
      if (preference === "SPECIFIC_ITEM" && !replacement?.id) {
        toast.error("Please choose a replacement product first.");
        return false;
      }
      if (!isAuthed) {
        local.setSubstitution(productId, preference, replacement ?? null);
        return true;
      }
      try {
        await mutation.mutateAsync(() =>
          cartApi.setSubstitution(token, productId, {
            preference,
            preferredReplacementProductId: preference === "SPECIFIC_ITEM" ? (replacement?.id ?? null) : null,
            quantity: qtyOf(productId) || 1,
          }),
        );
        return true;
      } catch {
        return false;
      }
    },
    async clear() {
      local.clearCoupon();
      if (!isAuthed) return local.clear();
      await run(() => cartApi.clear(token));
    },
  };
}

/** Lightweight count for nav badges — shares the same query cache. */
export function useCartCount() {
  return useCartBook().totals.count;
}
