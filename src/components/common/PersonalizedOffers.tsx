"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Tag } from "lucide-react";
import { Link } from "@/lib/next-router-compat";
import { useAuth } from "@/lib/store/auth";
import { recommendationApi, trackRecommendationEvent } from "@/lib/recommendation-api";
import { SectionHeader } from "./SectionHeader";
import { Skeleton } from "./Skeletons";

export function PersonalizedOffers({ limit = 4 }: { limit?: number }) {
  const token = useAuth((state) => state.token);
  const query = useQuery({
    queryKey: ["personalized-offers", token, limit],
    enabled: Boolean(token),
    queryFn: () => recommendationApi.offers(token, limit),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!token || !query.data?.items?.length) return;
    query.data.items.forEach((offer, index) => trackRecommendationEvent(token, {
      eventType: "OFFER_IMPRESSION",
      surface: "HOME",
      recommendationType: "OFFER",
      offerId: offer.id,
      position: index,
    }));
  }, [token, query.data]);

  if (!token || query.isError) return null;
  if (query.isLoading) return <section className="mb-8"><SectionHeader title="Offers for you" subtitle="Fresh15 deals selected for your shopping routine" /><Skeleton className="h-40 w-full rounded-3xl" /></section>;
  if (!query.data?.items.length) return null;

  const hrefFor = (offer: (typeof query.data.items)[number]) => {
    if (offer.targetType === "CATEGORY" && offer.targetValue) return `/category/${encodeURIComponent(offer.targetValue)}`;
    if (offer.targetType === "PRODUCT" && offer.targetValue) return `/product/${encodeURIComponent(offer.targetValue)}`;
    if (offer.targetType === "SEARCH" && offer.targetValue) return `/search?q=${encodeURIComponent(offer.targetValue)}`;
    if (offer.couponCode) return `/cart?coupon=${encodeURIComponent(offer.couponCode)}`;
    return "/offers";
  };

  return (
    <section className="mb-8">
      <SectionHeader title={<span className="inline-flex items-center gap-2"><Tag className="h-5 w-5 text-primary" /> Offers for you <Sparkles className="h-4 w-4 text-warning" /></span>} subtitle="Fresh15 offers ranked for your shopping pattern" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {query.data.items.map((offer, index) => (
          <Link
            key={offer.id}
            to={hrefFor(offer)}
            onClick={() => trackRecommendationEvent(token, {
              eventType: "OFFER_CLICK",
              surface: "HOME",
              recommendationType: "OFFER",
              offerId: offer.id,
              position: index,
            })}
            className="group rounded-2xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-card"
          >
            <div className="text-xs font-bold uppercase tracking-wide text-primary">{offer.discount || "Fresh15 offer"}</div>
            <div className="mt-1 line-clamp-2 font-black">{offer.title}</div>
            {offer.description && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{offer.description}</div>}
            <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">{offer.ctaText || "Shop now"} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
