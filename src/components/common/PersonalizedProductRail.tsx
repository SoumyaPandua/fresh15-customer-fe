"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, ShoppingBasket, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "@/lib/next-router-compat";
import { useAuth } from "@/lib/store/auth";
import {
  recommendationApi,
  trackRecommendationEvent,
  type RecommendationProduct,
} from "@/lib/recommendation-api";
import { ProductCard } from "./ProductCard";
import { ProductGridSkeleton } from "./Skeletons";
import { SectionHeader } from "./SectionHeader";
import { cn } from "@/lib/utils";

const toCardProduct = (product: RecommendationProduct) => ({
  id: product.id,
  name: product.name,
  categoryId: "",
  categoryName: "",
  emoji: "🛒",
  gradient: "fresh" as const,
  price: product.price,
  mrp: product.mrp,
  unit: product.unit,
  stock: product.availableStock,
  rating: product.rating,
  reviews: 0,
  etaMinutes: 15,
  description: "",
  image: product.image || undefined,
  isActive: true,
  tags: [],
});

function Rail({
  title,
  subtitle,
  products,
  requestId,
  type,
  icon,
}: {
  title: string;
  subtitle: string;
  products: RecommendationProduct[];
  requestId: string;
  type: "PERSONALIZED" | "SMART_BASKET";
  icon: "heart" | "basket";
}) {
  const token = useAuth((state) => state.token);

  useEffect(() => {
    if (!token || !products.length) return;

    const events = products.slice(0, 8).map((product, index) => ({
      eventType: "IMPRESSION" as const,
      surface: "HOME" as const,
      recommendationType: type,
      productId: product.id,
      recommendationRequestId: requestId,
      position: index,
    }));

    void recommendationApi.recordEvents(token, events);
  }, [token, requestId, products, type]);

  if (!token || !products.length) return null;

  return (
    <section
      className={cn(
        "mb-9 overflow-hidden rounded-[1.6rem] border p-4 shadow-soft sm:p-5",
        type === "SMART_BASKET"
          ? "bg-gradient-to-br from-primary/10 via-card to-accent/10"
          : "bg-gradient-to-br from-card via-card to-primary/5",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              {icon === "heart" ? <Heart className="h-4 w-4" /> : <ShoppingBasket className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">{title}</h2>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
            </div>
            <Sparkles className="hidden h-4 w-4 shrink-0 text-warning sm:block animate-pulse" />
          </div>
        </div>

        <Link
          to="/search"
          className="hidden shrink-0 items-center gap-1 rounded-full bg-background/70 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-background sm:inline-flex"
        >
          Explore <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 hide-scrollbar">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="w-[205px] shrink-0 snap-start sm:w-[225px] lg:w-[235px]"
            onClick={() =>
              void trackRecommendationEvent(token, {
                eventType: "CLICK",
                surface: "HOME",
                recommendationType: type,
                productId: product.id,
                recommendationRequestId: requestId,
                position: index,
              })
            }
          >
            <ProductCard product={toCardProduct(product)} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function PersonalizedPicks({ limit = 6 }: { limit?: number }) {
  const token = useAuth((state) => state.token);

  const query = useQuery({
    queryKey: ["personalized-picks", token, limit],
    enabled: Boolean(token),
    queryFn: () => recommendationApi.recommendations(token, limit),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (!token) return null;

  const products = useMemo(
    () =>
      (query.data?.items ?? []).filter(
        (product, index, array) => array.findIndex((item) => item.id === product.id) === index,
      ),
    [query.data?.items],
  );

  if (query.isLoading) {
    return (
      <section className="mb-9">
        <SectionHeader title="Picks for you" subtitle="A lighter, personalized shelf from your Fresh15 activity" />
        <ProductGridSkeleton count={4} />
      </section>
    );
  }

  if (query.isError || !products.length) return null;

  return (
    <Rail
      title="Picks for you"
      subtitle="Personalized products, kept easy to scan"
      products={products}
      requestId={query.data?.requestId ?? ""}
      type="PERSONALIZED"
      icon="heart"
    />
  );
}

export function SmartBasket({ limit = 6 }: { limit?: number }) {
  const token = useAuth((state) => state.token);

  const query = useQuery({
    queryKey: ["smart-basket", token, limit],
    enabled: Boolean(token),
    queryFn: () => recommendationApi.smartBasket(token, limit),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (!token) return null;

  const products = useMemo(
    () =>
      (query.data?.items ?? []).filter(
        (product, index, array) => array.findIndex((item) => item.id === product.id) === index,
      ),
    [query.data?.items],
  );

  if (query.isLoading) {
    return (
      <section className="mb-9">
        <SectionHeader title="Fresh15 Smart Basket" subtitle="Your routine, turned into a short weekly shelf" />
        <ProductGridSkeleton count={4} />
      </section>
    );
  }

  if (query.isError || !products.length) return null;

  return (
    <Rail
      title="Fresh15 Smart Basket"
      subtitle="Routine-based replenishment and seasonal availability"
      products={products}
      requestId={query.data?.requestId ?? ""}
      type="SMART_BASKET"
      icon="basket"
    />
  );
}
