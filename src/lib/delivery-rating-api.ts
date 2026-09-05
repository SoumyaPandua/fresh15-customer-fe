import { authedRequest } from "./cart-api";

export type DeliveryRatingState = { rated: boolean; rating: number | null; createdAt: string | null };
export async function getDeliveryRating(token: string, orderId: string): Promise<DeliveryRatingState> {
  const res = await authedRequest<DeliveryRatingState>(`/api/delivery-ratings/${orderId}`, { method: "GET" }, token);
  return res.data;
}
export async function rateDeliveryPartner(token: string, orderId: string, rating: number): Promise<DeliveryRatingState & { averageRating?: number; ratingCount?: number; tier?: string }> {
  const res = await authedRequest<DeliveryRatingState & { averageRating?: number; ratingCount?: number; tier?: string }>(`/api/delivery-ratings/${orderId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating }) }, token);
  return res.data;
}
