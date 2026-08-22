import type { Coupon } from "../types";

export const coupons: Coupon[] = [
  { code: "FRESH50", description: "Flat ₹50 off on orders above ₹299", type: "flat", value: 50, minOrder: 299 },
  { code: "SAVE10", description: "10% off up to ₹100", type: "percent", value: 10, minOrder: 199, maxDiscount: 100 },
  { code: "NEW100", description: "₹100 off for new users on ₹499+", type: "flat", value: 100, minOrder: 499 },
];
