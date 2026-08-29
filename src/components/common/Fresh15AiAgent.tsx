"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  Loader2,
  MapPin,
  ShoppingCart,
  Sparkles,
  Store,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/store/auth";
import { useAiAgent } from "@/lib/store/ai-agent";
import { paymentApi } from "@/lib/order-api";
import type { AgentProduct, AgentWidget } from "@/lib/ai-agent-api";
import { toast } from "sonner";
import { loadRazorpay } from "@/lib/razorpay";

function ProductList({
  widget,
}: {
  widget: Extract<AgentWidget, { type: "PRODUCT_LIST" }>;
}) {
  return (
    <div className="mt-3 space-y-2">
      {widget.payload.products.map((product) => (
        <a
          key={product.id}
          href={
            product.url ||
            `/product/${encodeURIComponent(product.slug || product.id)}`
          }
          className="flex w-full items-center gap-3 rounded-2xl border bg-background p-3 text-left transition hover:border-primary"
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">
              {product.name}
            </div>
            <div className="text-xs text-muted-foreground">
              ₹{product.price} / {product.unit || "unit"}
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </a>
      ))}
    </div>
  );
}

function UnitPicker({
  widget,
  onSelect,
}: {
  widget: Extract<AgentWidget, { type: "UNIT_PICKER" }>;
  onSelect: (unit: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {widget.payload.options.map((unit) => (
        <button
          key={unit}
          type="button"
          onClick={() => onSelect(unit)}
          className="rounded-xl border px-3 py-2 text-xs font-bold hover:border-primary hover:bg-primary/5"
        >
          {widget.payload.quantity ?? 1} {unit.toLowerCase()}
        </button>
      ))}
    </div>
  );
}

function AddressPicker({
  widget,
  onSelect,
}: {
  widget: Extract<AgentWidget, { type: "ADDRESS_PICKER" }>;
  onSelect: (addressId: string) => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      {widget.payload.addresses.map((address) => (
        <button
          key={address.id}
          type="button"
          onClick={() => onSelect(address.id)}
          className="w-full rounded-2xl border bg-background p-3 text-left hover:border-primary"
        >
          <div className="flex items-center gap-2 text-sm font-bold">
            <MapPin className="h-4 w-4 text-primary" />
            {address.label}
            {address.isDefault ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px]">
                Default
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {address.addressLine1}, {address.city} {address.pincode}
          </div>
        </button>
      ))}

      {widget.payload.addAddress ? (
        <a
          href="/addresses/new"
          className="flex items-center justify-center rounded-xl border border-dashed px-3 py-2.5 text-xs font-bold hover:border-primary hover:text-primary"
        >
          + Add address
        </a>
      ) : null}
    </div>
  );
}

function SlotPicker({
  widget,
  onSelect,
}: {
  widget: Extract<AgentWidget, { type: "SLOT_PICKER" }>;
  onSelect: (slotId: string, dateKey: string) => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      {widget.payload.slots.map((slot) => (
        <button
          key={`${slot.id}-${slot.dateKey}`}
          type="button"
          onClick={() => onSelect(slot.id, slot.dateKey)}
          className="flex w-full items-center justify-between rounded-2xl border p-3 text-left hover:border-primary"
        >
          <span className="text-sm font-bold">{slot.label}</span>
          <span className="text-xs text-muted-foreground">
            {slot.etaMinutes ? `${slot.etaMinutes} min` : slot.dateKey}
          </span>
        </button>
      ))}
    </div>
  );
}

function PaymentPicker({
  widget,
  onSelect,
}: {
  widget: Extract<AgentWidget, { type: "PAYMENT_PICKER" }>;
  onSelect: (method: "COD" | "ONLINE") => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {widget.payload.methods.map((method) => (
        <button
          key={method}
          type="button"
          onClick={() => onSelect(method)}
          className="rounded-xl border px-3 py-3 text-xs font-bold hover:border-primary hover:bg-primary/5"
        >
          {method === "ONLINE" ? "Razorpay" : "Cash on Delivery"}
        </button>
      ))}
    </div>
  );
}

function WidgetRenderer({
  widget,
  onAction,
}: {
  widget: AgentWidget | null;
  onAction: (action: unknown) => void;
}) {
  if (!widget) return null;

  switch (widget.type) {
    case "PRODUCT_LIST":
      return <ProductList widget={widget} />;

    case "UNIT_PICKER":
      return (
        <UnitPicker
          widget={widget}
          onSelect={(unit) =>
            onAction({
              type: "UNIT_SELECTED",
              payload: { unit },
            })
          }
        />
      );

    case "ADDRESS_PICKER":
      return (
        <AddressPicker
          widget={widget}
          onSelect={(addressId) =>
            onAction({
              type: "ADDRESS_SELECTED",
              payload: { addressId },
            })
          }
        />
      );

    case "SLOT_PICKER":
      return (
        <SlotPicker
          widget={widget}
          onSelect={(slotId, dateKey) =>
            onAction({
              type: "SLOT_SELECTED",
              payload: { slotId, dateKey },
            })
          }
        />
      );

    case "PAYMENT_PICKER":
      return (
        <PaymentPicker
          widget={widget}
          onSelect={(method) =>
            onAction({
              type: "PAYMENT_SELECTED",
              payload: { method },
            })
          }
        />
      );

    case "ORDER_SUMMARY": {
      const payload = widget.payload;
      const items = Array.isArray(payload.items)
        ? (payload.items as Array<Record<string, unknown>>)
        : [];

      return (
        <div className="mt-3 rounded-2xl border bg-card p-3 text-xs">
          <div className="font-bold">Order summary</div>
          <div className="mt-2 space-y-1.5">
            {items.map((item, index) => (
              <div
                key={`${String(item.productId)}-${index}`}
                className="flex justify-between gap-3"
              >
                <span>
                  {String(item.name)} × {String(item.quantity)}
                </span>
                <span className="font-semibold">
                  ₹{Number(item.subtotal || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-2 flex justify-between border-t pt-2 font-bold">
            <span>Subtotal</span>
            <span>
              ₹{Number(payload.subtotal || 0).toFixed(2)}
            </span>
          </div>

          <div className="mt-1 text-muted-foreground">
            Payment:{" "}
            {String(payload.paymentMethod || "") === "ONLINE"
              ? "Razorpay"
              : "Cash on Delivery"}
          </div>

          <button
            type="button"
            onClick={() =>
              onAction({
                type: "CONFIRM_ORDER",
                payload: {},
              })
            }
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 font-bold text-primary-foreground"
          >
            <Check className="h-4 w-4" />
            Confirm Order
          </button>

          <button
            type="button"
            onClick={() =>
              onAction({
                type: "CANCEL_WORKFLOW",
                payload: {},
              })
            }
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 font-bold"
          >
            <XCircle className="h-4 w-4" />
            Cancel
          </button>
        </div>
      );
    }

    case "ORDER_SUCCESS":
      return (
        <div className="mt-3 rounded-2xl border bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Check className="h-4 w-4 text-primary" />
            Order placed successfully
          </div>
          <div className="mt-1 text-xs">
            Order #{widget.payload.orderNumber}
          </div>
          <a
            href={widget.payload.trackingUrl}
            className="mt-3 inline-flex rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            Track Order
          </a>
        </div>
      );

    case "PAYMENT_PENDING":
      return (
        <div className="mt-3 rounded-2xl border bg-primary/5 p-3 text-xs">
          <div className="font-bold">
            Payment required for #{widget.payload.orderNumber}
          </div>
        </div>
      );

    case "CART_SUMMARY":
    case "WISHLIST":
    case "ORDER_LIST":
      return null;

    default:
      return null;
  }
}

export function Fresh15AiAgent() {
  const token = useAuth((state) => state.token);
  const queryClient = useQueryClient();
  const agent = useAiAgent();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token || agent.hydrated) return;
    void agent.hydrate(token);
  }, [agent.hydrated, agent.hydrate, token]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agent.messages, agent.loading, agent.widget]);

  const startRazorpay = async (orderId: string) => {
    if (!token) return;

    const payload = await paymentApi.createOrder(
      token,
      orderId,
    );

    await loadRazorpay();

    if (!window.Razorpay) {
      window.open(
        `/checkout/payment?orderId=${encodeURIComponent(orderId)}`,
        "_self",
      );
      return;
    }

    const razorpay = new window.Razorpay({
      key: payload.key,
      amount: payload.amount,
      currency: payload.currency,
      order_id: payload.orderId,
      name: "Fresh15",
      description: "Fresh15 grocery order",
      handler: async (response: Record<string, string>) => {
        try {
          await paymentApi.verify(token, {
            orderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          await agent.sendMessage(
            token,
            `Payment completed for order ${orderId}`,
          );

          toast.success("Payment completed");
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Payment verification failed.",
          );
        }
      },
    });

    razorpay.open();
  };

  useEffect(() => {
    if (
      !token ||
      !agent.payment?.required ||
      !agent.payment.orderId
    ) {
      return;
    }

    void startRazorpay(agent.payment.orderId);
  }, [
    agent.payment?.orderId,
    agent.payment?.required,
    token,
  ]);

  if (!token) return null;

  const submitMessage = async () => {
    const text = input.trim();

    if (!text || agent.loading) return;

    setInput("");

    try {
      const response = await agent.sendMessage(
        token,
        text,
      );

      if (
        response.actions?.some(
          (action) =>
            action.success &&
            [
              "add_to_cart",
              "remove_from_cart",
              "update_cart_quantity",
              "add_reorder_list_to_cart",
            ].includes(action.tool),
        )
      ) {
        await queryClient.invalidateQueries({
          queryKey: ["cart", token],
        });
      }
    } catch {
      toast.error(
        agent.error ||
          "Fresh15 Agent is unavailable.",
      );
    }
  };

  const submitAction = async (action: unknown) => {
    try {
      const response = await agent.sendAction(
        token,
        action,
      );

      if (
        response.actions?.some(
          (entry) =>
            entry.success &&
            [
              "add_to_cart",
              "remove_from_cart",
              "update_cart_quantity",
              "add_reorder_list_to_cart",
            ].includes(entry.tool),
        )
      ) {
        await queryClient.invalidateQueries({
          queryKey: ["cart", token],
        });
      }
    } catch {
      toast.error(
        agent.error ||
          "The requested action failed.",
      );
    }
  };

  return (
    <>
      {!agent.open ? (
        <button
          type="button"
          aria-label="Open Fresh15 AI Agent"
          onClick={agent.openAgent}
          className="fixed bottom-5 right-5 z-[71] flex items-center gap-2 rounded-full border border-primary/30 bg-background px-4 py-2.5 text-xs font-bold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          Fresh15 Agent
        </button>
      ) : null}

      {agent.open ? (
        <section
          aria-label="Fresh15 AI Agent"
          className="fixed bottom-20 right-5 z-[71] flex h-[min(720px,80dvh)] max-h-[80dvh] w-[min(430px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl"
        >
          <header className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <div className="font-black">Fresh15 Agent</div>
                <div className="text-[11px] text-muted-foreground">
                  Shopping, cart and checkout assistant
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close Fresh15 Agent"
              onClick={agent.closeAgent}
              className="rounded-full p-2 hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-3">
              {agent.messages.map((message, index) => (
                <div
                  key={`${index}-${message.role}`}
                  className={`flex ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-muted"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              <WidgetRenderer
                widget={agent.widget}
                onAction={submitAction}
              />

              {agent.loading ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-muted px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              ) : null}

              <div ref={endRef} />
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitMessage();
            }}
            className="shrink-0 border-t bg-card p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value.slice(0, 1200),
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    void submitMessage();
                  }
                }}
                rows={1}
                maxLength={1200}
                disabled={agent.loading}
                placeholder="Try: show me oranges"
                className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />

              <button
                type="submit"
                disabled={
                  !input.trim() || agent.loading
                }
                aria-label="Send agent request"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Store className="h-3 w-3" />
              Fresh15 controls prices, stock, delivery and payments.
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
