import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cartApi, type CartSnapshot } from "@/lib/cart-api";
import { useAuth } from "@/lib/store/auth";
import { useShallow } from "zustand/react/shallow";
import { useCart, selectCartTotals, type CartItem } from "@/lib/store/cart";
import type { Product } from "@/lib/types";
import { type SubstitutionPreference } from "@/lib/substitution";
import { useServiceability } from "@/lib/store/serviceability";

export type CartLineUI = CartItem & { image?: string; stock?: number; isActive?: boolean };

const EMPTY: CartSnapshot = { lines: [], totalItems: 0, totalQuantity: 0, subtotal: 0 };

export function useCartBook() {
  const token = useAuth((s) => s.token);
  const isAuthed = Boolean(token);
  const qc = useQueryClient();
  const cartKey = ["cart", token ?? "guest"] as const;
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
  const serviceability = useServiceability();
  const query = useQuery({
    queryKey: cartKey,
    queryFn: () => cartApi.get(token),
    enabled: isAuthed,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const cachedSnapshot = query.data ?? EMPTY;
  const lines = Array.isArray(cachedSnapshot.lines) ? cachedSnapshot.lines : [];
  const items: CartLineUI[] = isAuthed
    ? lines.map((line) => ({
        productId: line.productId,
        name: line.product.name,
        emoji: line.product.emoji,
        gradient: line.product.gradient,
        price: line.price,
        mrp: line.product.mrp,
        unit: line.product.unit,
        qty: line.qty,
        image: line.product.image,
        stock: line.product.stock,
        isActive: line.product.isActive !== false,
        substitutionPreference: line.substitutionPreference,
        preferredReplacementProductId: line.preferredReplacementProductId,
        preferredReplacementName: line.preferredReplacementName,
      }))
    : local.items;

  const baseTotals = selectCartTotals({ items, appliedCoupon: local.appliedCoupon } as never);
  const deliveryFee = serviceability.serviceable
    ? (baseTotals.subtotal >= serviceability.freeDeliveryAbove ? 0 : serviceability.baseDeliveryFee)
    : baseTotals.deliveryFee;
  const totals = {
    ...baseTotals,
    deliveryFee,
    total: Math.max(
      0,
      baseTotals.subtotal - baseTotals.couponDiscount + deliveryFee + baseTotals.taxes,
    ),
  };

  const setCart = (cart: CartSnapshot) => {
    qc.setQueryData<CartSnapshot>(cartKey, cart ?? EMPTY);
  };

  const mutation = useMutation({
    mutationFn: (run: () => Promise<{ cart: CartSnapshot; message?: string }>) => run(),
    onSuccess: (res) => {
      if (res?.cart && Array.isArray(res.cart.lines)) {
        setCart(res.cart);
      } else {
        void qc.invalidateQueries({ queryKey: cartKey });
      }
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Could not update your cart");
    },
  });

  const run = async (fn: () => Promise<{ cart: CartSnapshot; message?: string }>) => {
    try {
      await mutation.mutateAsync(fn);
    } catch {}
  };

  const qtyOf = (productId: string) =>
    items.find((item) => item.productId === productId)?.qty ?? 0;

  return {
    isAuthed,
    items,
    totals,
    appliedCoupon: local.appliedCoupon,
    applyCoupon: local.applyCoupon,
    clearCoupon: local.clearCoupon,
    isLoading: isAuthed && query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    busy: mutation.isPending,
    refetch: query.refetch,
    qtyOf,
    async add(product: Product) {
      if (!isAuthed) {
        local.add(product);
        return;
      }
      await run(() => cartApi.add(token, product.id, 1));
    },
    async inc(productId: string) {
      if (!isAuthed) {
        local.inc(productId);
        return;
      }
      await run(() => cartApi.setQuantity(token, productId, qtyOf(productId) + 1));
    },
    async dec(productId: string) {
      if (!isAuthed) {
        local.dec(productId);
        return;
      }
      const next = qtyOf(productId) - 1;
      if (next <= 0) await run(() => cartApi.remove(token, productId));
      else await run(() => cartApi.setQuantity(token, productId, next));
    },
    async remove(productId: string) {
      if (!isAuthed) {
        local.remove(productId);
        return;
      }
      await run(() => cartApi.remove(token, productId));
    },
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
            preferredReplacementProductId:
              preference === "SPECIFIC_ITEM" ? (replacement?.id ?? null) : null,
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
      if (!isAuthed) {
        local.clear();
        return;
      }
      await run(() => cartApi.clear(token));
    },
  };
}

export function useCartCount() {
  const token = useAuth((s) => s.token);
  const localCount = useCart(
    useShallow((s) => s.items.reduce((sum, item) => sum + item.qty, 0)),
  );
  const isAuthed = Boolean(token);
  const cartKey = ["cart", token ?? "guest"] as const;
  const qc = useQueryClient();

  if (!isAuthed) return localCount;

  const snapshot = qc.getQueryData<CartSnapshot>(cartKey);
  return Number(snapshot?.totalQuantity) || 0;
}
