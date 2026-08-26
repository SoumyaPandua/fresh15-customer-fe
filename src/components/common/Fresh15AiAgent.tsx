 "use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Check,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/store/auth";
import {
  confirmAiAgent,
  declineAiAgent,
  sendAiAgent,
  type AgentConfirmation,
} from "@/lib/ai-agent-api";
import { toast } from "sonner";

type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function summaryText(confirmation: AgentConfirmation): string[] {
  const summary = confirmation.summary;

  if (!isRecord(summary)) return [];

  const lines: string[] = [];

  if (confirmation.action === "place_order") {
    const cart = isRecord(summary.cart) ? summary.cart : null;
    const address = isRecord(summary.address) ? summary.address : null;
    const slot = isRecord(summary.deliverySlot)
      ? summary.deliverySlot
      : null;

    if (cart && typeof cart.subtotal === "number") {
      lines.push(`Cart subtotal: ₹${cart.subtotal.toFixed(2)}`);
    }

    if (cart && typeof cart.totalQuantity === "number") {
      lines.push(`Items: ${cart.totalQuantity}`);
    }

    if (address) {
      const addressLine = [
        address.addressLine1,
        address.city,
        address.state,
        address.pincode,
      ]
        .filter((value) => typeof value === "string" && value)
        .join(", ");

      if (addressLine) {
        lines.push(`Deliver to: ${addressLine}`);
      }
    }

    if (slot) {
      const label =
        typeof slot.label === "string"
          ? slot.label
          : "Selected delivery slot";
      const dateKey =
        typeof slot.dateKey === "string"
          ? ` on ${slot.dateKey}`
          : "";
      lines.push(`Slot: ${label}${dateKey}`);
    }

    if (typeof summary.paymentMethod === "string") {
      lines.push(`Payment: ${summary.paymentMethod}`);
    }

    if (typeof summary.couponCode === "string" && summary.couponCode) {
      lines.push(`Coupon: ${summary.couponCode}`);
    }

    if (
      typeof summary.loyaltyPoints === "number" &&
      summary.loyaltyPoints > 0
    ) {
      lines.push(
        `FreshPoints to redeem: ${summary.loyaltyPoints}`,
      );
    }

    return lines;
  }

  if (confirmation.action === "request_refund") {
    if (typeof summary.orderNumber === "string") {
      lines.push(`Order: ${summary.orderNumber}`);
    }
    if (typeof summary.amount === "number") {
      lines.push(`Refund amount: ₹${summary.amount.toFixed(2)}`);
    }
    if (typeof summary.reason === "string" && summary.reason) {
      lines.push(`Reason: ${summary.reason}`);
    }
    return lines;
  }

  if (confirmation.action === "cancel_order") {
    if (typeof summary.orderId === "string") {
      lines.push(`Order: ${summary.orderId}`);
    }
    return lines;
  }

  if (confirmation.action === "change_default_address") {
    if (typeof summary.addressLine1 === "string") {
      lines.push(`Address: ${summary.addressLine1}`);
    }
    if (typeof summary.city === "string") {
      lines.push(`City: ${summary.city}`);
    }
    if (typeof summary.pincode === "string") {
      lines.push(`Pincode: ${summary.pincode}`);
    }
    return lines;
  }

  return lines;
}

export function Fresh15AiAgent() {
  const token = useAuth((state) => state.token);
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [conversationId, setConversationId] =
    useState<string>();
  const [pendingConfirmation, setPendingConfirmation] =
    useState<AgentConfirmation | null>(null);

  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      role: "assistant",
      content: "Hi! I’m Fresh15 Agent. I can search Fresh15 data and perform permitted actions. High-risk actions such as placing an order, cancellation and refunds always require your confirmation.",
    },
  ]);

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading, pendingConfirmation]);

  if (!token) return null;

  const authenticatedToken = token;

  async function runAgent() {
    const text = input.trim();
    if (!text || loading || confirming) return;

    setInput("");
    setMessages((current) => [
      ...current,
      { role: "user", content: text },
    ]);
    setLoading(true);

    try {
      const response = await sendAiAgent(
        authenticatedToken,
        text,
        conversationId,
      );

      setConversationId(response.conversationId);

      if (response.actions?.some((action) =>
        action.success &&
        [
          "add_to_cart",
          "remove_from_cart",
          "update_cart_quantity",
          "add_reorder_list_to_cart",
        ].includes(action.tool),
      )) {
        await queryClient.invalidateQueries({
          queryKey: ["cart", authenticatedToken],
        });
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            response.reply ||
            "Done. I processed your request.",
        },
      ]);

      setPendingConfirmation(
        response.confirmation ?? null,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Fresh15 Agent is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmAction() {
    if (
      !pendingConfirmation ||
      !conversationId ||
      confirming
    ) {
      return;
    }

    setConfirming(true);

    try {
      const response = await confirmAiAgent(
        authenticatedToken,
        conversationId,
        pendingConfirmation.confirmationId,
      );

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            response.reply ||
            "The confirmed action has been completed.",
        },
      ]);

      setPendingConfirmation(null);
      toast.success("Fresh15 action completed");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The action could not be confirmed.",
      );
    } finally {
      setConfirming(false);
    }
  }

  async function cancelConfirmation() {
    if (!pendingConfirmation || !conversationId || confirming) {
      return;
    }

    setConfirming(true);

    try {
      await declineAiAgent(
        authenticatedToken,
        conversationId,
        pendingConfirmation.confirmationId,
      );

      setPendingConfirmation(null);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Okay. I cancelled that action and nothing was changed.",
        },
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The confirmation could not be cancelled.",
      );
    } finally {
      setConfirming(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open Fresh15 AI Agent"
        onClick={() => setOpen(true)}
        className="fixed bottom-[88px] right-6 z-[71] flex items-center gap-2 rounded-full border border-primary/30 bg-background px-4 py-2.5 text-xs font-bold text-foreground shadow-lg transition hover:-translate-y-0.5 hover:border-primary hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <WandSparkles className="h-4 w-4 text-primary" />
        Fresh15 Agent
      </button>

      {open && (
        <section
          aria-label="Fresh15 AI Agent"
          className="fixed bottom-20 right-5 z-[69] flex h-[min(680px,78dvh)] max-h-[78dvh] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl"
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          <header className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                <WandSparkles className="h-5 w-5" />
              </span>

              <div>
                <div className="font-black">Fresh15 Agent</div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Action-based assistant
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close Fresh15 Agent"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            <div className="space-y-3">
              {messages.map((message, index) => (
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

              {pendingConfirmation && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Confirmation required
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Review this action before Fresh15 executes it.
                  </p>

                  <div className="mt-3 space-y-1.5 text-xs">
                    {summaryText(pendingConfirmation).map(
                      (line) => (
                        <div
                          key={line}
                          className="rounded-lg bg-background px-2.5 py-2"
                        >
                          {line}
                        </div>
                      ),
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={confirming}
                      onClick={() => void confirmAction()}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {confirming ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Confirm
                    </button>

                    <button
                      type="button"
                      disabled={confirming}
                      onClick={() => void cancelConfirmation()}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-muted px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void runAgent();
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
                    void runAgent();
                  }
                }}
                rows={1}
                maxLength={1200}
                disabled={loading || confirming}
                placeholder="Try: Add 2 milk to my cart"
                className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />

              <button
                type="submit"
                disabled={!input.trim() || loading || confirming}
                aria-label="Send agent request"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              High-risk actions always require explicit confirmation.
            </div>
          </form>
        </section>
      )}
    </>
  );
}
