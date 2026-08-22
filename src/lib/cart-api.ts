// Centralized authenticated Cart API layer (real Fresh15 backend).
import { API_BASE_URL } from "./config";
import { mapProduct } from "./catalog-api";
import type { Product } from "./types";
import {
  DEFAULT_SUBSTITUTION,
  extractReplacementId,
  normalizeSubstitution,
  toPreferenceType,
  type SubstitutionPreference,
} from "./substitution";

type ApiEnvelope<T> = { success: boolean; message?: string; data: T };

export type ApiCart = {
  _id?: string;
  userId?: string;
  items?: Array<{
    productId: Record<string, any> | string;
    quantity?: number;
    price?: number;
    subtotal?: number;
    /** Backend returns an object: { type, preferredReplacementProductId }. */
    substitutionPreference?:
      | { type?: string | null; preferredReplacementProductId?: Record<string, any> | string | null }
      | string
      | null;
    preferredReplacementProductId?: Record<string, any> | string | null;
  }>;
  totalItems?: number;
  totalQuantity?: number;
  subtotal?: number;
};

export type CartLine = {
  productId: string;
  product: Product;
  qty: number;
  price: number;
  subtotal: number;
  /** Out-of-stock substitution preference (backend contract). */
  substitutionPreference: SubstitutionPreference;
  preferredReplacementProductId: string | null;
  preferredReplacementName: string | null;
  /** False when the backend response did not echo the substitution fields. */
  substitutionSupported: boolean;
};

export type CartSnapshot = {
  lines: CartLine[];
  totalItems: number;
  totalQuantity: number;
  subtotal: number;
};

export class CartApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "CartApiError";
    this.status = status;
  }
}

export async function authedRequest<T>(path: string, init: RequestInit, token: string | null): Promise<ApiEnvelope<T>> {
  if (!token) throw new CartApiError("Please sign in to continue.", 401);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new CartApiError("Network error. Please check your connection and try again.");
  }
  let json: Partial<ApiEnvelope<T>> | null = null;
  try {
    json = (await res.json()) as Partial<ApiEnvelope<T>>;
  } catch {
    json = null;
  }
  if (!res.ok || json?.success === false) {
    throw new CartApiError(json?.message || "Something went wrong. Please try again.", res.status);
  }
  return (json ?? { success: true, data: null }) as ApiEnvelope<T>;
}

export function mapCart(data: ApiCart | null | undefined): CartSnapshot {
  const rawItems = Array.isArray(data?.items) ? data!.items! : [];
  const lines: CartLine[] = [];
  for (const it of rawItems) {
    const raw = typeof it.productId === "string" ? { _id: it.productId } : it.productId;
    if (!raw) continue;
    const product = mapProduct(raw as Record<string, any>);
    const qty = Number(it.quantity) || 0;
    const price = Number(it.price) || product.price;
    if (qty <= 0) continue;
    const subValue = it.substitutionPreference;
    const nestedReplacement =
      subValue && typeof subValue === "object" ? (subValue.preferredReplacementProductId ?? null) : null;
    const replacementRaw = nestedReplacement ?? it.preferredReplacementProductId ?? null;
    const replacement =
      replacementRaw && typeof replacementRaw === "object"
        ? mapProduct(replacementRaw as Record<string, any>)
        : null;
    lines.push({
      productId: product.id,
      product,
      qty,
      price,
      subtotal: Number(it.subtotal) || price * qty,
      substitutionPreference: normalizeSubstitution(subValue),
      preferredReplacementProductId:
        replacement?.id ??
        (typeof replacementRaw === "string" ? replacementRaw : extractReplacementId(subValue)),
      preferredReplacementName: replacement?.name ?? null,
      substitutionSupported: toPreferenceType(subValue) != null,
    });
  }
  return {
    lines,
    totalItems: Number(data?.totalItems) || lines.length,
    totalQuantity: Number(data?.totalQuantity) || lines.reduce((s, l) => s + l.qty, 0),
    subtotal: Number(data?.subtotal) || lines.reduce((s, l) => s + l.subtotal, 0),
  };
}

export type SubstitutionUpdate = {
  preference: SubstitutionPreference;
  /** Required when preference is SPECIFIC_ITEM. */
  preferredReplacementProductId?: string | null;
  /** Preserved so the backend never resets quantity while saving a preference. */
  quantity: number;
};

export const cartApi = {
  async get(token: string | null) {
    const res = await authedRequest<ApiCart>("/api/cart", { method: "GET" }, token);
    return mapCart(res.data);
  },
  async add(token: string | null, productId: string, quantity = 1) {
    const res = await authedRequest<ApiCart>(
      "/api/cart",
      {
        method: "POST",
        body: JSON.stringify({
          productId,
          quantity,
          substitutionPreference: { type: DEFAULT_SUBSTITUTION, preferredReplacementProductId: null },
        }),
      },
      token,
    );
    return { cart: mapCart(res.data), message: res.message };
  },
  async setQuantity(token: string | null, productId: string, quantity: number) {
    const res = await authedRequest<ApiCart>(
      `/api/cart/${productId}`,
      { method: "PUT", body: JSON.stringify({ quantity }) },
      token,
    );
    return { cart: mapCart(res.data), message: res.message };
  },
  /** PATCH /api/cart/:productId/substitution — dedicated route; quantity untouched. */
  async setSubstitution(token: string | null, productId: string, update: SubstitutionUpdate) {
    const res = await authedRequest<ApiCart>(
      `/api/cart/${productId}/substitution`,
      {
        method: "PATCH",
        body: JSON.stringify({
          substitutionPreference: {
            type: update.preference,
            preferredReplacementProductId:
              update.preference === "SPECIFIC_ITEM" ? (update.preferredReplacementProductId ?? null) : null,
          },
        }),
      },
      token,
    );
    return { cart: mapCart(res.data), message: res.message };
  },
  async remove(token: string | null, productId: string) {
    const res = await authedRequest<ApiCart>(`/api/cart/${productId}`, { method: "DELETE" }, token);
    return { cart: mapCart(res.data), message: res.message };
  },
  async clear(token: string | null) {
    const res = await authedRequest<ApiCart>("/api/cart/clear", { method: "DELETE" }, token);
    return { cart: mapCart(res.data), message: res.message };
  },
};
