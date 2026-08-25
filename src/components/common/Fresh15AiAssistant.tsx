import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/store/auth";
import { sendAiMessage, type AiMessage } from "@/lib/ai-chat-api";
import { toast } from "sonner";

const starter: AiMessage[] = [{ role:"assistant", content:"Hi! I’m Fresh15 AI. I can help with products, offers, cart, orders, delivery, refunds, payments and grocery suggestions." }];

export function Fresh15AiAssistant() {
  const token = useAuth((s)=>s.token);
  const [open,setOpen]=useState(false);
  const [input,setInput]=useState("");
  const [messages,setMessages]=useState<AiMessage[]>(starter);
  const [conversationId,setConversationId]=useState<string>();
  const [loading,setLoading]=useState(false);
  const endRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages,loading]);
  if (!token) return null;

  async function submit() {
    const text=input.trim(); if(!text || loading) return;
    setInput(""); setMessages((m)=>[...m,{role:"user",content:text}]); setLoading(true);
    try { const r=await sendAiMessage(token,text,conversationId); setConversationId(r.conversationId); setMessages((m)=>[...m,{role:"assistant",content:r.reply,blocked:r.blocked}]); }
    catch(e){ toast.error(e instanceof Error?e.message:"AI assistant is unavailable"); }
    finally{setLoading(false);}
  }

  return <>
    {!open && <button type="button" aria-label="Open Fresh15 AI" onClick={()=>setOpen(true)} className="fixed bottom-24 right-4 z-[70] flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-xl sm:bottom-6"><Bot className="h-5 w-5"/> Fresh15 AI</button>}
    {open && <div className="fixed inset-x-3 bottom-4 z-[70] flex h-[min(680px,78dvh)] max-h-[78dvh] flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[390px]" onWheel={(e)=>e.stopPropagation()} onTouchMove={(e)=>e.stopPropagation()}>
      <div className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary"><Bot className="h-5 w-5"/></span><div><div className="font-black">Fresh15 AI</div><div className="flex items-center gap-1 text-[11px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5"/> Customer-only assistant</div></div></div><button type="button" onClick={()=>setOpen(false)} className="rounded-full p-2 hover:bg-muted"><X className="h-5 w-5"/></button></div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3" onWheel={(e)=>e.stopPropagation()} onTouchMove={(e)=>e.stopPropagation()}>
        <div className="space-y-3">{messages.map((m,i)=><div key={`${i}-${m.role}`} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role==="user"?"rounded-br-md bg-primary text-primary-foreground":"rounded-bl-md bg-muted"}`}>{m.content}</div></div>)}{loading&&<div className="flex justify-start"><div className="rounded-2xl bg-muted px-3 py-2"><Loader2 className="h-4 w-4 animate-spin"/></div></div>}<div ref={endRef}/></div>
      </div>
      <form onSubmit={(e)=>{e.preventDefault();void submit();}} className="shrink-0 border-t bg-card p-3"><div className="flex items-end gap-2"><textarea value={input} onChange={(e)=>setInput(e.target.value.slice(0,1200))} onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void submit();}}} rows={1} placeholder="Ask about Fresh15..." className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"/><button disabled={!input.trim()||loading} type="submit" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4"/></button></div><div className="mt-2 text-[10px] text-muted-foreground">Chats may be stored for support, safety and product improvement.</div></form>
    </div>}
  </>;
}
