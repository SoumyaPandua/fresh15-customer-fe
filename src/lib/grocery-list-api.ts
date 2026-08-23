import { authedRequest } from "./cart-api";
import { mapCart, type ApiCart, type CartSnapshot } from "./cart-api";

export type GroceryListItem = {
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    image?: string | null;
    price: number;
    mrp: number;
    unit: string;
    sku: string;
  } | null;
  availableStock: number;
  isAvailable: boolean;
};

export type GroceryList = {
  _id: string;
  name: string;
  description?: string;
  listType: "WEEKLY_ESSENTIALS" | "CUSTOM";
  repeatInterval: "NONE" | "WEEKLY";
  isPinned: boolean;
  items: GroceryListItem[];
  lastAddedToCartAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type GroceryListWriteItem = { productId: string; quantity: number };

export type SmartWeeklyResult = {
  list: GroceryList;
  created: boolean;
  source: string;
  generatedAt?: string;
  rules?: {
    purchaseHistory: boolean;
    weekdayPattern: boolean;
    preferences: boolean;
    seasonality: boolean;
    liveStock: boolean;
    ai: boolean;
  };
  insights?: Array<{
    productId: string;
    name: string;
    score: number;
    reasons: string[];
  }>;
};

export type GroceryListResponse = {
  added: Array<{ productId: string; name?: string; quantity: number }>;
  skipped: Array<{ productId: string; name?: string; reason: string }>;
  cart: CartSnapshot;
  summary: { addedCount: number; skippedCount: number };
};

export const groceryListApi = {
  async list(token: string | null) {
    const res = await authedRequest<GroceryList[]>("/api/grocery-lists", { method: "GET" }, token);
    return Array.isArray(res.data) ? res.data : [];
  },
  async create(token: string | null, input: { name: string; description?: string; listType?: GroceryList["listType"]; repeatInterval?: GroceryList["repeatInterval"]; isPinned?: boolean; items: GroceryListWriteItem[] }) {
    const res = await authedRequest<GroceryList>("/api/grocery-lists", { method: "POST", body: JSON.stringify(input) }, token);
    return res.data;
  },
  async saveCart(token: string | null, name = "Weekly Essentials") {
    const res = await authedRequest<GroceryList>("/api/grocery-lists/from-cart", { method: "POST", body: JSON.stringify({ name, isPinned: true }) }, token);
    return res.data;
  },
  async createSmartWeekly(token: string | null) {
    const res = await authedRequest<SmartWeeklyResult>("/api/grocery-lists/smart-weekly", { method: "POST" }, token);
    return res.data;
  },
  async update(token: string | null, id: string, input: Partial<Pick<GroceryList, "name" | "description" | "listType" | "repeatInterval" | "isPinned">> & { items?: GroceryListWriteItem[] }) {
    const res = await authedRequest<GroceryList>(`/api/grocery-lists/${id}`, { method: "PATCH", body: JSON.stringify(input) }, token);
    return res.data;
  },
  async remove(token: string | null, id: string) {
    return authedRequest<null>(`/api/grocery-lists/${id}`, { method: "DELETE" }, token);
  },
  async addToCart(token: string | null, id: string) {
    const res = await authedRequest<Omit<GroceryListResponse, "cart"> & { cart: ApiCart }>(`/api/grocery-lists/${id}/add-to-cart`, { method: "POST" }, token);
    return { ...res.data, cart: mapCart(res.data.cart) };
  },
};

