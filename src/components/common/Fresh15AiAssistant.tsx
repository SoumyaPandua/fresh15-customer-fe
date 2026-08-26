import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  X,
  Loader2,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useAuth } from "@/lib/store/auth";
import { sendAiMessage, type AiMessage } from "@/lib/ai-chat-api";
import { toast } from "sonner";

const starter: AiMessage[] = [
  {
    role: "assistant",
    content:
      "Hi! I’m Fresh15 AI. I can help with products, offers, cart, orders, delivery, refunds, payments and grocery suggestions.",
  },
];

export function Fresh15AiAssistant() {
  const token = useAuth((s) => s.token);

  const [open, setOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

  const [input, setInput] = useState("");
  const [messages, setMessages] =
    useState<AiMessage[]>(starter);

  const [conversationId, setConversationId] =
    useState<string>();

  const [loading, setLoading] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  if (!token) {
    return null;
  }

  const authenticatedToken = token;

  async function submit() {
    const text = input.trim();

    if (!text || loading) {
      return;
    }

    setInput("");

    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: text,
      },
    ]);

    setLoading(true);

    try {
      const response = await sendAiMessage(
        authenticatedToken,
        text,
        conversationId,
      );

      setConversationId(
        response.conversationId,
      );

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.reply,
          blocked: response.blocked,
        },
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "AI assistant is unavailable",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fresh15AiFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes fresh15AiSparkle {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(0.8) rotate(0deg);
          }

          50% {
            opacity: 1;
            transform: scale(1.15) rotate(18deg);
          }
        }

        @keyframes fresh15AgentPulse {
          0%,
          100% {
            box-shadow:
              0 0 0 0 rgb(34 197 94 / 0.25);
          }

          50% {
            box-shadow:
              0 0 0 7px rgb(34 197 94 / 0);
          }
        }
      `}</style>

      {/* Floating buttons */}
      {!open && !agentOpen && (
        <div className="fixed bottom-6 right-4 z-[70] flex flex-col items-end gap-2 sm:right-6">
          {/* Existing chatbot */}
          <button
            type="button"
            aria-label="Open Fresh15 AI"
            onClick={() => setOpen(true)}
            className="group flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/25 transition-all duration-300 hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-primary/20 animate-[fresh15AiFloat_3.2s_ease-in-out_infinite]"
          >
            <span className="relative grid h-5 w-5 place-items-center">
              <Bot className="h-5 w-5 transition-transform duration-500 group-hover:rotate-12" />

              <Sparkles className="absolute -right-2 -top-2 h-3 w-3 animate-[fresh15AiSparkle_1.8s_ease-in-out_infinite]" />
            </span>

            Fresh15 AI
          </button>

          {/* New agent button */}
          <button
            type="button"
            aria-label="Open Fresh15 AI Agent"
            onClick={() => setAgentOpen(true)}
            className="group flex items-center gap-2 rounded-full border border-primary/30 bg-background/95 px-4 py-3 text-sm font-bold text-foreground shadow-lg backdrop-blur transition-all duration-300 hover:scale-105 hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-4 focus:ring-primary/20 animate-[fresh15AgentPulse_2.8s_ease-in-out_infinite]"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-primary">
              <WandSparkles className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
            </span>

            Fresh15 Agent
          </button>
        </div>
      )}

      {/* Existing chatbot */}
      {open && (
        <div
          className="fixed inset-x-3 bottom-4 z-[70] flex h-[min(680px,78dvh)] max-h-[78dvh] flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[390px]"
          onWheel={(event) =>
            event.stopPropagation()
          }
          onTouchMove={(event) =>
            event.stopPropagation()
          }
        >
          <div className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </span>

              <div>
                <div className="font-black">
                  Fresh15 AI
                </div>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Customer-safe assistant
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close Fresh15 AI"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
            onWheel={(event) =>
              event.stopPropagation()
            }
            onTouchMove={(event) =>
              event.stopPropagation()
            }
          >
            <div className="space-y-3">
              {messages.map(
                (message, index) => (
                  <div
                    key={`${index}-${message.role}`}
                    className={`flex ${
                      message.role ===
                      "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                        message.role === "user"
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ),
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
              void submit();
            }}
            className="shrink-0 border-t bg-card p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value.slice(
                      0,
                      1200,
                    ),
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                rows={1}
                placeholder="Ask about Fresh15..."
                className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />

              <button
                disabled={
                  !input.trim() ||
                  loading
                }
                type="submit"
                aria-label="Send message"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="mt-2 text-[10px] text-muted-foreground">
              Chats may be stored for support,
              safety and product improvement.
            </div>
          </form>
        </div>
      )}

      {/* New agent */}
      {agentOpen && (
        <div
          className="fixed inset-x-3 bottom-4 z-[70] flex h-[min(520px,70dvh)] max-h-[70dvh] flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[390px]"
        >
          <div className="flex items-center justify-between border-b bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                <WandSparkles className="h-5 w-5" />
              </span>

              <div>
                <div className="font-black">
                  Fresh15 Agent
                </div>

                <div className="text-[11px] text-muted-foreground">
                  Shopping actions
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close Fresh15 Agent"
              onClick={() =>
                setAgentOpen(false)
              }
              className="rounded-full p-2 hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
              <WandSparkles className="h-8 w-8" />
            </div>

            <h2 className="mt-4 text-lg font-black">
              Fresh15 AI Agent
            </h2>

            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Your action-based shopping assistant is ready to be connected to cart, wishlist, reorder and checkout actions.
            </p>

            <div className="mt-5 rounded-2xl border bg-muted/40 p-4 text-left text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">
                Planned actions
              </div>

              <div className="mt-2 space-y-1">
                <div>• Add products to cart</div>
                <div>• Update cart quantities</div>
                <div>• Manage wishlist</div>
                <div>• Reorder previous items</div>
                <div>• Build smart baskets</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}