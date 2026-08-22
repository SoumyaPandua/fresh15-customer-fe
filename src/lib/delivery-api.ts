// Centralized customer-side Delivery API layer (real Fresh15 backend).
// Read-only: the customer app must never create/assign/update/delete deliveries.
import { authedRequest, CartApiError } from "./cart-api";
import type { OrderStatus } from "./types";

export { CartApiError as DeliveryApiError };

export type DeliveryStatus =
  | "PENDING"
  | "ASSIGNED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "REJECTED"
  | "FAILED"
  | "CANCELLED";

export type ApiDelivery = {
  _id?: string;
  orderId?: Record<string, any> | string | null;
  riderId?: Record<string, any> | string | null;
  status?: string;
  riderStatus?: string;
  assignedAt?: string | null;
  acceptedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;
  estimatedDeliveryTime?: string | number | null;
  deliveryOtpVerified?: boolean;
  deliveryOtpVerifiedAt?: string | null;
  customerConfirmedAt?: string | null;
  proofOfDelivery?: {
    photoUrl?: string | null;
    signatureUrl?: string | null;
    uploadedAt?: string | null;
  } | null;
  failedDelivery?: {
    reason?: string | null;
    note?: string | null;
    failedAt?: string | null;
  } | null;
  deliveryCharge?: number;
  notes?: string;
  currentLocation?: { latitude?: number | null; longitude?: number | null; updatedAt?: string | null } | null;
};

export type DeliveryRider = {
  id: string;
  name?: string | undefined;
  phone?: string | undefined;
  image?: string | undefined;
};

export type Delivery = {
  id: string;
  status: DeliveryStatus;
  rider: DeliveryRider | null;
  assignedAt?: string | undefined;
  pickedUpAt?: string | undefined;
  deliveredAt?: string | undefined;
  /** Minutes remaining until estimated delivery, when the backend provides it. */
  etaMinutes?: number | undefined;
  estimatedDeliveryTime?: string | undefined;
  deliveryOtpVerified: boolean;
  deliveryOtpVerifiedAt?: string;
  customerConfirmedAt?: string;
  proofOfDelivery?: {
    photoUrl?: string;
    signatureUrl?: string;
    uploadedAt?: string;
  };
  failedDelivery?: {
    reason?: string;
    note?: string;
    failedAt?: string;
  };
  currentLocation: { latitude: number; longitude: number; updatedAt?: string | undefined } | null;
  destination: { latitude: number; longitude: number } | null;
};

const KNOWN: DeliveryStatus[] = [
  "PENDING",
  "ASSIGNED",
  "ACCEPTED",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "REJECTED",
  "FAILED",
  "CANCELLED",
];

export function normalizeDeliveryStatus(raw?: string | null): DeliveryStatus {
  const v = String(raw ?? "").toUpperCase() as DeliveryStatus;
  return KNOWN.includes(v) ? v : "PENDING";
}

/** Delivery statuses that map onto the existing order tracker steps. */
export const DELIVERY_TO_ORDER_STATUS: Partial<Record<DeliveryStatus, OrderStatus>> = {
  ASSIGNED: "packed",
  ACCEPTED: "packed",
  PICKED_UP: "out_for_delivery",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  FAILED: "placed",
  CANCELLED: "cancelled",
};

export function isDeliveryActive(status: DeliveryStatus): boolean {
  return status !== "DELIVERED" && status !== "CANCELLED" && status !== "REJECTED";
}

function toEtaMinutes(value: string | number | null | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) {
    // Small numbers are minutes; large numbers are epoch milliseconds.
    if (value < 1_000_000) return value > 0 ? Math.round(value) : undefined;
    const mins = Math.round((value - Date.now()) / 60000);
    return mins > 0 ? mins : undefined;
  }
  const ts = Date.parse(String(value));
  if (Number.isNaN(ts)) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? Math.round(num) : undefined;
  }
  const mins = Math.round((ts - Date.now()) / 60000);
  return mins > 0 ? mins : undefined;
}

function mapRider(raw: ApiDelivery["riderId"]): DeliveryRider | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw ? { id: raw } : null;
  const id = String(raw["_id"] ?? "");
  const name = raw["fullName"] ?? raw["name"] ?? undefined;
  const phone = raw["phone"] ?? raw["mobile"] ?? undefined;
  const image = raw["avatar"] ?? raw["profileImage"] ?? raw["image"] ?? undefined;
  if (!id && !name && !phone) return null;
  return {
    id,
    name: name ? String(name) : undefined,
    phone: phone ? String(phone) : undefined,
    image: image ? String(image) : undefined,
  };
}

export function mapDelivery(raw: ApiDelivery | null | undefined): Delivery | null {
  if (!raw || typeof raw !== "object") return null;
  const est = raw.estimatedDeliveryTime ?? null;
  return {
    id: String(raw._id ?? ""),
    status: normalizeDeliveryStatus(raw.status),
    rider: mapRider(raw.riderId ?? null),
    assignedAt: raw.assignedAt ?? undefined,
    pickedUpAt: raw.pickedUpAt ?? undefined,
    deliveredAt: raw.deliveredAt ?? undefined,
    etaMinutes: toEtaMinutes(est),
    estimatedDeliveryTime: est ? String(est) : undefined,
    deliveryOtpVerified: Boolean(raw.deliveryOtpVerified),
    deliveryOtpVerifiedAt: raw.deliveryOtpVerifiedAt ?? undefined,
    customerConfirmedAt: raw.customerConfirmedAt ?? undefined,
    proofOfDelivery: raw.proofOfDelivery
      ? {
          photoUrl: raw.proofOfDelivery.photoUrl ?? undefined,
          signatureUrl: raw.proofOfDelivery.signatureUrl ?? undefined,
          uploadedAt: raw.proofOfDelivery.uploadedAt ?? undefined,
        }
      : undefined,
    failedDelivery: raw.failedDelivery
      ? {
          reason: raw.failedDelivery.reason ?? undefined,
          note: raw.failedDelivery.note ?? undefined,
          failedAt: raw.failedDelivery.failedAt ?? undefined,
        }
      : undefined,
    currentLocation:
      raw.currentLocation &&
      Number.isFinite(Number(raw.currentLocation.latitude)) &&
      Number.isFinite(Number(raw.currentLocation.longitude))
        ? {
            latitude: Number(raw.currentLocation.latitude),
            longitude: Number(raw.currentLocation.longitude),
            updatedAt: raw.currentLocation.updatedAt ?? undefined,
          }
        : null,
    destination:
      raw.orderId &&
      typeof raw.orderId === "object" &&
      raw.orderId.addressId &&
      typeof raw.orderId.addressId === "object" &&
      Number.isFinite(Number(raw.orderId.addressId.latitude)) &&
      Number.isFinite(Number(raw.orderId.addressId.longitude)) &&
      !(Number(raw.orderId.addressId.latitude) === 0 && Number(raw.orderId.addressId.longitude) === 0)
        ? {
            latitude: Number(raw.orderId.addressId.latitude),
            longitude: Number(raw.orderId.addressId.longitude),
          }
        : null,
  };
}

/**
 * Delivery data is supplemental to the order. Any failure (endpoint not
 * available for customers, delivery not created yet, unauthorized, network)
 * resolves to `null` so /orders/$id keeps rendering the order itself.
 */
export const deliveryApi = {
  async getByOrder(token: string | null, orderId: string): Promise<Delivery | null> {
    if (!token || !orderId) return null;
    try {
      const res = await authedRequest<ApiDelivery | { delivery?: ApiDelivery } | null>(
        `/api/delivery/order/${orderId}`,
        { method: "GET" },
        token,
      );
      const data: any = res.data;
      const payload = data && typeof data === "object" && "delivery" in data ? data.delivery : data;
      return mapDelivery(payload as ApiDelivery | null);
    } catch (err) {
      if (err instanceof CartApiError) return null;
      return null;
    }
  },

  async getDeliveryOtp(
    token: string | null,
    orderId: string,
  ): Promise<{
    required: boolean;
    available: boolean;
    verified: boolean;
    otp: string | null;
    expiresAt: string | null;
    customerConfirmedAt?: string | null;
  }> {
    if (!token || !orderId) {
      return { required: false, available: false, verified: false, otp: null, expiresAt: null };
    }
    const res = await authedRequest<{
      required: boolean;
      available: boolean;
      verified: boolean;
      otp: string | null;
      expiresAt: string | null;
      customerConfirmedAt?: string | null;
    }>(`/api/delivery/order/${orderId}/otp`, { method: "GET" }, token);
    return res.data;
  },

  async confirmDelivery(token: string | null, deliveryId: string) {
    if (!token) throw new CartApiError("Your session has expired. Please sign in again.");
    const res = await authedRequest<ApiDelivery>(
      `/api/delivery/${deliveryId}/customer-confirm`,
      { method: "POST" },
      token,
    );
    return mapDelivery(res.data);
  },
};
