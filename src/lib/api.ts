// Catalog (categories + products) is served by the real Fresh15 backend via `catalog-api`.
// Everything else below is still centralized mock data (cart, orders, coupons…).
import { products as demoProducts } from "./mock/products";
import { categories as demoCategories } from "./mock/categories";
import { orders } from "./mock/orders";
import { coupons } from "./mock/coupons";
import { catalogApi, CatalogApiError, type ProductQuery } from "./catalog-api";
import type { Banner, Category, Coupon, Order, Product, StorefrontOffer, BannerTargetType } from "./types";
import { apiRequest } from "./http";

// Artificial latency only exists to exercise loading states while developing —
// production builds resolve immediately.
const delay = (ms = 350) => (process.env.NODE_ENV === "production" ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));

// The backend catalog routes may not be deployed on every environment yet.
// When they are missing/unreachable we degrade to the bundled demo catalog so
// the storefront keeps rendering instead of showing an empty shop.
async function withCatalogFallback<T>(run: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof CatalogApiError && err.unavailable) return fallback();
    throw err;
  }
}

function matchesQuery(p: Product, q: string) {
  const s = q.toLowerCase().trim();
  return (
    p.name.toLowerCase().includes(s) ||
    (p.brand?.toLowerCase().includes(s) ?? false) ||
    p.description.toLowerCase().includes(s) ||
    (p.categoryName?.toLowerCase().includes(s) ?? false)
  );
}

function filterLocally(list: Product[], filter?: ProductQuery) {
  let out = list;
  if (filter?.categoryId) out = out.filter((p) => p.categoryId === filter.categoryId);
  if (filter?.query) out = out.filter((p) => matchesQuery(p, filter.query!));
  return out;
}

export type HomeSections = {
  flashOffers: Product[];
  bestSellers: Product[];
  recommended: Product[];
  seasonal: Product[];
};

/** Pure derivation of the home page sections from an already-fetched catalog. */
export function buildHomeSections(list: Product[]): HomeSections {
  const byTag = (tag: NonNullable<Product["tags"]>[number]) => list.filter((p) => p.tags?.includes(tag));
  const discounted = [...list].sort((a, b) => (b.mrp - b.price) / (b.mrp || 1) - (a.mrp - a.price) / (a.mrp || 1));
  const topRated = [...list].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  const fallbackSlice = (tagged: Product[], source: Product[], n: number) =>
    tagged.length > 0 ? tagged : source.slice(0, n);
  return {
    flashOffers: fallbackSlice(byTag("flash"), discounted, 5),
    bestSellers: fallbackSlice(byTag("bestseller"), topRated, 10),
    recommended: fallbackSlice(byTag("recommended"), [...list].reverse(), 5),
    seasonal: fallbackSlice(byTag("seasonal"), list.slice(5, 10), 5),
  };
}

function targetToHref(type: BannerTargetType | undefined, value?: string) {
  const v = String(value ?? "").trim();
  switch (type) {
    case "CATEGORY": return v ? `/category/${encodeURIComponent(v)}` : "/search";
    case "PRODUCT": return v ? `/product/${encodeURIComponent(v)}` : "/search";
    case "SEARCH": return `/search${v ? `?q=${encodeURIComponent(v)}` : ""}`;
    case "OFFER": return "/search";
    default: return "/search";
  }
}

export const api = {
  async getCategories(): Promise<Category[]> {
    return withCatalogFallback(() => catalogApi.getCategories(), () => demoCategories);
  },
  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const list = await api.getCategories();
    return list.find((c) => c.slug === slug || c.id === slug);
  },
  async getBanners(): Promise<Banner[]> {
    try {
      const data = await apiRequest<any[]>("/api/banner/active?placement=HOME_PROMO");
      return (Array.isArray(data) ? data : [])
        .map((b: any, index: number) => ({
          id: String(b._id ?? b.id ?? index),
          title: String(b.title ?? ""),
          subtitle: String(b.subtitle ?? ""),
          cta: String(b.ctaText ?? "Shop now"),
          href: targetToHref(b.targetType as BannerTargetType, b.targetValue),
          image: typeof b.image === "string" ? b.image : undefined,
          targetType: b.targetType,
          targetValue: b.targetValue,
          priority: Number(b.priority ?? 0),
          gradient: ["warm", "cool", "fresh", "primary"][index % 4] as Banner["gradient"],
          emoji: "🛒",
        }))
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    } catch {
      return [];
    }
  },
  async getOffers(placement = "HOME"): Promise<StorefrontOffer[]> {
    try {
      const data = await apiRequest<any[]>(`/api/offer/active?placement=${encodeURIComponent(placement)}`);
      return (Array.isArray(data) ? data : [])
        .map((o: any) => ({
          id: String(o._id ?? o.id),
          title: String(o.title ?? ""),
          description: String(o.description ?? ""),
          discount: String(o.discount ?? ""),
          category: String(o.category ?? ""),
          placement: String(o.placement ?? placement),
          ctaText: String(o.ctaText ?? "View offer"),
          targetType: (o.targetType ?? "SEARCH") as BannerTargetType,
          targetValue: String(o.targetValue ?? ""),
          couponCode: o.couponCode ? String(o.couponCode) : undefined,
          priority: Number(o.priority ?? 0),
          startsAt: o.startsAt ?? null,
          endsAt: o.endsAt ?? null,
        }))
        .sort((a, b) => b.priority - a.priority);
    } catch {
      return [];
    }
  },
  async getProducts(filter?: ProductQuery): Promise<Product[]> {
    return withCatalogFallback(
      async () => {
        // Preserve backend relevance (including Elasticsearch tag/SKU matches)
        // instead of filtering the ranked results again in the browser.
        return catalogApi.getProducts(filter);
      },
      () => filterLocally(demoProducts, filter),
    );
  },
  async getProduct(id: string): Promise<Product | undefined> {
    return withCatalogFallback(
      () => catalogApi.getProductById(id),
      () => demoProducts.find((p) => p.id === id),
    );
  },
  async getSimilar(id: string): Promise<Product[]> {
    const product = await api.getProduct(id);
    if (!product) return [];
    const list = await api.getProducts(product.categoryId ? { categoryId: product.categoryId } : undefined);
    return list.filter((x) => x.id !== id).slice(0, 8);
  },
  async getHomeSections() {
    return buildHomeSections(await api.getProducts());
  },

  async getOrders(): Promise<Order[]> {
    await delay(300);
    return orders;
  },
  async getOrder(id: string) {
    await delay(200);
    return orders.find((o) => o.id === id);
  },
  async getCoupons(): Promise<Coupon[]> {
    await delay(200);
    return coupons;
  },
  async validateCoupon(code: string, subtotal: number): Promise<{ coupon?: Coupon; discount: number; error?: string }> {
    await delay(400);
    const c = coupons.find((x) => x.code.toLowerCase() === code.toLowerCase());
    if (!c) return { discount: 0, error: "Invalid coupon code" };
    if (subtotal < c.minOrder) return { discount: 0, error: `Minimum order ₹${c.minOrder}` };
    const raw = c.type === "flat" ? c.value : Math.round((subtotal * c.value) / 100);
    const discount = c.maxDiscount ? Math.min(raw, c.maxDiscount) : raw;
    return { coupon: c, discount };
  },
  async checkPincode(pincode: string) {
    await delay(400);
    // Serviceable if starts with 4 (mock)
    return { serviceable: /^\d{6}$/.test(pincode) && pincode.startsWith("4"), etaMinutes: 12 };
  },
  async placeOrder(_payload: unknown) {
    await delay(700);
    return { id: `FR${Math.floor(2100 + Math.random() * 900)}`, etaMinutes: 14 };
  },
};
