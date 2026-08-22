import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { wishlistApi, type WishlistSnapshot } from "@/lib/wishlist-api";
import { useAuth } from "@/lib/store/auth";
import { useWishlist } from "@/lib/store/wishlist";
import type { Product } from "@/lib/types";

const EMPTY: WishlistSnapshot = { products: [], ids: [], totalItems: 0 };

/**
 * Single source of truth for the wishlist.
 * Authenticated customers use the real backend; guests keep the local store.
 */
export function useWishlistBook() {
  const token = useAuth((s) => s.token);
  const isAuthed = Boolean(token);
  const qc = useQueryClient();
  const local = useWishlist();

  const query = useQuery({
    queryKey: ["wishlist", token ?? "guest"],
    queryFn: () => wishlistApi.get(token),
    enabled: isAuthed,
    staleTime: 15_000,
  });

  const snapshot = query.data ?? EMPTY;
  const ids = isAuthed ? snapshot.ids : local.ids;
  const products: Product[] = isAuthed ? snapshot.products : [];

  const mutation = useMutation({
    mutationFn: async (run: () => Promise<{ wishlist: WishlistSnapshot; message?: string }>) => run(),
    onSuccess: (res) => qc.setQueryData(["wishlist", token ?? "guest"], res.wishlist),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not update your wishlist"),
  });

  return {
    isAuthed,
    ids,
    products,
    count: ids.length,
    isLoading: isAuthed && query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    busy: mutation.isPending,
    has: (id: string) => ids.includes(id),
    async toggle(productId: string) {
      if (!isAuthed) return local.toggle(productId);
      const wished = ids.includes(productId);
      try {
        await mutation.mutateAsync(() =>
          wished ? wishlistApi.remove(token, productId) : wishlistApi.add(token, productId),
        );
      } catch {
        /* surfaced via toast */
      }
    },
  };
}
