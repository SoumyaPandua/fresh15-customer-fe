import type { Order } from "../types";
import { addresses } from "./addresses";

export const orders: Order[] = [
  {
    id: "FR2041",
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    status: "out_for_delivery",
    items: [
      { productId: "p13", name: "Amul Toned Milk", emoji: "🥛", gradient: "cool", qty: 2, price: 34, unit: "500 ml" },
      { productId: "p18", name: "Whole Wheat Bread", emoji: "🍞", gradient: "warm", qty: 1, price: 45, unit: "400 g" },
      { productId: "p14", name: "Farm Eggs", emoji: "🥚", gradient: "warm", qty: 1, price: 89, unit: "12 pcs" },
    ],
    subtotal: 202,
    discount: 20,
    deliveryFee: 15,
    taxes: 9,
    total: 206,
    address: addresses[0],
    paymentMethod: "razorpay",
    etaMinutes: 6,
  },
  {
    id: "FR2039",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    status: "delivered",
    items: [
      { productId: "p7", name: "Alphonso Mangoes", emoji: "🥭", gradient: "warm", qty: 1, price: 499, unit: "6 pcs" },
      { productId: "p9", name: "Bananas Robusta", emoji: "🍌", gradient: "warm", qty: 2, price: 55, unit: "6 pcs" },
    ],
    subtotal: 609,
    discount: 50,
    deliveryFee: 0,
    taxes: 28,
    total: 587,
    address: addresses[0],
    paymentMethod: "cod",
    etaMinutes: 13,
  },
  {
    id: "FR2032",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    status: "cancelled",
    items: [
      { productId: "p22", name: "Lay's Classic", emoji: "🥔", gradient: "warm", qty: 3, price: 20, unit: "52 g" },
    ],
    subtotal: 60,
    discount: 0,
    deliveryFee: 15,
    taxes: 3,
    total: 78,
    address: addresses[1],
    paymentMethod: "razorpay",
    etaMinutes: 0,
  },
];
