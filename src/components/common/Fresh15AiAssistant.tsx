"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import { useCartBook } from "@/lib/hooks/use-cart-book";
import { useAuth } from "@/lib/store/auth";
import { askFresh15Assistant, type AiChatMessage } from "@/lib/ai-chat-api";
import { toast } from "sonner";

const QUICK_PROMPTS = [
  "Suggest a healthy breakfast basket",
  "What fruits are good for a family of 4?",
  "Help me complete my grocery cart",
];

export function Fresh15AiAssistant() {
  const token = useAuth((s) => s.token);
  const cart = useCartBook();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>([
    { role: "model", text: "Hi! I’m your Fresh15 Assistant. I can help you choose groceries, compare products, plan a basket, or find something quickly." },
  ]);
  const cartContext = useMemo(() => cart.items.slice(0, 20).map((x) => ({ name: x.name, qty: x.qty, price: x.price })), [cart.items]);

  async function send(text = input) {
    const message = text.trim();
    if (!message || loading) return;
    const next = [...messages, { role: "user", text: message } as AiChatMessage];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const result = await askFresh15Assistant({ message, history: next.slice(-8), cart: cartContext, token });
      setMessages((current) => [...current, { role: "model", text: result.reply }]);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "The assistant is temporarily unavailable.";
      toast.error(messageText);
      setMessages((current) => [...current, { role: "model", text: "I’m having trouble connecting right now. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send();
  }

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label="Open Fresh15 Assistant" className="fixed bottom-20 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg transition hover:scale-[1.02] sm:bottom-6">
          <Sparkles className="h-4 w-4" /> Fresh15 AI
        </button>
      )}

      {open && (
        <div className="fixed inset-x-3 bottom-20 z-50 flex max-h-[min(680px,calc(100dvh-6rem))] flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[390px]">
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground/15"><Bot className="h-5 w-5" /></div><div><div className="text-sm font-black">Fresh15 Assistant</div><div className="text-[11px] opacity-80">Smart grocery help</div></div></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-full p-2 hover:bg-primary-foreground/10"><X className="h-4 w-4" /></button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${message.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground"}`}>{message.text}</div>
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding the best answer…</div>}
          </div>

          {messages.length <= 1 && (
            <div className="flex gap-2 overflow-x-auto px-3 pb-2">
              {QUICK_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => void send(prompt)} className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-muted">{prompt}</button>)}
            </div>
          )}

          {cart.items.length > 0 && <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">I can also help with your current cart ({cart.totals.count} items).</div>}

          <form onSubmit={onSubmit} className="flex gap-2 border-t p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} disabled={loading} maxLength={1000} placeholder="Ask about groceries…" className="min-w-0 flex-1 rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send message" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
    </>
  );
}
