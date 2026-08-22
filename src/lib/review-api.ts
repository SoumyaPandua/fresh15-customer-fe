// Centralized Review API layer (real Fresh15 backend).
import { API_BASE_URL } from "./config";
import { authedRequest, CartApiError } from "./cart-api";

export { CartApiError as ReviewApiError };

export type ApiReview = {
  _id: string;
  productId?: string | Record<string, any>;
  orderId?: string | Record<string, any>;
  userId?: { _id?: string; name?: string; profileImage?: string } | string | null;
  rating?: number;
  title?: string;
  comment?: string;
  verifiedPurchase?: boolean;
  isVisible?: boolean;
  createdAt?: string;
};

export type ProductReview = {
  id: string;
  productId: string;
  orderId?: string | undefined;
  userId: string;
  userName: string;
  userImage?: string | undefined;
  rating: number;
  title?: string | undefined;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
};

const idOf = (v: unknown): string =>
  typeof v === "string" ? v : ((v as Record<string, any> | null)?.["_id"] as string) ?? "";

export function mapReview(r: ApiReview): ProductReview {
  const user = typeof r.userId === "object" && r.userId ? r.userId : null;
  return {
    id: r._id,
    productId: idOf(r.productId),
    orderId: idOf(r.orderId) || undefined,
    userId: user?._id ?? (typeof r.userId === "string" ? r.userId : ""),
    userName: user?.name ?? "Customer",
    userImage: user?.profileImage ?? undefined,
    rating: Number(r.rating ?? 0),
    title: r.title ?? undefined,
    comment: r.comment ?? "",
    verifiedPurchase: Boolean(r.verifiedPurchase),
    createdAt: r.createdAt ?? new Date().toISOString(),
  };
}

export type CreateReviewInput = {
  productId: string;
  orderId: string;
  rating: number;
  title?: string;
  comment: string;
};

export const reviewApi = {
  /** Public: product reviews don't require authentication. */
  async listForProduct(productId: string): Promise<ProductReview[]> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/api/review/product/${productId}`, {
        headers: { Accept: "application/json" },
      });
    } catch {
      throw new CartApiError("Network error. Please check your connection and try again.");
    }
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (!res.ok || json?.success === false) {
      // Missing/empty review data should never break the product page.
      if (res.status === 404) return [];
      throw new CartApiError(json?.message || "Could not load reviews.", res.status);
    }
    const list: ApiReview[] = Array.isArray(json?.data) ? json.data : [];
    return list.filter((r) => r.isVisible !== false).map(mapReview);
  },

  async create(token: string | null, input: CreateReviewInput): Promise<ProductReview | null> {
    const r = await authedRequest<ApiReview>(
      "/api/review",
      { method: "POST", body: JSON.stringify(input) },
      token,
    );
    return r.data ? mapReview(r.data) : null;
  },

  async update(
    token: string | null,
    id: string,
    input: Partial<Pick<CreateReviewInput, "rating" | "title" | "comment">>,
  ): Promise<ProductReview | null> {
    const r = await authedRequest<ApiReview>(
      `/api/review/${id}`,
      { method: "PUT", body: JSON.stringify(input) },
      token,
    );
    return r.data ? mapReview(r.data) : null;
  },

  async remove(token: string | null, id: string): Promise<void> {
    await authedRequest<unknown>(`/api/review/${id}`, { method: "DELETE" }, token);
  },
};
