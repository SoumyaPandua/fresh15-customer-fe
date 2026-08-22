// Centralized PUBLIC catalog API layer (real Fresh15 backend).
// No JWT is sent — categories and products are browsable by guests.
import { apiRequest } from "./http";
import type { Category, Product } from "./types";

export class CatalogApiError extends Error {
  unavailable: boolean;
  constructor(message: string, unavailable = false) {
    super(message);
    this.name = "CatalogApiError";
    this.unavailable = unavailable;
  }
}

async function getJson<T>(path: string): Promise<T> {
  try {
    return await apiRequest<T>(path);
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number((error as { status?: number }).status) : 0;
    const message = error instanceof Error ? error.message : "Catalog is temporarily unavailable.";
    throw new CatalogApiError(message, status === 0 || status === 404);
  }
}

/* ------------------------------- mapping -------------------------------- */

type Raw = Record<string, any>;

const GRADIENTS: Category["gradient"][] = ["fresh", "warm", "cool", "primary"];
const pickGradient = (seed: string) => {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n + seed.charCodeAt(i)) % 997;
  return GRADIENTS[n % GRADIENTS.length]!;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const num = (...vals: unknown[]) => {
  for (const v of vals) {
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return undefined;
};

const str = (...vals: unknown[]) => {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
};

const firstImage = (raw: Raw): string | undefined => {
  const candidates = [raw["image"], raw["imageUrl"], raw["thumbnail"], raw["icon"], raw["banner"]];
  for (const c of candidates) {
    const s = str(typeof c === "object" && c ? (c as Raw)["url"] : c);
    if (s && /^https?:\/\//.test(s)) return s;
  }
  const arr = raw["images"] ?? raw["photos"];
  if (Array.isArray(arr)) {
    for (const c of arr) {
      const s = str(typeof c === "object" && c ? (c as Raw)["url"] : c);
      if (s && /^https?:\/\//.test(s)) return s;
    }
  }
  return undefined;
};

const idOf = (raw: Raw | string | undefined | null): string | undefined => {
  if (!raw) return undefined;
  if (typeof raw === "string") return raw;
  return str(raw["_id"], raw["id"]);
};

export function mapCategory(raw: Raw): Category {
  const id = idOf(raw) ?? crypto.randomUUID();
  const name = str(raw["name"], raw["title"], raw["categoryName"]) ?? "Category";
  return {
    id,
    slug: str(raw["slug"]) ?? (slugify(name) || id),
    name,
    emoji: str(raw["emoji"]) ?? "🛒",
    gradient: pickGradient(name),
    image: firstImage(raw),
  };
}

export function mapProduct(raw: Raw): Product {
  const id = idOf(raw) ?? crypto.randomUUID();
  const name = str(raw["name"], raw["title"], raw["productName"]) ?? "Product";
  const price = num(raw["price"], raw["sellingPrice"], raw["salePrice"], raw["mrp"]) ?? 0;
  const mrp = num(raw["mrp"], raw["originalPrice"], raw["compareAtPrice"]) ?? price;
  const stock = num(raw["stock"], raw["quantity"], raw["availableStock"], raw["inventory"]) ?? 0;
  const unitLabel =
    str(raw["unit"], raw["unitLabel"], raw["packSize"], raw["weight"]) ||
    [num(raw["quantityValue"], raw["size"]), str(raw["unitType"], raw["measurement"])].filter(Boolean).join(" ");

  const rawTags = Array.isArray(raw["tags"]) ? (raw["tags"] as unknown[]).map((t) => String(t).toLowerCase()) : [];
  const tags = rawTags.filter((t): t is NonNullable<Product["tags"]>[number] =>
    ["bestseller", "seasonal", "recommended", "flash"].includes(t),
  );
  const images = Array.isArray(raw["images"])
    ? (raw["images"] as unknown[]).filter((img): img is string => typeof img === "string" && img.trim().length > 0)
    : [];

  return {
    id,
    name,
    categoryId: idOf(raw["categoryId"] as Raw) ?? idOf(raw["category"] as Raw) ?? "",
    categoryName: str((raw["categoryId"] as Raw)?.["name"], (raw["category"] as Raw)?.["name"], raw["categoryName"]),
    emoji: str(raw["emoji"]) ?? "🛍️",
    gradient: pickGradient(name),
    price,
    mrp: mrp >= price ? mrp : price,
    unit: unitLabel || "1 unit",
    stock,
    rating: num(raw["rating"], raw["averageRating"], (raw["ratings"] as Raw)?.["average"]) ?? 0,
    reviews:
      num(
        raw["totalReviews"],
        raw["reviews"],
        raw["reviewCount"],
        raw["numReviews"],
        (raw["ratings"] as Raw)?.["count"],
      ) ?? 0,
    etaMinutes: num(raw["etaMinutes"], raw["deliveryTime"]) ?? 15,
    brand: str(raw["brand"], raw["brandName"]),
    description: str(raw["description"], raw["details"], raw["about"]) ?? "",
    image: images[0] ?? firstImage(raw),
    images,
    tags,
    isActive: raw["isActive"] === false ? false : true,
  };
}

/* --------------------------------- API ---------------------------------- */

export type ProductQuery = {
  categoryId?: string;
  query?: string;
};

export const catalogApi = {
  async getCategories(): Promise<Category[]> {
    const data = await getJson<Raw[]>("/api/category");
    return (Array.isArray(data) ? data : []).map(mapCategory);
  },

  async getCategoryById(id: string): Promise<Category | undefined> {
    const data = await getJson<Raw | null>(`/api/category/${id}`);
    return data ? mapCategory(data) : undefined;
  },

  async getProducts(params?: ProductQuery): Promise<Product[]> {
    const qs = new URLSearchParams();
    if (params?.categoryId) qs.set("category", params.categoryId);
    if (params?.query) qs.set("search", params.query);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const data = await getJson<Raw[] | { products?: Raw[]; items?: Raw[] }>(`/api/product${suffix}`);
    const list = Array.isArray(data) ? data : (data?.products ?? data?.items ?? []);
    return list.map(mapProduct);
  },

  async getProductById(id: string): Promise<Product | undefined> {
    const data = await getJson<Raw | null>(`/api/product/${id}`);
    return data ? mapProduct(data) : undefined;
  },
};
