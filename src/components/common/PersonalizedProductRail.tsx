"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, ShoppingBasket, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/store/auth";
import {
  recommendationApi,
  trackRecommendationEvent,
  type RecommendationProduct,
} from "@/lib/recommendation-api";
import { ProductCard } from "./ProductCard";
import { ProductGridSkeleton } from "./Skeletons";
import { SectionHeader } from "./SectionHeader";

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

    const events = products.slice(0, 10).map((product, index) => ({
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
    <section className="mb-8">
      <SectionHeader
        title={
          <span className="inline-flex items-center gap-2">
            {icon === "heart" ? (
              <Heart className="h-5 w-5 text-primary" />
            ) : (
              <ShoppingBasket className="h-5 w-5 text-primary" />
            )}
            {title}
            <Sparkles className="h-4 w-4 text-warning" />
          </span>
        }
        subtitle={subtitle}
        href={{ to: "/search" }}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {products.map((product, index) => (
          <div
            key={product.id}
            onClick={() =>
              trackRecommendationEvent(token, {
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

export function PersonalizedPicks({
  limit = 8,
}: {
  limit?: number;
}) {
  const token = useAuth((state) => state.token);

  const query = useQuery({
    queryKey: ["personalized-picks", token, limit],
    enabled: Boolean(token),
    queryFn: () => recommendationApi.recommendations(token, limit),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (!token) return null;

  const products = query.data?.items ?? [];

  if (query.isLoading) {
    return (
      <section className="mb-8">
        <SectionHeader
          title="Picks for you"
          subtitle="Fresh15 learns your shopping routine"
        />
        <ProductGridSkeleton count={5} />
      </section>
    );
  }

  if (query.isError || !products.length) return null;

  return (
    <Rail
      title="Picks for you"
      subtitle="Relevant products from your Fresh15 activity"
      products={products}
      requestId={query.data?.requestId ?? ""}
      type="PERSONALIZED"
      icon="heart"
    />
  );
}

export function SmartBasket({
  limit = 8,
}: {
  limit?: number;
}) {
  const token = useAuth((state) => state.token);

  const query = useQuery({
    queryKey: ["smart-basket", token, limit],
    enabled: Boolean(token),
    queryFn: () => recommendationApi.smartBasket(token, limit),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (!token) return null;

  const products = query.data?.items ?? [];

  if (query.isLoading) {
    return (
      <section className="mb-8">
        <SectionHeader
          title="Fresh15 Smart Basket"
          subtitle="Your weekly basket, built from your routine"
        />
        <ProductGridSkeleton count={5} />
      </section>
    );
  }

  if (query.isError || !products.length) return null;

  return (
    <Rail
      title="Fresh15 Smart Basket"
      subtitle="Based on your routine, replenishment timing and seasonal availability"
      products={products}
      requestId={query.data?.requestId ?? ""}
      type="SMART_BASKET"
      icon="basket"
    />
  );
}