"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Tag, Ticket } from "lucide-react";
import { Link } from "@/lib/next-router-compat";
import { useAuth } from "@/lib/store/auth";
import { recommendationApi, trackRecommendationEvent } from "@/lib/recommendation-api";
import { SectionHeader } from "./SectionHeader";
import { Skeleton } from "./Skeletons";
import { cn } from "@/lib/utils";

export function PersonalizedOffers({ limit = 3 }: { limit?: number }) {
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
    query.data.items.forEach((offer, index) =>
      trackRecommendationEvent(token, {
        eventType: "OFFER_IMPRESSION",
        surface: "HOME",
        recommendationType: "OFFER",
        offerId: offer.id,
        position: index,
      }),
    );
  }, [token, query.data?.items]);

  if (!token || query.isError) return null;

  if (query.isLoading) {
    return (
      <section className="mb-9">
        <SectionHeader title="Offers for you" subtitle="A few deals matched to your shopping pattern" />
        <Skeleton className="h-28 w-full rounded-[1.4rem]" />
      </section>
    );
  }

  if (!query.data?.items.length) return null;

  const hrefFor = (offer: (typeof query.data.items)[number]) => {
    if (offer.targetType === "CATEGORY" && offer.targetValue) {
      return `/category/${encodeURIComponent(offer.targetValue)}`;
    }
    if (offer.targetType === "PRODUCT" && offer.targetValue) {
      return `/product/${encodeURIComponent(offer.targetValue)}`;
    }
    if (offer.targetType === "SEARCH" && offer.targetValue) {
      return `/search?q=${encodeURIComponent(offer.targetValue)}`;
    }
    if (offer.couponCode) {
      return `/cart?coupon=${encodeURIComponent(offer.couponCode)}`;
    }
    return "/offers";
  };

  return (
    <section className="mb-9">
      <SectionHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" /> Offers for you
            <Sparkles className="h-4 w-4 text-warning animate-pulse" />
          </span>
        }
        subtitle="A compact set of deals ranked for you"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {query.data.items.map((offer, index) => (
          <Link
            key={offer.id}
            to={hrefFor(offer)}
            onClick={() =>
              void trackRecommendationEvent(token, {
                eventType: "OFFER_CLICK",
                surface: "HOME",
                recommendationType: "OFFER",
                offerId: offer.id,
                position: index,
              })
            }
            className={cn(
              "group relative overflow-hidden rounded-[1.35rem] border bg-card p-4 shadow-soft transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-card",
              index === 0 && "sm:col-span-2 bg-gradient-to-br from-primary/10 via-card to-accent/10",
            )}
          >
            <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/10 transition-transform duration-500 group-hover:scale-125" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  {offer.discount || "Fresh15 offer"}
                </div>
                <div className="mt-1 line-clamp-2 text-sm font-extrabold leading-tight sm:text-base">{offer.title}</div>
                {offer.description && (
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{offer.description}</div>
                )}
              </div>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Ticket className="h-4 w-4" />
              </div>
            </div>
            <div className="relative mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary">
              {offer.ctaText || "Shop now"}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
