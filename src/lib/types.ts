import type { SubstitutionPreference } from "./substitution";

export type Category = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  gradient: "warm" | "cool" | "fresh" | "primary";
  /** Backend image URL when available. */
  image?: string | undefined;
};

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string | undefined;
  emoji: string;
  gradient: "warm" | "cool" | "fresh" | "primary";
  price: number;
  mrp: number;
  unit: string;
  stock: number;
  rating: number;
  reviews: number;
  etaMinutes: number;
  brand?: string | undefined;
  description: string;
  /** Backend image URL when available. */
  image?: string | undefined;
  isActive?: boolean;
  variants?: { label: string; price: number; mrp: number; unit: string }[];
  images?: string[];
  tags?: ("bestseller" | "seasonal" | "recommended" | "flash")[];
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  gradient: "warm" | "cool" | "fresh" | "primary";
  emoji: string;
};

export type Address = {
  id: string;
  label: "Home" | "Work" | "Other";
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;

  latitude?: number | null;
  longitude?: number | null;

  isDefault?: boolean;
};

export type OrderStatus = "placed" | "packed" | "out_for_delivery" | "delivered" | "cancelled";

export type OrderItem = {
  productId: string;
  name: string;
  emoji: string;
  gradient: Product["gradient"];
  qty: number;
  price: number;
  unit: string;
  /** Backend image URL when available. */
  image?: string | undefined;
  /** Frozen out-of-stock substitution preference for this line. */
  substitutionPreference?: SubstitutionPreference | undefined;
  preferredReplacementProductId?: string | null | undefined;
  preferredReplacementName?: string | undefined;
};

export type Order = {
  id: string;
  /** Human-readable order number from the backend (falls back to id). */
  orderNumber?: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string | undefined;
  deliveryFee: number;
  taxes: number;
  total: number;
  address: Address;
  paymentMethod: "cod" | "razorpay";
  paymentStatus?: string | undefined;
  paymentExpiresAt?: string | undefined;
  /** True only when the backend has actually assigned a delivery partner. */
  hasDeliveryPartner?: boolean;
  etaMinutes?: number;
};

export type Coupon = {
  code: string;
  description: string;
  type: "flat" | "percent";
  value: number;
  minOrder: number;
  maxDiscount?: number;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  icon: "order" | "offer" | "system";
};
