// Centralized authenticated Wishlist API layer (real Fresh15 backend).
import { authedRequest } from "./cart-api";
import { mapProduct } from "./catalog-api";
import type { Product } from "./types";

export type ApiWishlist = {
  _id?: string;
  userId?: string;
  items?: Array<{ productId: Record<string, any> | string }>;
  totalItems?: number;
};

export type WishlistSnapshot = {
  products: Product[];
  ids: string[];
  totalItems: number;
};

export function mapWishlist(data: ApiWishlist | null | undefined): WishlistSnapshot {
  const rawItems = Array.isArray(data?.items) ? data!.items! : [];
  const products: Product[] = [];
  for (const it of rawItems) {
    const raw = typeof it.productId === "string" ? { _id: it.productId } : it.productId;
    if (!raw) continue;
    products.push(mapProduct(raw as Record<string, any>));
  }
  return {
    products,
    ids: products.map((p) => p.id),
    totalItems: Number(data?.totalItems) || products.length,
  };
}

export const wishlistApi = {
  async get(token: string | null) {
    const res = await authedRequest<ApiWishlist>("/api/wishlist", { method: "GET" }, token);
    return mapWishlist(res.data);
  },
  async add(token: string | null, productId: string) {
    const res = await authedRequest<ApiWishlist>(
      "/api/wishlist",
      { method: "POST", body: JSON.stringify({ productId }) },
      token,
    );
    return { wishlist: mapWishlist(res.data), message: res.message };
  },
  async remove(token: string | null, productId: string) {
    const res = await authedRequest<ApiWishlist>(`/api/wishlist/${productId}`, { method: "DELETE" }, token);
    return { wishlist: mapWishlist(res.data), message: res.message };
  },
};
