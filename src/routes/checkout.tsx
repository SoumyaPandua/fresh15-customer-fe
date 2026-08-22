import { createFileRoute, Link, useNavigate } from "@/lib/next-router-compat";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MapPin, CreditCard, Wallet, Clock, Sparkles } from "lucide-react";
import { loyaltyApi } from "@/lib/loyalty-api";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { useCartBook } from "@/lib/hooks/use-cart-book";
import { useAddressBook } from "@/lib/hooks/use-address-book";
import { orderApi, paymentApi } from "@/lib/order-api";
import { loadRazorpay } from "@/lib/razorpay";
import { useAuth } from "@/lib/store/auth";
import { substitutionBadge } from "@/lib/substitution";
import { inr } from "@/lib/format";
import { toast } from "sonner";
import { deliverySlotApi, type DeliverySlotOption } from "@/lib/delivery-slot-api";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Fresh15" },
      { name: "description", content: "Confirm your delivery address, slot and payment method." },
      { property: "og:title", content: "Checkout — Fresh15" },
      { property: "og:description", content: "Complete your Fresh15 order." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const cart = useCartBook();
  const totals = cart.totals;
  const { addresses, activeAddressId, setActive, isLoading: addressesLoading } = useAddressBook();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const [payment, setPayment] = useState<"cod" | "razorpay">("razorpay");
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const loyaltyQ = useQuery({ queryKey: ["loyalty", token], enabled: Boolean(token), queryFn: () => loyaltyApi.get(token), staleTime: 15_000 });
  const eligibleSubtotal = Math.max(0, totals.subtotal - totals.couponDiscount);
  const maxLoyaltyPoints = Math.min(loyaltyQ.data?.wallet.balance ?? 0, Math.floor(eligibleSubtotal * ((loyaltyQ.data?.rules.MAX_REDEMPTION_PERCENT ?? 20) / 100) * (loyaltyQ.data?.rules.POINTS_PER_RUPEE_REDEEMED ?? 10)));
  const pointsPerRupee = loyaltyQ.data?.rules.POINTS_PER_RUPEE_REDEEMED ?? 10;
  const loyaltyDiscount = loyaltyPoints / pointsPerRupee;
  const payableTotal = Math.max(0, totals.total - loyaltyDiscount);

  const slotsQuery = useQuery({
    queryKey: ["delivery-slots", activeAddressId],
    enabled: !!token && !!activeAddressId,
    queryFn: () => deliverySlotApi.available(token, activeAddressId!),
    staleTime: 20_000,
    refetchOnWindowFocus: true,
  });
  const slots = slotsQuery.data?.slots ?? [];
  const selectedSlot = slots.find((item) => `${item.slotId}:${item.dateKey}` === selectedSlotKey) ?? null;

  useEffect(() => {
    if (!slots.length) {
      setSelectedSlotKey("");
      return;
    }
    if (!slots.some((item) => `${item.slotId}:${item.dateKey}` === selectedSlotKey)) {
      setSelectedSlotKey(`${slots[0].slotId}:${slots[0].dateKey}`);
    }
  }, [slots, selectedSlotKey]);
  const [placing, setPlacing] = useState(false);
  const inFlight = useRef(false);

  if (cart.items.length === 0) {
    return (
      <AppLayout>
        <EmptyState
          emoji="🛒"
          title="Your cart is empty"
          description="Add some items before checking out."
          cta={{ to: "/", label: "Shop now" }}
        />
      </AppLayout>
    );
  }

  const syncCart = async () => {
    await qc.invalidateQueries({ queryKey: ["cart"] });
    cart.clearCoupon();
  };

  async function place() {
    if (inFlight.current) return;
    if (!cart.isAuthed) {
      toast.error("Please sign in to place your order.");
      navigate({ to: "/auth/login" });
      return;
    }
    if (cart.items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    if (!activeAddressId) {
      toast.error("Please select a delivery address before placing your order.");
      return;
    }
    if (!selectedSlot) {
      toast.error("Please select an available delivery slot.");
      return;
    }

    inFlight.current = true;
    setPlacing(true);
    try {
      const { order, message } = await orderApi.create(token, {
        addressId: activeAddressId,
        paymentMethod: payment === "cod" ? "COD" : "ONLINE",
        couponCode: cart.appliedCoupon?.code ?? "",
        notes: `Delivery slot: ${selectedSlot.label} (${selectedSlot.window})`,
        deliverySlotId: selectedSlot.slotId,
        deliveryDateKey: selectedSlot.dateKey,
        loyaltyPoints,
      });

      if (payment === "cod") {
        await syncCart();
        toast.success(message || `Order ${order.orderNumber ?? order.id} placed!`);
        navigate({ to: "/orders/$id", params: { id: order.id } });
        return;
      }

      // ONLINE → Razorpay
      await loadRazorpay();
      const rp = await paymentApi.createOrder(token, order.id);
      await openRazorpay(order.id, rp);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not place your order. Please try again.");
    } finally {
      inFlight.current = false;
      setPlacing(false);
    }
  }

  async function openRazorpay(
    orderId: string,
    rp: { key: string; orderId: string; amount: number; currency: string; receipt?: string },
  ) {
    const Razorpay = window.Razorpay;
    if (!Razorpay) throw new Error("Could not load the payment gateway. Please try again.");

    await new Promise<void>((resolve) => {
      const rzp = new Razorpay({
        key: rp.key,
        amount: rp.amount,
        currency: rp.currency || "INR",
        order_id: rp.orderId,
        name: "Fresh15",
        description: rp.receipt ? `Order ${rp.receipt}` : "Fresh15 order",
        prefill: {
          name: user?.name ?? "",
          email: user?.email ?? "",
          contact: user?.phone ?? "",
        },
        theme: { color: "#16a34a" },
        modal: {
          ondismiss: () => {
            toast.error("Payment cancelled. You can retry from your order page.");
            navigate({ to: "/orders/$id", params: { id: orderId } });
            resolve();
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const msg = await paymentApi.verify(token, {
              orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await syncCart();
            toast.success(msg || "Payment successful!");
            navigate({ to: "/orders/$id", params: { id: orderId } });
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "We could not verify your payment.");
            navigate({ to: "/orders/$id", params: { id: orderId } });
          } finally {
            resolve();
          }
        },
      });

      rzp.on("payment.failed", (resp: { error?: Record<string, unknown> }) => {
        void paymentApi
          .failure(token, { orderId, error: resp?.error ?? {} })
          .catch(() => undefined)
          .finally(() => {
            toast.error(String(resp?.error?.["description"] ?? "Payment failed. Please try again."));
            navigate({ to: "/orders/$id", params: { id: orderId } });
            resolve();
          });
      });

      rzp.open();
    });
  }

  return (
    <AppLayout>
      <h1 className="mb-4 text-2xl font-black tracking-tight sm:text-3xl">Checkout</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {/* Address */}
          <section className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <MapPin className="h-4 w-4 text-primary" /> Delivery address
              </h2>
              <Link to="/addresses" className="text-xs font-semibold text-primary hover:underline">
                Manage
              </Link>
            </div>
            {addressesLoading ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl border bg-muted/40" />
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No saved addresses yet.{" "}
                <Link to="/addresses" className="font-semibold text-primary hover:underline">
                  Add one
                </Link>{" "}
                to continue.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    onClick={() =>
                      void setActive(a.id).catch((e: unknown) =>
                        toast.error(e instanceof Error ? e.message : "Could not update address"),
                      )
                    }
                    className={
                      "rounded-xl border p-3 text-left text-sm transition " +
                      (a.id === activeAddressId
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted")
                    }
                  >
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase">{a.label}</div>
                      <div className="font-semibold">{a.name}</div>
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {a.line1}, {a.city} {a.pincode}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Slot */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Clock className="h-4 w-4 text-primary" /> Delivery slot
            </h2>
            {slotsQuery.isLoading ? (
              <div className="grid gap-2 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl border bg-muted/40" />
                ))}
              </div>
            ) : slotsQuery.isError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <div className="font-semibold">Delivery slots are unavailable</div>
                <div className="mt-1 text-xs text-muted-foreground">Please refresh or choose another address.</div>
              </div>
            ) : slots.length === 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                <div className="font-semibold">No delivery slots available</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  This area is currently at capacity. Please try again shortly or choose another address.
                </div>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {slots.map((item) => (
                  <button
                    key={`${item.slotId}-${item.dateKey}`}
                    onClick={() => setSelectedSlotKey(`${item.slotId}:${item.dateKey}`)}
                    className={
                      "rounded-xl border p-3 text-left transition " +
                      (`${item.slotId}:${item.dateKey}` === selectedSlotKey
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted")
                    }
                  >
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="mt-1 text-sm">{item.window}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Promised by{" "}
                      {new Date(item.promisedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {item.remainingCapacity} spots left · {item.store.name}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedSlot && (
              <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Serving zone: <span className="font-medium text-foreground">{selectedSlot.zone.name}</span>
                {" · "}Store: <span className="font-medium text-foreground">{selectedSlot.store.name}</span>
                {" · "}Current partner capacity:{" "}
                <span className="font-medium text-foreground">{selectedSlot.workload.partnerRemaining}</span>
              </div>
            )}
          </section>

          {/* FreshPoints */}
          {token && loyaltyQ.data && (
            <section className="rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div><h2 className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-primary" /> FreshPoints</h2><p className="mt-1 text-xs text-muted-foreground">{loyaltyQ.data.wallet.balance.toLocaleString("en-IN")} available · redeem up to {loyaltyQ.data.rules.MAX_REDEMPTION_PERCENT}%</p></div>
                <Link to="/loyalty" className="text-xs font-semibold text-primary">View wallet</Link>
              </div>
              {maxLoyaltyPoints >= loyaltyQ.data.rules.MIN_REDEMPTION_POINTS ? (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/5 p-3"><div><div className="text-sm font-semibold">Save {inr(maxLoyaltyPoints / pointsPerRupee)}</div><div className="text-xs text-muted-foreground">Use {maxLoyaltyPoints} points</div></div><button type="button" onClick={() => setLoyaltyPoints((v) => v ? 0 : maxLoyaltyPoints)} className={"rounded-full px-4 py-2 text-xs font-bold " + (loyaltyPoints ? "border bg-background" : "bg-primary text-primary-foreground")}>{loyaltyPoints ? "Remove" : "Use points"}</button></div>
              ) : <p className="mt-3 text-xs text-muted-foreground">Keep earning — minimum {loyaltyQ.data.rules.MIN_REDEMPTION_POINTS} points required to redeem.</p>}
            </section>
          )}

          {/* Payment */}
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <CreditCard className="h-4 w-4 text-primary" /> Payment method
            </h2>
            <div className="space-y-2">
              <PayOption
                selected={payment === "razorpay"}
                onClick={() => setPayment("razorpay")}
                title="Razorpay"
                sub="UPI, Cards, Netbanking · Instant"
                icon={<CreditCard className="h-5 w-5" />}
              />
              <PayOption
                selected={payment === "cod"}
                onClick={() => setPayment("cod")}
                title="Cash on Delivery"
                sub="Pay when your order arrives"
                icon={<Wallet className="h-5 w-5" />}
              />
            </div>
          </section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Order summary</h2>
            <div className="mb-3 space-y-1.5 text-sm">
              {cart.items.map((it) => (
                <div key={it.productId}>
                  <div className="flex items-center justify-between">
                    <span className="line-clamp-1 text-muted-foreground">
                      {it.name} × {it.qty}
                    </span>
                    <span className="font-semibold">{inr(it.price * it.qty)}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    If unavailable: {substitutionBadge(it.substitutionPreference, it.preferredReplacementName)}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-1.5 text-sm">
              <Row label="Subtotal" value={inr(totals.subtotal)} />
              {totals.couponDiscount > 0 && <Row label="Coupon" value={`-${inr(totals.couponDiscount)}`} success />}
              <Row
                label="Delivery"
                value={totals.deliveryFee === 0 ? "FREE" : inr(totals.deliveryFee)}
                success={totals.deliveryFee === 0}
              />
              <Row label="Taxes" value={inr(totals.taxes)} />
              {loyaltyDiscount > 0 && <Row label="FreshPoints" value={`-${inr(loyaltyDiscount)}`} success />}
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <span className="font-bold">Total</span>
              <span className="text-xl font-black">{inr(payableTotal)}</span>
            </div>
            <button
              onClick={place}
              disabled={placing || !selectedSlot}
              className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-50"
            >
              {placing ? "Placing order…" : `Place order · ${inr(payableTotal)}`}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Row({ label, value, success }: { label: string; value: string; success?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={"font-semibold " + (success ? "text-success" : "")}>{value}</span>
    </div>
  );
}

function PayOption({
  selected,
  onClick,
  title,
  sub,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition " +
        (selected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted")
      }
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-primary">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      {selected && (
        <div className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3.5 w-3.5" />
        </div>
      )}
    </button>
  );
}
