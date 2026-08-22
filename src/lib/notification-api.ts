// Centralized Notification API layer (real Fresh15 backend).
import { authedRequest, CartApiError } from "./cart-api";
import type { AppNotification } from "./types";

export { CartApiError as NotificationApiError };

export type ApiNotification = {
  _id: string;
  title?: string;
  message?: string;
  type?: string;
  isRead?: boolean;
  readAt?: string | null;
  metadata?: { orderId?: string; orderNumber?: string; deliveryId?: string } | null;
  createdAt?: string;
};

export type Notification = AppNotification & {
  orderId?: string | undefined;
  orderNumber?: string | undefined;
  createdAt: string;
};

const ORDER_TYPES = [
  "ORDER",
  "ORDER_PLACED",
  "ORDER_CONFIRMED",
  "PACKING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "DELIVERY",
  "PAYMENT",
];

function iconFor(type?: string): AppNotification["icon"] {
  const t = (type ?? "").toUpperCase();
  if (
    t.includes("OFFER") ||
    t.includes("COUPON") ||
    t.includes("PROMO") ||
    t.includes("PRICE_DROP")
  )
    return "offer";
  if (t.includes("BACK_IN_STOCK")) return "system";
  if (ORDER_TYPES.some((k) => t.includes(k))) return "order";
  return "system";
}

export function relativeTime(iso?: string): string {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "";
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-IN");
}

export function mapNotification(n: ApiNotification): Notification {
  const createdAt = n.createdAt ?? new Date().toISOString();
  return {
    id: n._id,
    title: n.title ?? "Notification",
    body: n.message ?? "",
    time: relativeTime(createdAt),
    read: Boolean(n.isRead),
    icon: iconFor(n.type),
    orderId: n.metadata?.orderId ?? undefined,
    orderNumber: n.metadata?.orderNumber ?? undefined,
    createdAt,
  };
}

export const notificationApi = {
  async list(token: string | null): Promise<Notification[]> {
    const r = await authedRequest<any>("/api/notification", { method: "GET" }, token);
    const raw = Array.isArray(r.data) ? r.data : Array.isArray(r.data?.notifications) ? r.data.notifications : [];
    return (raw as ApiNotification[]).map(mapNotification);
  },
  async unreadCount(token: string | null): Promise<number> {
    const r = await authedRequest<any>("/api/notification/unread-count", { method: "GET" }, token);
    const d = r.data;
    return Number(typeof d === "number" ? d : (d?.count ?? 0)) || 0;
  },
  async markRead(token: string | null, id: string): Promise<void> {
    await authedRequest<unknown>(`/api/notification/${id}/read`, { method: "PATCH" }, token);
  },
  async markAllRead(token: string | null): Promise<void> {
    await authedRequest<unknown>("/api/notification/read-all", { method: "PATCH" }, token);
  },
  async remove(token: string | null, id: string): Promise<void> {
    await authedRequest<unknown>(`/api/notification/${id}`, { method: "DELETE" }, token);
  },
};
