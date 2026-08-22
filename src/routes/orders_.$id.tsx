import { createFileRoute, Link } from "@/lib/next-router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  Download,
  MapPin,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Phone,
  ShieldCheck,
  KeyRound,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProductArt } from "@/components/common/ProductArt";
import { orderApi } from "@/lib/order-api";
import { deliveryApi, DELIVERY_TO_ORDER_STATUS } from "@/lib/delivery-api";
import { useOrderRealtime } from "@/lib/hooks/use-order-realtime";
import { MapContainer } from "@/components/common/MapContainer";
import { EmptyState } from "@/components/common/EmptyState";

import { useAuth } from "@/lib/store/auth";
import { paymentApi } from "@/lib/order-api";
import { loadRazorpay } from "@/lib/razorpay";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { substitutionBadge } from "@/lib/substitution";
import { inr } from "@/lib/format";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/orders_/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Order #${params.id} — Fresh15` },
      { name: "description", content: `Track order #${params.id} on Fresh15.` },
      { property: "og:title", content: `Order #${params.id} — Fresh15` },
      { property: "og:description", content: "Track your Fresh15 order." },
    ],
  }),
  component: OrderDetail,
});

const steps: { key: Order["status"]; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "placed", label: "Order placed", icon: Check },
  { key: "packed", label: "Packed", icon: Package },
  { key: "out_for_delivery", label: "Out for delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

const statusHeading: Record<Order["status"], string> = {
  placed: "Order placed",
  packed: "Packed",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const ORDER_PROGRESS: Order["status"][] = ["placed", "packed", "out_for_delivery", "delivered"];

function OrderDetail() {
  const { id } = Route.useParams();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const q = useQuery({
    queryKey: ["order", token ?? "guest", id],
    queryFn: () => orderApi.get(token, id),
    enabled: Boolean(token),
  });
  const order = q.data;
  const qc = useQueryClient();
  const [now, setNow] = useState(() => Date.now());

  // Realtime is the single source of truth while tracking — no polling.
  const { partnerLocation } = useOrderRealtime(id);
  const dq = useQuery({
    queryKey: ["delivery", id],
    queryFn: () => deliveryApi.getByOrder(token, id),
    enabled: Boolean(token && id && order),
    retry: false,
    staleTime: 15_000,
  });
  const delivery = dq.data ?? null;
  const otpQuery = useQuery({
    queryKey: ["delivery-otp", id],
    queryFn: () => deliveryApi.getDeliveryOtp(token, id),
    enabled: Boolean(token && id && delivery && delivery.status === "OUT_FOR_DELIVERY"),
    staleTime: 10_000,
    retry: false,
  });
  const [customerConfirming, setCustomerConfirming] = useState(false);
  const [reorderBusy, setReorderBusy] = useState<string | null>(null);

  const paymentPending =
    order?.paymentMethod === "razorpay" && order.paymentStatus !== "PAID" && order.status !== "cancelled";
  const paymentExpiresAt = order?.paymentExpiresAt ? Date.parse(order.paymentExpiresAt) : NaN;
  const remainingMs = Number.isFinite(paymentExpiresAt) ? Math.max(0, paymentExpiresAt - now) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const paymentExpired = Boolean(paymentPending && Number.isFinite(paymentExpiresAt) && remainingMs <= 0);

  useEffect(() => {
    if (!paymentPending || !Number.isFinite(paymentExpiresAt)) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [paymentPending, paymentExpiresAt]);

  useEffect(() => {
    if (!paymentPending || !paymentExpired || !token) return;
    let active = true;
    void paymentApi
      .reconcile(token, id)
      .then(() => {
        if (active) {
          void qc.invalidateQueries({ queryKey: ["order", token ?? "guest", id] });
          void qc.invalidateQueries({ queryKey: ["delivery", id] });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [paymentPending, paymentExpired, token, id, qc]);

  if (q.isLoading) {
    return (
      <AppLayout>
        <div className="h-96 rounded-2xl skeleton-shimmer" />
      </AppLayout>
    );
  }
  if (!order) {
    return (
      <AppLayout>
        <EmptyState emoji="📦" title="Order not found" description="We could not find this order in your account." cta={{ to: "/orders", label: "Back to orders" }} />
      </AppLayout>
    );
  }

  const payNow = async () => {
    if (!token || !order || paymentExpired) return;
    try {
      await loadRazorpay();
      const rp = await paymentApi.createOrder(token, id);
      const Razorpay = window.Razorpay;
      if (!Razorpay) throw new Error("Could not load the payment gateway. Please try again.");
      const rzp = new Razorpay({
        key: rp.key,
        amount: rp.amount,
        currency: rp.currency || "INR",
        order_id: rp.orderId,
        name: "Fresh15",
        description: rp.receipt ? `Order ${rp.receipt}` : "Fresh15 order",
        prefill: { name: user?.name ?? "", email: user?.email ?? "", contact: user?.phone ?? "" },
        theme: { color: "var(--fresh15-primary, #16a34a)" },
        modal: {
          ondismiss: () => toast.info("Payment window closed. Your order remains reserved until the timer ends."),
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await paymentApi.verify(token, { orderId: id, ...response });
            toast.success("Payment successful!");
            await qc.invalidateQueries({ queryKey: ["order", token ?? "guest", id] });
            await qc.invalidateQueries({ queryKey: ["delivery", id] });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "We could not verify your payment.");
          }
        },
      });
      rzp.on("payment.failed", (resp: { error?: Record<string, unknown> }) => {
        void paymentApi.failure(token, { orderId: id, error: resp?.error ?? {} }).catch(() => undefined);
        toast.error(String(resp?.error?.["description"] ?? "Payment failed. Please try again."));
      });
      rzp.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start payment.");
    }
  };

  const retryPayment = async () => {
    if (!token) return;
    try {
      const result = await paymentApi.reconcile(token, id);
      if (result.order.paymentStatus === "PAID") {
        toast.success("Payment recovered successfully.");
        await qc.invalidateQueries({ queryKey: ["order", token ?? "guest", id] });
      } else {
        toast.info("No successful payment was found yet. Please retry payment while the window is open.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not check payment status.");
    }
  };

  const buyAgain = async (items?: Array<{ productId: string; quantity: number }>) => {
    if (!token) return;
    try {
      setReorderBusy(items ? (items[0]?.productId ?? "selected") : "all");
      const result = await orderApi.reorderToCart(token, {
        mode: items ? "SELECTED" : "ALL",
        sourceOrderId: order.id,
        ...(items ? { items } : {}),
      });
      if (result.summary.addedCount > 0) {
        toast.success(`${result.summary.addedCount} item${result.summary.addedCount === 1 ? "" : "s"} added to cart`);
      }
      if (result.summary.skippedCount > 0) {
        toast.info(
          `${result.summary.skippedCount} unavailable item${result.summary.skippedCount === 1 ? " was" : "s were"} skipped.`,
        );
      }
      await qc.invalidateQueries({ queryKey: ["cart", token] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add these items to your cart");
    } finally {
      setReorderBusy(null);
    }
  };

  // Delivery may be ahead of the order record; never move the tracker backwards.
  const deliveryMapped = delivery ? DELIVERY_TO_ORDER_STATUS[delivery.status] : undefined;
  const effectiveStatus: Order["status"] =
    deliveryMapped === "cancelled"
      ? order.status
      : deliveryMapped && ORDER_PROGRESS.indexOf(deliveryMapped) > ORDER_PROGRESS.indexOf(order.status)
        ? deliveryMapped
        : order.status;

  const currentStep = steps.findIndex((s) => s.key === effectiveStatus);
  const cancelled = effectiveStatus === "cancelled";
  const rider = delivery?.rider ?? null;
  const etaMinutes = partnerLocation?.etaMinutes ?? delivery?.etaMinutes ?? order.etaMinutes;

  return (
    <AppLayout>
      <Link
        to="/orders"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> All orders
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Order #{order.orderNumber ?? order.id}</h1>
          <div className="text-sm text-muted-foreground">
            Placed on {new Date(order.createdAt).toLocaleString("en-IN")}
          </div>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-full border bg-surface-elevated px-4 py-2 text-sm font-semibold hover:bg-muted">
          <Download className="h-4 w-4" /> Download invoice
        </button>
      </div>

      {paymentPending && (
        <div
          className={`mb-6 rounded-3xl border p-5 ${paymentExpired ? "border-destructive/30 bg-destructive/5" : "border-amber-500/30 bg-amber-500/5"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold">
                {paymentExpired ? "Payment window expired" : "Payment still pending"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {paymentExpired
                  ? "We are checking Razorpay in case your payment succeeded before the page/network interruption."
                  : "Your order is reserved for up to 5 minutes. Complete Razorpay payment before the timer reaches zero."}
              </div>
            </div>
            {!paymentExpired && (
              <div className="rounded-full border bg-background px-4 py-2 text-lg font-black tabular-nums">
                {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}
              </div>
            )}
            <div className="flex gap-2">
              {!paymentExpired && (
                <button
                  type="button"
                  onClick={() => void payNow()}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
                >
                  Continue payment
                </button>
              )}
              <button
                type="button"
                onClick={() => void retryPayment()}
                className="rounded-full border bg-background px-4 py-2 text-xs font-bold hover:bg-muted"
              >
                Check payment
              </button>
            </div>
          </div>
        </div>
      )}

      {delivery && otpQuery.data?.required && delivery.status !== "DELIVERED" && (
        <div className="mb-6 rounded-3xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-bold">Delivery verification</div>
              <div className="text-xs text-muted-foreground">
                Share this OTP with the rider only when they are at your door.
              </div>
            </div>
          </div>

          {delivery.deliveryOtpVerified ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-success/10 p-4 text-sm font-semibold text-success">
                <ShieldCheck className="mr-2 inline h-4 w-4" />
                OTP verified at the door.
              </div>
              {!delivery.customerConfirmedAt && (
                <button
                  type="button"
                  disabled={customerConfirming}
                  onClick={async () => {
                    if (!token || !delivery.id) return;
                    try {
                      setCustomerConfirming(true);
                      await deliveryApi.confirmDelivery(token, delivery.id);
                      toast.success("Delivery confirmed.");
                      await qc.invalidateQueries({ queryKey: ["delivery", id] });
                      await qc.invalidateQueries({ queryKey: ["delivery-otp", id] });
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Could not confirm delivery.");
                    } finally {
                      setCustomerConfirming(false);
                    }
                  }}
                  className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
                >
                  {customerConfirming ? "Confirming…" : "Confirm I received my order"}
                </button>
              )}
              {delivery.customerConfirmedAt && (
                <div className="text-xs font-semibold text-success">You confirmed receipt of this order.</div>
              )}
            </div>
          ) : otpQuery.isLoading ? (
            <div className="mt-4 h-16 rounded-2xl skeleton-shimmer" />
          ) : otpQuery.data?.otp ? (
            <div className="mt-4 rounded-2xl bg-background p-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Door OTP</div>
              <div className="mt-1 text-4xl font-black tracking-[0.35em] text-primary">{otpQuery.data.otp}</div>
              {otpQuery.data.expiresAt && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Valid until{" "}
                  {new Date(otpQuery.data.expiresAt).toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Tracker */}
      <div className="mb-6 overflow-hidden rounded-3xl border bg-card p-5">
        {cancelled ? (
          <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 p-4">
            <XCircle className="h-6 w-6 text-destructive" />
            <div>
              <div className="font-bold text-destructive">Order cancelled</div>
              <div className="text-sm text-muted-foreground">Amount refunded to source</div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {etaMinutes ? "Arriving in" : "Status"}
                </div>
                <div className="text-3xl font-black text-primary">
                  {etaMinutes ? `${etaMinutes} min` : statusHeading[effectiveStatus]}
                </div>
              </div>
              {rider ? (
                <div className="text-right text-xs text-muted-foreground">Delivery partner assigned</div>
              ) : (
                <div className="text-right text-xs text-muted-foreground">Delivery partner assigned soon</div>
              )}
            </div>

            {rider && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
                {rider.image ? (
                  <img
                    src={rider.image}
                    alt={rider.name ?? "Delivery partner"}
                    loading="lazy"
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-bold">{rider.name ?? "Delivery partner"}</div>
                  <div className="text-xs text-muted-foreground">Your delivery partner</div>
                </div>
                {rider.phone && (
                  <a
                    href={`tel:${rider.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-surface-elevated px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                )}
              </div>
            )}

            {delivery?.deliveryOtpVerified && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl bg-success/10 p-3 text-xs font-semibold text-success">
                <ShieldCheck className="h-4 w-4" /> Delivery verified with OTP
              </div>
            )}

            {partnerLocation && effectiveStatus !== "delivered" && delivery?.status !== "DELIVERED" && (
              <MapContainer
                className="mb-4"
                latitude={partnerLocation.latitude}
                longitude={partnerLocation.longitude}
                destination={delivery?.destination ?? null}
                deliveryId={delivery?.id ?? null}
                partnerName={rider?.name ?? "Delivery partner"}
                eta={etaMinutes ? `${etaMinutes} min` : null}
                orderStatus={statusHeading[effectiveStatus]}
              />
            )}

            <div className="relative flex items-start justify-between">
              <div className="absolute left-5 right-5 top-5 h-1 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                />
              </div>
              {steps.map((s, i) => {
                const done = i <= currentStep;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="relative z-10 flex flex-1 flex-col items-center gap-1.5 text-center">
                    <div
                      className={
                        "grid h-10 w-10 place-items-center rounded-full border-2 transition " +
                        (done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground")
                      }
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div
                      className={"text-[11px] font-semibold " + (done ? "text-foreground" : "text-muted-foreground")}
                    >
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Items ({order.items.length})</h2>
            <div className="space-y-3">
              {order.items.map((it) => (
                <div key={it.productId} className="flex items-center gap-3">
                  <ProductArt
                    emoji={it.emoji}
                    src={it.image}
                    alt={it.name}
                    gradient={it.gradient}
                    size="sm"
                    className="h-14 w-14 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-semibold">{it.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.unit} · Qty {it.qty}
                    </div>
                    {it.substitutionPreference && (
                      <div className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        <span className="truncate">
                          If unavailable: {substitutionBadge(it.substitutionPreference, it.preferredReplacementName)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="text-sm font-bold">{inr(it.price * it.qty)}</div>
                    {order.status === "delivered" && (
                      <button
                        type="button"
                        disabled={reorderBusy !== null}
                        onClick={() => void buyAgain([{ productId: it.productId, quantity: it.qty }])}
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold hover:bg-muted disabled:opacity-60"
                      >
                        {reorderBusy === it.productId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ShoppingCart className="h-3 w-3" />
                        )}
                        Buy again
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <MapPin className="h-4 w-4 text-primary" /> Delivery address
            </h2>
            <div className="text-sm">
              <div className="font-semibold">
                {order.address.name} · {order.address.label}
              </div>
              <div className="text-muted-foreground">
                {order.address.line1}, {order.address.line2}
              </div>
              <div className="text-muted-foreground">
                {order.address.city}, {order.address.state} {order.address.pincode}
              </div>
              <div className="mt-1 text-muted-foreground">{order.address.phone}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold">Bill summary</h2>
            <div className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={inr(order.subtotal)} />
              {order.discount > 0 && (
                <Row
                  label={order.couponCode ? `Discount (${order.couponCode})` : "Discount"}
                  value={`-${inr(order.discount)}`}
                  success
                />
              )}
              <Row label="Delivery fee" value={order.deliveryFee === 0 ? "FREE" : inr(order.deliveryFee)} />
              <Row label="Taxes" value={inr(order.taxes)} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <span className="font-bold">Total</span>
              <span className="text-xl font-black">{inr(order.total)}</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Payment: {order.paymentMethod === "cod" ? "Cash on Delivery" : "Razorpay"}
              {order.paymentStatus ? ` · ${order.paymentStatus}` : ""}
            </div>
          </div>
          {order.status === "delivered" && (
            <button
              type="button"
              disabled={reorderBusy !== null}
              onClick={() => void buyAgain()}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {reorderBusy === "all" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              Buy again all
            </button>
          )}
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
