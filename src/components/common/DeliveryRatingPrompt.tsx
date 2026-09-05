"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { useAuth } from "@/lib/store/auth";
import { orderApi } from "@/lib/order-api";
import { deliveryApi } from "@/lib/delivery-api";
import { getDeliveryRating, rateDeliveryPartner } from "@/lib/delivery-rating-api";
import { toast } from "sonner";

export function DeliveryRatingPrompt() {
  const token = useAuth((s) => s.token);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("your delivery partner");
  const [selected, setSelected] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const match = window.location.pathname.match(/^\/orders\/([^/]+)$/);
    setOrderId(match?.[1] ?? null);
  }, []);

  useEffect(() => {
    if (!token || !orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const order = await orderApi.get(token, orderId);
        if (order.status !== "delivered") return;
        const delivery = await deliveryApi.getByOrder(token, orderId);
        if (!delivery?.rider?.id) return;
        if (cancelled) return;
        setPartnerName(delivery.rider.name || "your delivery partner");
        const state = await getDeliveryRating(token, orderId);
        if (!cancelled) setSubmitted(state.rated);
      } catch { /* rating is supplemental and must never break the order page */ }
    })();
    return () => { cancelled = true; };
  }, [token, orderId]);

  if (!token || !orderId || submitted) {
    if (submitted && !hidden) {
      return <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-primary" /> Delivery partner rating submitted</div><div className="mt-1 text-xs text-muted-foreground">Thanks! This rating is final and cannot be changed.</div></div>;
    }
    return null;
  }

  const submit = async () => {
    if (!selected || loading) return;
    setLoading(true);
    try {
      await rateDeliveryPartner(token, orderId, selected);
      setSubmitted(true);
      toast.success("Thanks for rating your delivery partner");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit rating");
    } finally { setLoading(false); }
  };

  return <section className="mb-5 rounded-3xl border border-primary/20 bg-card p-5 shadow-sm"><div className="text-xs uppercase tracking-wider text-muted-foreground">Delivered</div><h2 className="mt-1 text-lg font-bold">How was {partnerName}?</h2><p className="mt-1 text-sm text-muted-foreground">Rate your delivery experience from 1 to 5.</p><div className="mt-4 flex items-center gap-2" role="radiogroup" aria-label="Delivery partner rating">{[1,2,3,4,5].map(value => <button key={value} type="button" onClick={() => setSelected(value)} disabled={loading} aria-label={`${value} star${value > 1 ? "s" : ""}`} className="rounded-xl p-2 transition-transform hover:scale-105 disabled:opacity-60"><Star className={`h-8 w-8 ${value <= selected ? "fill-primary text-primary" : "text-muted-foreground/40"}`} /></button>)}</div><div className="mt-2 text-sm font-semibold">{selected ? `${selected}/5` : "Select a rating"}</div><button type="button" onClick={submit} disabled={!selected || loading} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Submit rating</button><div className="mt-2 text-center text-[11px] text-muted-foreground">Ratings are irreversible once submitted.</div></section>;
}
