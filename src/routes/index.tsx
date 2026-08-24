import { createFileRoute, Link } from "@/lib/next-router-compat";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight, Clock, Copy, Sparkles, Tag, Ticket, Zap } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionHeader } from "@/components/common/SectionHeader";
import { ProductCard } from "@/components/common/ProductCard";
import { ProductGridSkeleton, Skeleton } from "@/components/common/Skeletons";
import { ProductArt } from "@/components/common/ProductArt";
import { useEffect, useMemo, useState } from "react";
import { api, buildHomeSections } from "@/lib/api";
import type { Banner, StorefrontOffer } from "@/lib/types";
import { useRecent } from "@/lib/store/recent";
import { EmptyState } from "@/components/common/EmptyState";
import { toast } from "sonner";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fresh15 — Groceries delivered in 15 minutes" },
      { name: "description", content: "Order fruits, vegetables, dairy, bakery and daily essentials — delivered in 15 minutes." },
      { property: "og:title", content: "Fresh15 — Groceries delivered in 15 minutes" },
      { property: "og:description", content: "Order fruits, vegetables, dairy, bakery and daily essentials — delivered in 15 minutes." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const cats = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });
  const banners = useQuery({ queryKey: ["banners"], queryFn: api.getBanners });
  const offers = useQuery({ queryKey: ["storefront-offers", "HOME"], queryFn: api.getOffers, staleTime: 60_000 });
  // Home sections are derived from the single catalog query — no second fetch.
  const allProducts = useQuery({ queryKey: ["products", undefined], queryFn: () => api.getProducts() });
  const products = allProducts.data;
  const sections = useMemo(
    () => ({
      isLoading: allProducts.isLoading,
      isError: allProducts.isError,
      error: allProducts.error,
      data: products ? buildHomeSections(products) : undefined,
    }),
    [products, allProducts.isLoading, allProducts.isError, allProducts.error],
  );
  const recent = useRecent((s) => s.productIds);
  const recentProducts = useMemo(
    () =>
      recent
        .map((id) => products?.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => !!p),
    [recent, products],
  );


  return (
    <AppLayout>
      {/* Hero */}
      <section className="mb-6 overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-surface to-accent/10 p-5 sm:p-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <Zap className="h-3.5 w-3.5 fill-primary" /> Delivering in 12 min
            </div>
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
              Fresh groceries.
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Even faster than fresh.</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Farm-picked produce, dairy, snacks and essentials — at your door in minutes.
            </p>
            <div className="mt-4 flex gap-2">
              <Link to="/search" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90">
                Start shopping <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/orders" className="inline-flex items-center rounded-full border bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted">
                Track order
              </Link>
            </div>
          </div>
          <div className="hidden shrink-0 sm:block">
            <div className="grid grid-cols-2 gap-3">
              <ProductArt emoji="🥭" gradient="warm" size="lg" className="h-32 w-32" />
              <ProductArt emoji="🥛" gradient="cool" size="lg" className="h-32 w-32 translate-y-4" />
              <ProductArt emoji="🥦" gradient="fresh" size="lg" className="h-32 w-32 -translate-y-2" />
              <ProductArt emoji="🍞" gradient="primary" size="lg" className="h-32 w-32 translate-y-2" />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mb-8">
        <SectionHeader title="Shop by category" subtitle="Everything you need, sorted" />
        {cats.isLoading ? (
          <div className="flex gap-3 overflow-x-auto hide-scrollbar">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-28 shrink-0 rounded-2xl" />
            ))}
          </div>
        ) : cats.isError ? (
          <EmptyState
            emoji="⚠️"
            title="Couldn't load categories"
            description={(cats.error as Error)?.message ?? "Please try again in a moment."}
          />
        ) : cats.data && cats.data.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-7">
            {cats.data.map((c) => (
              <Link
                key={c.id}
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="group rounded-2xl border bg-card p-3 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                <ProductArt
                  emoji={c.emoji}
                  src={c.image}
                  alt={c.name}
                  gradient={c.gradient}
                  size="md"
                  className="mx-auto aspect-square w-full"
                />
                <div className="mt-2 line-clamp-1 text-xs font-semibold text-foreground sm:text-sm">{c.name}</div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState emoji="📦" title="No categories yet" description="Our catalog is being set up. Check back soon." />
        )}

      </section>

      {/* Storefront campaigns */}
      {(banners.isLoading || offers.isLoading || (banners.data?.length ?? 0) > 0 || (offers.data?.length ?? 0) > 0) && (
        <StorefrontCampaigns banners={banners.data ?? []} offers={offers.data ?? []} loading={banners.isLoading || offers.isLoading} />
      )}

      {/* Flash offers */}
      <section className="mb-8">
        <SectionHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-warning" /> Flash offers
            </span>
          }
          subtitle="Grab them before they're gone"
          href={{ to: "/search" }}
        />
        {sections.isLoading ? (
          <ProductGridSkeleton count={5} />
        ) : sections.isError ? (
          <EmptyState
            emoji="⚠️"
            title="Couldn't load products"
            description={(sections.error as Error)?.message ?? "Please try again in a moment."}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sections.data?.flashOffers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

      </section>

      {/* Recommended */}
      <section className="mb-8">
        <SectionHeader title="Recommended for you" subtitle="Based on your recent activity" href={{ to: "/search" }} />
        {sections.isLoading ? (
          <ProductGridSkeleton count={5} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sections.data?.recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Recently viewed */}
      {recentProducts.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Recently viewed" subtitle="Pick up where you left off" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {recentProducts.map((p) => (
              <ProductCard key={p!.id} product={p!} />
            ))}
          </div>
        </section>
      )}

      {/* Best sellers */}
      <section className="mb-8">
        <SectionHeader title="Best sellers" subtitle="What our community loves most" href={{ to: "/search" }} />
        {sections.isLoading ? (
          <ProductGridSkeleton count={5} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sections.data?.bestSellers.slice(0, 10).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Seasonal */}
      <section className="mb-8">
        <SectionHeader title="Seasonal picks" subtitle="Fresh this week" />
        {sections.isLoading ? (
          <ProductGridSkeleton count={5} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sections.data?.seasonal.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Delivery promise */}
      <section className="rounded-3xl border bg-surface p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Clock className="h-5 w-5" /></div>
            <div>
              <div className="text-sm font-bold text-foreground">15-minute delivery</div>
              <div className="text-xs text-muted-foreground">From the closest dark store to your doorstep.</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/20 text-accent-foreground text-lg">🌿</div>
            <div>
              <div className="text-sm font-bold text-foreground">Fresh, always</div>
              <div className="text-xs text-muted-foreground">Farm-picked produce, quality-checked daily.</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-warning/20 text-warning-foreground text-lg">💸</div>
            <div>
              <div className="text-sm font-bold text-foreground">Best prices</div>
              <div className="text-xs text-muted-foreground">Direct from farms and brands. No middlemen.</div>
            </div>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}

function StorefrontCampaigns({
  banners,
  offers,
  loading,
}: {
  banners: Banner[];
  offers: StorefrontOffer[];
  loading: boolean;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (banners.length < 2) {
      setActive(0);
      return;
    }
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % banners.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-3xl" />;
  }

  const banner = banners[active] ?? banners[0];
  const offerHref = (offer: StorefrontOffer) => {
    if (offer.targetType === "CATEGORY" && offer.targetValue) return `/category/${encodeURIComponent(offer.targetValue)}`;
    if (offer.targetType === "PRODUCT" && offer.targetValue) return `/product/${encodeURIComponent(offer.targetValue)}`;
    if (offer.targetType === "SEARCH" && offer.targetValue) return `/search?q=${encodeURIComponent(offer.targetValue)}`;
    if (offer.couponCode) return `/cart?coupon=${encodeURIComponent(offer.couponCode)}`;
    return "/search";
  };

  const copyCoupon = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${code} copied`);
    } catch {
      toast.error("Could not copy coupon");
    }
  };

  return (
    <div className="mb-8 space-y-7">
      {banner && (
        <section className="relative overflow-hidden rounded-3xl border bg-card shadow-card">
          <Link to={banner.href} className="group relative block min-h-[250px] sm:min-h-[310px]">
            {banner.image ? (
              <img src={banner.image} alt={banner.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]" />
            ) : (
              <div className={`absolute inset-0 gradient-${banner.gradient}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
            <div className="relative flex min-h-[250px] items-end p-6 sm:min-h-[310px] sm:p-9">
              <div className="max-w-xl text-white">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5" /> Fresh15 exclusive
                </div>
                <h2 className="text-3xl font-black leading-tight sm:text-5xl">{banner.title}</h2>
                {banner.subtitle && <p className="mt-2 max-w-lg text-sm text-white/85 sm:text-base">{banner.subtitle}</p>}
                <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg">
                  {banner.cta} <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>

          {banners.length > 1 && (
            <>
              <button type="button" onClick={() => setActive((active - 1 + banners.length) % banners.length)} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55" aria-label="Previous promotion">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => setActive((active + 1) % banners.length)} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55" aria-label="Next promotion">
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 right-5 flex items-center gap-1.5">
                {banners.map((item, index) => (
                  <button key={item.id} type="button" onClick={() => setActive(index)} aria-label={`Show promotion ${index + 1}`} className={`h-1.5 rounded-full transition-all ${index === active ? "w-6 bg-white" : "w-1.5 bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {offers.length > 0 && (
        <section>
          <SectionHeader
            title={<span className="inline-flex items-center gap-2"><Tag className="h-5 w-5 text-primary" /> Offers & deals</span>}
            subtitle="Save more on your everyday basket"
            href={{ to: "/offers", label: "View all" }}
          />
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x">
            {offers.slice(0, 8).map((offer) => (
              <article key={offer.id} className="relative min-w-[280px] snap-start overflow-hidden rounded-2xl border bg-card p-5 shadow-soft sm:min-w-[320px]">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-primary/10" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-black leading-tight">{offer.title}</div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{offer.description}</p>
                    </div>
                    {offer.discount && <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-xs font-black text-primary-foreground">{offer.discount}</span>}
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Limited-time promotion
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Link to={offerHref(offer)} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                      {offer.ctaText} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    {offer.couponCode && (
                      <button type="button" onClick={() => void copyCoupon(offer.couponCode!)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-2 font-mono text-[11px] font-bold text-foreground hover:bg-muted" title="Copy coupon">
                        <Ticket className="h-3.5 w-3.5 text-primary" /> {offer.couponCode} <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
