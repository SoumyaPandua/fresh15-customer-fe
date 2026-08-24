import { createFileRoute, Link } from "@/lib/next-router-compat";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Tag, Trash2, Clock, ChevronRight, CalendarClock, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { ProductArt } from "@/components/common/ProductArt";
import { QuantityStepper } from "@/components/common/QuantityStepper";
import { SubstitutionControl } from "@/components/common/SubstitutionControl";
import { Input } from "@/components/ui/input";
import { useCartBook } from "@/lib/hooks/use-cart-book";
import { inr } from "@/lib/format";
import { api } from "@/lib/api";
import { orderApi } from "@/lib/order-api";
import { useAuth } from "@/lib/store/auth";
import { useServiceability } from "@/lib/store/serviceability";
import { toast } from "sonner";
import { groceryListApi } from "@/lib/grocery-list-api";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Fresh15" },
      { name: "description", content: "Review your cart and check out in seconds." },
      { property: "og:title", content: "Your cart — Fresh15" },
      { property: "og:description", content: "Review your Fresh15 cart." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const search = Route.useSearch<{ coupon?: string }>();
  const cart = useCartBook();
  const token = useAuth((s) => s.token);
  const totals = cart.totals;
  const serviceability = useServiceability();
  const orderBelowMinimum = serviceability.serviceable && serviceability.minOrder > 0 && totals.subtotal < serviceability.minOrder;
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const coupons = useQuery({ queryKey: ["coupons"], queryFn: api.getCoupons, enabled: !cart.isAuthed });

  async function apply(c: string) {
    const codeToUse = (c || code).trim().toUpperCase();
    if (!codeToUse || applying) return;
    setApplying(true);
    try {
      if (cart.isAuthed) {
        const { coupon, message } = await orderApi.applyCoupon(token, codeToUse, totals.subtotal);
        cart.applyCoupon(coupon.code?.toUpperCase() || codeToUse, Number(coupon.discountAmount) || 0);
        setCode("");
        toast.success(message || `Coupon applied — ${inr(Number(coupon.discountAmount) || 0)} off`);
      } else {
        const r = await api.validateCoupon(codeToUse, totals.subtotal);
        if (r.error) {
          toast.error(r.error);
          return;
        }
        cart.applyCoupon(codeToUse, r.discount);
        setCode("");
        toast.success(`Coupon applied — ${inr(r.discount)} off`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not apply this coupon");
    } finally {
      setApplying(false);
    }
  }

  useEffect(() => {
    const couponFromOffer = search.coupon?.trim().toUpperCase();
    if (!couponFromOffer || cart.isLoading || cart.appliedCoupon?.code || applying) return;
    void apply(couponFromOffer);
  }, [search.coupon, cart.isLoading, cart.appliedCoupon?.code]);



  if (cart.isLoading) {
    return (
      <AppLayout>
        <h1 className="mb-4 text-2xl font-black tracking-tight sm:text-3xl">Your cart</h1>
      <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border bg-muted/40" />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (cart.items.length === 0) {
    return (
      <AppLayout>
        <EmptyState
          emoji="🛒"
          title="Your cart is empty"
          description="Looks like you haven't added anything yet. Let's fix that."
          cta={{ to: "/", label: "Start shopping" }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="mb-4 text-2xl font-black tracking-tight sm:text-3xl">Your cart</h1>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CalendarClock className="h-4 w-4" /></div>
          <div><div className="text-sm font-bold">Make this your Weekly Essentials</div><div className="text-xs text-muted-foreground">Save these products and quantities for a one-tap repeat next week.</div></div>
        </div>
        {cart.isAuthed ? (
          <button type="button" disabled={savingWeekly} onClick={async () => { setSavingWeekly(true); try { await groceryListApi.saveCart(token); toast.success("Weekly Essentials saved"); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save your basket"); } finally { setSavingWeekly(false); } }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60">
            {savingWeekly ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />}
            Save basket
          </button>
        ) : (
          <Link to="/auth/login" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            Sign in to save
          </Link>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <div className={"flex items-start gap-2 rounded-2xl border p-3 text-sm " + (serviceability.serviceable ? "bg-success/5" : "bg-muted/40")}>
            <Clock className={"mt-0.5 h-4 w-4 " + (serviceability.serviceable ? "text-success" : "text-muted-foreground")} />
            {serviceability.serviceable ? (
              <div>
                <div className="font-semibold text-success">{serviceability.etaMinutes ? `Delivery in about ${serviceability.etaMinutes} minutes` : "Delivery available"}</div>
                <div className="text-xs text-muted-foreground">
                  Shipping from {serviceability.storeName || "your nearest Fresh15 store"}
                  {serviceability.storeDistanceKm != null ? ` · ${serviceability.storeDistanceKm.toFixed(1)} km away` : ""}
                </div>
              </div>
            ) : (
              <div>
                <div className="font-semibold">Delivery availability is checked at checkout</div>
                <div className="text-xs text-muted-foreground">Select or add a saved delivery address to get a live ETA and store.</div>
              </div>
            )}
          </div>
          {orderBelowMinimum && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
              Add {inr(serviceability.minOrder - totals.subtotal)} more to reach the {inr(serviceability.minOrder)} minimum order for this delivery area.
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border bg-card">
            {cart.items.map((it, idx) => (
              <div key={it.productId} className={"flex items-start gap-3 p-4 " + (idx > 0 ? "border-t" : "")}>
                <ProductArt emoji={it.emoji} src={it.image} alt={it.name} gradient={it.gradient} size="sm" className="h-16 w-16 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-semibold">{it.name}</div>
                  <div className="text-xs text-muted-foreground">{it.unit}</div>
                  <div className="mt-1 text-sm font-bold">{inr(it.price)}</div>
                  <div className="mt-2">
                    <SubstitutionControl
                      productId={it.productId}
                      productName={it.name}
                      preference={it.substitutionPreference}
                      replacementId={it.preferredReplacementProductId}
                      replacementName={it.preferredReplacementName}
                      disabled={cart.busy}
                      onSave={(preference, replacement) =>
                        cart.setSubstitution(it.productId, preference, replacement)
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => void cart.remove(it.productId)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <QuantityStepper
                    qty={it.qty}
                    onInc={() => void cart.inc(it.productId)}
                    onDec={() => void cart.dec(it.productId)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Coupons */}
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">Coupons & offers</h2>
            </div>
            {cart.appliedCoupon ? (
              <div className="flex items-center justify-between rounded-xl bg-success/10 p-3">
                <div>
                  <div className="text-sm font-bold text-success">{cart.appliedCoupon.code} applied</div>
                  <div className="text-xs text-muted-foreground">You saved {inr(cart.appliedCoupon.discount)}</div>
                </div>
                <button onClick={cart.clearCoupon} className="text-sm font-semibold text-destructive hover:underline">
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input placeholder="Enter coupon code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-10" />
                <button
                  disabled={applying}
                  onClick={() => apply("")}
                  className="rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {applying ? "…" : "Apply"}
                </button>
              </div>
            )}
            <div className="mt-3 space-y-2">
              {coupons.data?.map((c) => (
                <button
                  key={c.code}
                  onClick={() => apply(c.code)}
                  className="flex w-full items-center justify-between rounded-xl border border-dashed p-3 text-left transition hover:bg-muted"
                >
                  <div>
                    <div className="text-sm font-bold text-primary">{c.code}</div>
                    <div className="text-xs text-muted-foreground">{c.description}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Bill details</h2>
            <div className="space-y-2 text-sm">
              <Row label="MRP total" value={inr(totals.mrpTotal)} />
              <Row label="Product savings" value={`-${inr(totals.savings)}`} accent="success" />
              <Row label="Subtotal" value={inr(totals.subtotal)} />
              {totals.couponDiscount > 0 && <Row label="Coupon discount" value={`-${inr(totals.couponDiscount)}`} accent="success" />}
              <Row label="Delivery fee" value={totals.deliveryFee === 0 ? "FREE" : inr(totals.deliveryFee)} accent={totals.deliveryFee === 0 ? "success" : undefined} />
              <Row label="Taxes & charges (5%)" value={inr(totals.taxes)} />
              <div className="mt-3 border-t pt-3">
                <Row label="To pay" value={inr(totals.total)} big />
              </div>
            </div>
            <Link
              to="/checkout"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow-soft hover:opacity-90"
            >
              Proceed to checkout <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-2xl border bg-surface p-4 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground">You saved {inr(totals.savings + totals.couponDiscount)} on this order 🎉</div>
            <div className="mt-1">100% refund if any item is not fresh.</div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Row({ label, value, big, accent }: { label: string; value: string; big?: boolean; accent?: "success" }) {
  return (
    <div className="flex items-center justify-between">
      <span className={big ? "font-bold text-foreground" : "text-muted-foreground"}>{label}</span>
      <span
        className={
          (big ? "text-lg font-black " : "font-semibold ") +
          (accent === "success" ? "text-success" : "text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}
