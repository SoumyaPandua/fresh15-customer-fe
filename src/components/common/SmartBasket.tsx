"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingBasket, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/store/auth";
import { recommendationApi, type RecommendationProduct } from "@/lib/recommendation-api";
import { ProductCard } from "./ProductCard";
import { ProductGridSkeleton } from "./Skeletons";
import { SectionHeader } from "./SectionHeader";
import { EmptyState } from "./EmptyState";

export function SmartBasket({ limit = 8 }: { limit?: number }) {
  const token = useAuth((state) => state.token);
  const query = useQuery({
    queryKey: ["smart-basket", token, limit],
    enabled: Boolean(token),
    queryFn: () => recommendationApi.smartBasket(token, limit),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (!token || query.isError || (!query.isLoading && !query.data?.length)) return null;

  const products = query.data ?? [];
  const map = new Map<string, RecommendationProduct>();
  for (const product of products) map.set(product.id, product);

  return (
    <section className="mb-8">
      <SectionHeader
        title={<span className="inline-flex items-center gap-2"><ShoppingBasket className="h-5 w-5 text-primary" /> Fresh15 Smart Basket <Sparkles className="h-4 w-4 text-warning" /></span>}
        subtitle="A simple weekly basket based on what you buy and what is fresh now"
      />
      {query.isLoading ? (
        <ProductGridSkeleton count={4} />
      ) : map.size ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[...map.values()].map((product) => <div key={product.id}><ProductCard product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            mrp: product.mrp,
            unit: product.unit,
            image: product.image || undefined,
            rating: product.rating,
            reviews: 0,
            description: "",
            categoryId: "",
            categoryName: "",
            tags: [],
            isFeatured: false,
            isActive: true,
            stock: product.availableStock,
          }} /></div>)}
        </div>
      ) : (
        <EmptyState emoji="🛒" title="Your smart basket is building" description="Complete a few purchases and Fresh15 will learn your routine." />
      )}
    </section>
  );
}
