"use client";
import { createFileRoute, Link } from "@/lib/next-router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Gift, History, Share2, Sparkles, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/store/auth";
import { loyaltyApi } from "@/lib/loyalty-api";
import { toast } from "sonner";

export const Route = createFileRoute("/loyalty")({ head: () => ({ meta: [{ title: "FreshPoints — Fresh15" }, { name: "description", content: "Earn FreshPoints, invite friends and save on future grocery orders." }] }), component: LoyaltyPage });

function LoyaltyPage() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const q = useQuery({ queryKey: ["loyalty", token], enabled: Boolean(token), queryFn: () => loyaltyApi.get(token), staleTime: 15_000 });
  if (!user || !token) return <AppLayout><div className="mx-auto max-w-md rounded-3xl border bg-card p-8 text-center"><Gift className="mx-auto h-10 w-10 text-primary"/><h1 className="mt-3 text-xl font-black">FreshPoints</h1><p className="mt-1 text-sm text-muted-foreground">Sign in to earn points and referral rewards.</p><Link to="/auth/login" className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Sign in</Link></div></AppLayout>;
  if (q.isLoading) return <AppLayout><div className="mx-auto h-64 max-w-4xl animate-pulse rounded-3xl border bg-card" /></AppLayout>;
  if (q.isError || !q.data) return <AppLayout><div className="mx-auto max-w-xl rounded-3xl border bg-card p-8 text-center"><p className="font-bold">Couldn’t load FreshPoints</p><button onClick={() => void q.refetch()} className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Try again</button></div></AppLayout>;
  const d = q.data;
  const shareText = `Join me on Fresh15. Use my referral code ${d.referral.code} before your first delivered order and we both unlock FreshPoints.`;
  async function copyCode() { await navigator.clipboard.writeText(d.referral.code); toast.success("Referral code copied"); }
  async function share() { if (navigator.share) await navigator.share({ title: "Fresh15 referral", text: shareText }); else { await navigator.clipboard.writeText(shareText); toast.success("Invite copied"); } }
  async function apply() { if (!code.trim()) return; setApplying(true); try { await loyaltyApi.applyReferral(token, code.trim()); setCode(""); await qc.invalidateQueries({ queryKey: ["loyalty"] }); toast.success("Referral code applied"); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not apply referral"); } finally { setApplying(false); } }
  return <AppLayout><div className="mx-auto max-w-4xl space-y-5">
    <div className="overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-card to-amber-500/10 p-6 sm:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"><Sparkles className="h-3.5 w-3.5"/> FreshPoints</div><div className="mt-4 text-4xl font-black tracking-tight">{d.wallet.balance.toLocaleString("en-IN")}</div><div className="text-sm text-muted-foreground">worth up to ₹{d.redemptionValueRupees.toFixed(2)}</div></div><div className="text-sm text-muted-foreground">Earn 1 point per ₹{d.rules.RUPEES_PER_EARN_POINT} on delivered orders. Redeem up to {d.rules.MAX_REDEMPTION_PERCENT}% of eligible order value.</div></div></div>
    <div className="grid gap-3 sm:grid-cols-3"><Stat label="Lifetime earned" value={d.wallet.lifetimeEarned} icon={<Sparkles className="h-4 w-4"/>}/><Stat label="Redeemed" value={d.wallet.lifetimeRedeemed} icon={<Gift className="h-4 w-4"/>}/><Stat label="Successful referrals" value={d.referral.successfulReferrals} icon={<Users className="h-4 w-4"/>}/></div>
    <section className="rounded-2xl border bg-card p-5"><h2 className="font-bold">Invite friends</h2><p className="mt-1 text-xs text-muted-foreground">Rewards unlock only after your friend’s first order is successfully delivered.</p><div className="mt-4 flex flex-wrap gap-2"><div className="rounded-xl bg-muted px-4 py-2 font-mono text-sm font-black tracking-wider">{d.referral.code}</div><button onClick={copyCode} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"><Copy className="h-4 w-4"/>Copy</button><button onClick={share} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Share2 className="h-4 w-4"/>Share invite</button></div></section>
    {!d.wallet.referredByUserId && <section className="rounded-2xl border bg-card p-5"><h2 className="font-bold">Have a referral code?</h2><p className="mt-1 text-xs text-muted-foreground">Apply it before your first delivered order.</p><div className="mt-3 flex gap-2"><input value={code} onChange={(e)=>setCode(e.target.value.toUpperCase())} placeholder="F15..." className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm uppercase"/><button disabled={applying || !code.trim()} onClick={apply} className="rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{applying ? "Applying…" : "Apply"}</button></div></section>}
    <section className="rounded-2xl border bg-card p-5"><h2 className="flex items-center gap-2 font-bold"><History className="h-4 w-4 text-primary"/>Points ledger</h2><div className="mt-3 divide-y">{d.ledger.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">Your FreshPoints activity will appear here.</div> : d.ledger.map((x)=><div key={x._id} className="flex items-center justify-between gap-3 py-3"><div><div className="text-sm font-semibold">{x.description || x.type.replaceAll("_", " ")}</div><div className="text-xs text-muted-foreground">{new Date(x.createdAt).toLocaleString("en-IN")}</div></div><div className={"font-black "+(x.points>=0?"text-success":"text-foreground")}>{x.points>=0?"+":""}{x.points}</div></div>)}</div></section>
  </div></AppLayout>;
}
function Stat({label,value,icon}:{label:string;value:number;icon:React.ReactNode}) { return <div className="rounded-2xl border bg-card p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><div className="mt-1 text-xl font-black">{value.toLocaleString("en-IN")}</div></div>; }
