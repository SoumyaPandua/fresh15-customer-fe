// Catalog (categories + products) is served by the real Fresh15 backend via `catalog-api`.
// Everything else below is still centralized mock data (cart, orders, coupons…).
import { products as demoProducts } from "./mock/products";
import { categories as demoCategories } from "./mock/categories";
import { banners } from "./mock/banners";
import { orders } from "./mock/orders";
import { coupons } from "./mock/coupons";
import { catalogApi, CatalogApiError, type ProductQuery } from "./catalog-api";
import type { Category, Coupon, Order, Product } from "./types";

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

export const api = {
  async getCategories(): Promise<Category[]> {
    return withCatalogFallback(() => catalogApi.getCategories(), () => demoCategories);
  },
  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const list = await api.getCategories();
    return list.find((c) => c.slug === slug || c.id === slug);
  },
  async getBanners() {
    await delay(200);
    return banners;
  },
  async getProducts(filter?: ProductQuery): Promise<Product[]> {
    return withCatalogFallback(
      async () => {
        const list = await catalogApi.getProducts(filter);
        // Backend query support is not guaranteed — re-apply filters client-side.
        return filterLocally(list, filter);
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
    return { serviceable: /^4\d{5}$/.test(pincode), etaMinutes: 12 };
  },
  async placeOrder(_payload: unknown) {
    await delay(700);
    return { id: `FR${Math.floor(2100 + Math.random() * 900)}`, etaMinutes: 14 };
  },
};
