"use client";

import { useQuery } from "@tanstack/react-query";
import { Heart, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/store/auth";
import { recommendationApi } from "@/lib/recommendation-api";
import { ProductCard } from "./ProductCard";
import { ProductGridSkeleton } from "./Skeletons";
import { SectionHeader } from "./SectionHeader";

export function PersonalizedPicks({ limit = 8 }: { limit?: number }) {
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

  return (
    <section className="mb-8">
      <SectionHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Picks for you
            <Sparkles className="h-4 w-4 text-warning" />
          </span>
        }
        subtitle="Relevant products based on your Fresh15 activity"
      />

      {query.isLoading ? (
        <ProductGridSkeleton count={5} />
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                id: product.id,
                name: product.name,
                categoryId: "",
                categoryName: "",
                emoji: "🛒",
                gradient: "fresh",
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
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}