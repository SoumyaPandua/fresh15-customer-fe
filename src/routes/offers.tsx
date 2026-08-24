"use client";

import { createFileRoute, Link } from "@/lib/next-router-compat";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Clock, Copy, Sparkles, Tag, Ticket } from "lucide-react";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { api } from "@/lib/api";
import type { StorefrontOffer } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Offers & deals — Fresh15" },
      { name: "description", content: "Browse current Fresh15 offers, coupons and grocery deals." },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const query = useQuery({ queryKey: ["storefront-offers", "HOME", "all"], queryFn: () => api.getOffers("HOME"), staleTime: 60_000 });
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success(`${code} copied`);
      window.setTimeout(() => setCopied((current) => (current === code ? null : current)), 1800);
    } catch {
      toast.error("Could not copy coupon");
    }
  };

  const hrefFor = (offer: StorefrontOffer) => {
    if (offer.targetType === "CATEGORY" && offer.targetValue) return `/category/${encodeURIComponent(offer.targetValue)}`;
    if (offer.targetType === "PRODUCT" && offer.targetValue) return `/product/${encodeURIComponent(offer.targetValue)}`;
    if (offer.targetType === "SEARCH" && offer.targetValue) return `/search?q=${encodeURIComponent(offer.targetValue)}`;
    if (offer.couponCode) return `/cart?coupon=${encodeURIComponent(offer.couponCode)}`;
    return "/search";
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-7">
        <section className="overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6 sm:p-9">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Fresh15 promotions
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Offers made for your basket.</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">Use active coupons and promotions while they last. Every offer takes you directly to the products or checkout action it applies to.</p>
          </div>
        </section>

        {query.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        ) : query.isError ? (
          <EmptyState emoji="⚠️" title="Couldn't load offers" description={(query.error as Error)?.message ?? "Please try again."} cta={{ to: "/", label: "Back to shopping" }} />
        ) : query.data && query.data.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.map((offer) => (
              <article key={offer.id} className="relative overflow-hidden rounded-2xl border bg-card shadow-soft">
                <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-primary/10" />
                <div className="relative space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary"><Tag className="h-3.5 w-3.5" /> Fresh deal</div>
                      <h2 className="mt-2 text-lg font-black leading-tight">{offer.title}</h2>
                    </div>
                    {offer.discount && <span className="rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">{offer.discount}</span>}
                  </div>
                  {offer.description && <p className="min-h-10 text-sm text-muted-foreground">{offer.description}</p>}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5 text-primary" /> Limited-time promotion</div>
                  {offer.couponCode && (
                    <button type="button" onClick={() => void copy(offer.couponCode!)} className="flex w-full items-center justify-between rounded-xl border border-dashed bg-muted/40 px-3 py-2.5 text-left font-mono text-sm font-black">
                      <span className="flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" /> {offer.couponCode}</span>
                      {copied === offer.couponCode ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    </button>
                  )}
                  <Link to={hrefFor(offer)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
                    {offer.ctaText || "Shop now"} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState emoji="🏷️" title="No active offers" description="New Fresh15 promotions will appear here when they go live." cta={{ to: "/", label: "Continue shopping" }} />
        )}
      </div>
    </AppLayout>
  );
}
