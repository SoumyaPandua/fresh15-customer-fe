"use client";
import { useState } from "react";
import { Bot, Loader2, Sparkles, Send } from "lucide-react";
import { useAuth } from "@/lib/store/auth";
import { sendAiAgent, type AgentResponse } from "@/lib/ai-agent-api";
import { toast } from "sonner";

export function Fresh15AiAgent() {
  const auth = useAuth;
  const token = auth.token;
  const [open,setOpen]=useState(false);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState<AgentResponse|null>(null);
  if (!token) return null;
  async function run(){ const text=input.trim(); if(!text||loading)return; setLoading(true); try{ const r=await sendAiAgent(token,text); setResult(r); setInput(""); }catch(e){toast.error(e instanceof Error?e.message:"AI agent unavailable");}finally{setLoading(false);} }
  return <>{!open&&<button type="button" onClick={()=>setOpen(true)} className="fixed bottom-[84px] right-5 z-[69] flex items-center gap-2 rounded-full border bg-background px-4 py-2.5 text-xs font-bold text-foreground shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl" aria-label="Open Fresh15 AI Agent"><Sparkles className="h-4 w-4 text-primary"/> AI Agent</button>}{open&&<div className="fixed bottom-20 right-5 z-[69] w-[min(390px,calc(100vw-32px))] overflow-hidden rounded-3xl border bg-background shadow-2xl"><div className="flex items-center justify-between border-b px-4 py-3"><div className="flex items-center gap-2 font-black"><Bot className="h-5 w-5 text-primary"/> AI Agent</div><button onClick={()=>setOpen(false)} className="rounded-full px-2 py-1 text-xs hover:bg-muted">Close</button></div><div className="max-h-[420px] overflow-y-auto p-4 overscroll-contain"><div className="rounded-2xl bg-muted p-3 text-sm">{result?.reply??"Tell me what you want Fresh15 to do. Actions that affect orders, payments or refunds require confirmation in the normal Fresh15 flow."}</div>{result?.actions?.length>0&&<div className="mt-3 space-y-2">{result.actions.map((a,i)=><div key={i} className="rounded-xl border p-2 text-xs">{a.success?`✓ ${a.tool}`:`✕ ${a.tool}: ${a.error||"failed"}`}</div>)}</div>}</div><form onSubmit={e=>{e.preventDefault();void run();}} className="flex gap-2 border-t p-3"><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Add, search, reorder..." className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm" maxLength={1200}/><button disabled={loading||!input.trim()} className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50">{loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Send className="h-4 w-4"/>}</button></form></div>}</>;
}
