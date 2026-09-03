// Centralized authenticated Coupon + Order + Payment API layer (real Fresh15 backend).
import { authedRequest, CartApiError } from "./cart-api";
import type { Address, Order, OrderItem, OrderStatus } from "./types";
import { isSubstitutionPreference, normalizeSubstitution, type SubstitutionPreference } from "./substitution";
import { mapCart } from "@/lib/cart-api";
import { API_BASE_URL } from "./config";

const toSubstitutionPreference = (v: unknown): SubstitutionPreference | undefined =>
  isSubstitutionPreference(
    typeof v === "string"
      ? v.toUpperCase()
      : v && typeof v === "object"
        ? String((v as Record<string, unknown>).type ?? "").toUpperCase()
        : v,
  )
    ? normalizeSubstitution(v)
    : undefined;

export { CartApiError as OrderApiError };

export type AppliedCoupon = {
  couponId?: string;
  code: string;
  title?: string;
  originalAmount: number;
  discountAmount: number;
  payableAmount: number;
};

export type ApiOrderItem = {
  productId?: string | Record<string, any>;
  productName?: string;
  quantity?: number;
  price?: number;
  image?: string;
  unit?: string;
  subtotal?: number;
  substitutionPreference?: { type?: string | null; preferredReplacementProductId?: string | Record<string, any> | null } | string | null;
  preferredReplacementProductId?: string | Record<string, any> | null;
  preferredReplacementName?: string | null;
};

export type ApiOrder = {
  _id: string;
  orderNumber?: string;
  status?: string;
  orderStatus?: string;
  items?: ApiOrderItem[];
  subtotal?: number;
  couponCode?: string | null;
  couponDiscount?: number;
  deliveryCharge?: number;
  tax?: number;
  taxAmount?: number;
  grandTotal?: number;
  totalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentExpiresAt?: string | null;
  addressId?: Record<string, any> | string | null;
  notes?: string;
  createdAt?: string;
  deliveryPartnerId?: Record<string, any> | string | null;
  estimatedDeliveryTime?: string | number | null;
  deliverySlotId?: string | null;
  deliveryDateKey?: string;
  deliverySlotLabel?: string;
  promisedDeliveryAt?: string | null;
};

const STATUS_MAP: Record<string, OrderStatus> = {
  PENDING: "placed",
  CONFIRMED: "placed",
  PACKING: "packed",
  READY_FOR_PICKUP: "packed",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

export function mapOrderStatus(raw?: string | null): OrderStatus {
  return STATUS_MAP[String(raw ?? "").toUpperCase()] ?? "placed";
}

const EMPTY_ADDRESS: Address = {
  id: "", label: "Other", name: "", line1: "", city: "", state: "", pincode: "", phone: "",
};

function mapOrderAddress(raw: ApiOrder["addressId"]): Address {
  if (!raw || typeof raw === "string") return EMPTY_ADDRESS;
  const type = String(raw.addressType ?? "OTHER").toUpperCase();
  return {
    id: String(raw._id ?? ""),
    label: type === "HOME" ? "Home" : type === "WORK" ? "Work" : "Other",
    name: String(raw.fullName ?? ""),
    line1: String(raw.addressLine1 ?? ""),
    line2: raw.addressLine2 ? String(raw.addressLine2) : undefined,
    city: String(raw.city ?? ""),
    state: String(raw.state ?? ""),
    pincode: String(raw.pincode ?? ""),
    phone: String(raw.phone ?? ""),
  };
}

function mapOrderItem(it: ApiOrderItem): OrderItem {
  const productId = typeof it.productId === "string" ? it.productId : String(it.productId?._id ?? it.productName ?? "");
  const fromProduct = typeof it.productId === "object" && it.productId ? it.productId : {};
  const substitution = it.substitutionPreference && typeof it.substitutionPreference === "object" ? it.substitutionPreference : null;
  const replacement = substitution?.preferredReplacementProductId ?? it.preferredReplacementProductId ?? null;
  const replacementRef = typeof replacement === "object" && replacement ? replacement : null;
  const replacementId = (replacementRef ? String(replacementRef._id ?? "") : typeof replacement === "string" ? replacement : "") || null;
  const replacementName = substitution?.preferredReplacementProductName ?? it.preferredReplacementName ?? replacementRef?.name ?? undefined;
  return {
    productId,
    name: String(it.productName ?? fromProduct.name ?? "Item"),
    emoji: "🛍️",
    gradient: "fresh",
    qty: Number(it.quantity) || 1,
    price: Number(it.price) || 0,
    unit: String(it.unit ?? fromProduct.unit ?? ""),
    image: it.image ?? substitution?.preferredReplacementImage ?? fromProduct.image ?? undefined,
    substitutionPreference: toSubstitutionPreference(it.substitutionPreference),
    preferredReplacementProductId: replacementId,
    preferredReplacementName: replacementName,
  };
}

export function mapOrder(raw: ApiOrder): Order {
  const items = (Array.isArray(raw.items) ? raw.items : []).map(mapOrderItem);
  const subtotal = Number(raw.subtotal) || items.reduce((s, i) => s + i.price * i.qty, 0);
  const total = Number(raw.grandTotal ?? raw.totalAmount) || subtotal;
  return {
    id: String(raw._id),
    orderNumber: raw.orderNumber ? String(raw.orderNumber) : String(raw._id),
    createdAt: raw.createdAt ?? new Date().toISOString(),
    status: mapOrderStatus(raw.status ?? raw.orderStatus),
    items, subtotal,
    discount: Number(raw.couponDiscount) || 0,
    couponCode: raw.couponCode ? String(raw.couponCode) : undefined,
    deliveryFee: Number(raw.deliveryCharge) || 0,
    taxes: Number(raw.tax ?? raw.taxAmount) || 0,
    total,
    address: mapOrderAddress(raw.addressId),
    paymentMethod: String(raw.paymentMethod ?? "COD").toUpperCase() === "ONLINE" ? "razorpay" : "cod",
    paymentStatus: raw.paymentStatus ? String(raw.paymentStatus).toUpperCase() : undefined,
    paymentExpiresAt: raw.paymentExpiresAt ? String(raw.paymentExpiresAt) : undefined,
    hasDeliveryPartner: Boolean(raw.deliveryPartnerId),
  };
}

export type CreateOrderInput = {
  addressId: string;
  paymentMethod: "COD" | "ONLINE";
  couponCode?: string;
  notes?: string;
  deliverySlotId: string;
  deliveryDateKey: string;
  loyaltyPoints?: number;
};

const CHECKOUT_IDEMPOTENCY_KEY = "fresh15:checkout:idempotency";

const getCheckoutIdempotencyKey = () => {
  if (typeof window === "undefined") return null;
  const existing = window.sessionStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY);
  if (existing) return existing;
  const key = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(CHECKOUT_IDEMPOTENCY_KEY, key);
  return key;
};

const clearCheckoutIdempotencyKey = () => {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(CHECKOUT_IDEMPOTENCY_KEY);
};

export type RazorpayOrderPayload = {
  key: string;
  orderId: string;
  amount: number;
  currency: string;
  receipt?: string;
};

export const orderApi = {
  async applyCoupon(token: string | null, code: string, orderAmount: number) {
    const res = await authedRequest<AppliedCoupon>("/api/coupon/apply", { method: "POST", body: JSON.stringify({ code, orderAmount }) }, token);
    return { coupon: res.data, message: res.message };
  },

  async create(token: string | null, input: CreateOrderInput) {
    const idempotencyKey = getCheckoutIdempotencyKey();
    try {
      const res = await authedRequest<ApiOrder>(
        "/api/order",
        {
          method: "POST",
          headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
          body: JSON.stringify({
            addressId: input.addressId,
            paymentMethod: input.paymentMethod,
            couponCode: input.couponCode ?? "",
            notes: input.notes ?? "",
            deliverySlotId: input.deliverySlotId,
            deliveryDateKey: input.deliveryDateKey,
            loyaltyPoints: input.loyaltyPoints ?? 0,
          }),
        },
        token,
      );
      clearCheckoutIdempotencyKey();
      return { order: mapOrder(res.data), raw: res.data, message: res.message };
    } catch (error) {
      throw error;
    }
  },

  async list(token: string | null) {
    const res = await authedRequest<ApiOrder[] | { orders?: ApiOrder[] }>("/api/order", { method: "GET" }, token);
    const arr = Array.isArray(res.data) ? res.data : (res.data?.orders ?? []);
    return arr.map(mapOrder);
  },

  async get(token: string | null, id: string) {
    const res = await authedRequest<ApiOrder>(`/api/order/${id}`, { method: "GET" }, token);
    return mapOrder(res.data);
  },
};

export const paymentApi = {
  async createOrder(token: string | null, orderId: string) {
    const res = await authedRequest<RazorpayOrderPayload>("/api/payment/create-order", { method: "POST", body: JSON.stringify({ orderId }) }, token);
    return res.data;
  },
  async verify(token: string | null, payload: { orderId: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
    const res = await authedRequest<ApiOrder | null>("/api/payment/verify", { method: "POST", body: JSON.stringify(payload) }, token);
    return res.message;
  },
  async reconcile(token: string | null, orderId: string) {
    const res = await authedRequest<ApiOrder>("/api/payment/reconcile", { method: "POST", body: JSON.stringify({ orderId }) }, token);
    return { order: mapOrder(res.data), message: res.message };
  },
  async failure(token: string | null, payload: Record<string, unknown>) {
    const res = await authedRequest<null>("/api/payment/failure", { method: "POST", body: JSON.stringify(payload) }, token);
    return res.message;
  },
};
