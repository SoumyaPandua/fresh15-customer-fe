"use client";

import { createFileRoute, Link } from "@/lib/next-router-compat";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCcw,
  Search,
  XCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuth } from "@/lib/store/auth";
import {
  createRefundRequest,
  getMyRefund,
  getMyRefunds,
  type CustomerRefund,
  type RefundStatus,
} from "@/lib/refund-api";
import { inr } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refunds — Fresh15" },
      {
        name: "description",
        content: "View, request and track all Fresh15 refunds.",
      },
    ],
  }),
  component: RefundsPage,
});

const STATUS_OPTIONS: Array<{ value: "ALL" | RefundStatus; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "REQUESTED", label: "Requested" },
  { value: "APPROVED", label: "Approved" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PROCESSED", label: "Processed" },
  { value: "MANUAL_REQUIRED", label: "Manual settlement" },
  { value: "FAILED", label: "Failed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "REVERSED", label: "Reversed" },
];

const ACTIVE = new Set<RefundStatus>(["REQUESTED", "APPROVED", "PROCESSING", "MANUAL_REQUIRED"]);

const statusLabel = (status: RefundStatus) =>
  status.toLowerCase().replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());

const statusClass = (status: RefundStatus) => {
  if (status === "PROCESSED") return "bg-success/10 text-success";
  if (status === "FAILED" || status === "REJECTED" || status === "REVERSED") return "bg-destructive/10 text-destructive";
  return "bg-warning/10 text-warning";
};

function RefundsPage() {
  const token = useAuth((state) => state.token);
  const [filter, setFilter] = useState<"ALL" | RefundStatus>("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const refundsQuery = useQuery({
    queryKey: ["customer-refunds", token],
    enabled: Boolean(token),
    queryFn: async () => (await getMyRefunds(token)).data,
    staleTime: 15_000,
  });

  const detailQuery = useQuery({
    queryKey: ["customer-refund", token, selectedId],
    enabled: Boolean(token && selectedId),
    queryFn: async () => (await getMyRefund(token, selectedId!)).data,
    staleTime: 15_000,
  });

  const refunds = refundsQuery.data ?? [];

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return refunds.filter((refund) => {
      const matchesStatus = filter === "ALL" || refund.status === filter;
      const haystack = [
        refund.orderId?.orderNumber,
        refund.orderId?._id,
        refund._id,
        refund.reason,
        refund.razorpayRefundId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [filter, refunds, search]);

  const summary = useMemo(() => ({
    total: refunds.length,
    active: refunds.filter((r) => ACTIVE.has(r.status)).length,
    processed: refunds.filter((r) => r.status === "PROCESSED").length,
    refundedAmount: refunds
      .filter((r) => r.status === "PROCESSED")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0),
  }), [refunds]);

  if (!token) {
    return (
      <AppLayout>
        <EmptyState
          emoji="🔐"
          title="Login required"
          description="Please log in to manage refunds."
          cta={{ to: "/auth/login", label: "Login" }}
        />
      </AppLayout>
    );
  }

  const submit = async () => {
    if (!orderId.trim() || !amount || !reason.trim()) {
      toast.error("Order ID, amount and reason are required.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid refund amount.");
      return;
    }
    try {
      setBusy(true);
      await createRefundRequest(token, {
        orderId: orderId.trim(),
        amount: Number(parsedAmount.toFixed(2)),
        reason: reason.trim(),
      });
      toast.success("Refund request submitted.");
      setOrderId("");
      setAmount("");
      setReason("");
      await refundsQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit refund request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Refunds & returns</h1>
            <p className="mt-1 text-sm text-muted-foreground">View every refund, understand its status and track the money back to your payment method.</p>
          </div>
          <button type="button" onClick={() => void refundsQuery.refetch()} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold">
            <RefreshCcw className={`h-4 w-4 ${refundsQuery.isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Summary label="All refunds" value={summary.total} />
          <Summary label="In progress" value={summary.active} />
          <Summary label="Completed" value={summary.processed} />
          <Summary label="Returned to you" value={inr(summary.refundedAmount)} />
        </div>

        <div className="rounded-3xl border bg-surface-elevated p-5">
          <div className="mb-3 text-sm font-bold">Find a refund</div>
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order number, refund ID or reason" className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none" />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value as "ALL" | RefundStatus)} className="h-10 rounded-xl border bg-background px-3 text-sm">
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>

        <div className="rounded-3xl border bg-surface-elevated p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold">Your refund history</div>
              <div className="text-xs text-muted-foreground">{filtered.length} result{filtered.length === 1 ? "" : "s"}</div>
            </div>
          </div>

          {refundsQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((x) => <div key={x} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : refundsQuery.isError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm">
              <div className="font-bold">Couldn’t load your refunds</div>
              <div className="mt-1 text-muted-foreground">{refundsQuery.error instanceof Error ? refundsQuery.error.message : "Please try again."}</div>
              <button type="button" onClick={() => void refundsQuery.refetch()} className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-background p-8 text-center text-sm text-muted-foreground">
              {refunds.length === 0 ? "You do not have any refunds yet." : "No refunds match your search or filter."}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((refund) => (
                <RefundCard key={refund._id} refund={refund} selected={selectedId === refund._id} onSelect={() => setSelectedId(selectedId === refund._id ? null : refund._id)} />
              ))}
            </div>
          )}
        </div>

        {selectedId && (
          <RefundDetails
            refund={detailQuery.data ?? refunds.find((r) => r._id === selectedId) ?? null}
            loading={detailQuery.isLoading}
            onClose={() => setSelectedId(null)}
          />
        )}

        <div className="rounded-3xl border bg-surface-elevated p-5">
          <div className="mb-1 text-sm font-bold">Need a refund for another eligible order?</div>
          <div className="mb-4 text-xs text-muted-foreground">Refunds are available for eligible delivered or cancelled paid orders. The amount cannot exceed the remaining refundable balance.</div>
          <div className="grid gap-3">
            <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Order ID" className="rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Refund amount" inputMode="decimal" className="rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell us what went wrong" maxLength={500} rows={4} className="rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
            <button type="button" disabled={busy} onClick={() => void submit()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
              {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Submit refund request"}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Summary({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl border bg-surface-elevated p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-xl font-black">{value}</div></div>;
}

function RefundCard({ refund, selected, onSelect }: { refund: CustomerRefund; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`w-full rounded-2xl border p-4 text-left transition hover:bg-muted/40 ${selected ? "border-primary ring-2 ring-primary/10" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold">{refund.orderId?.orderNumber ?? refund.orderId?._id ?? "Order"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{new Date(refund.createdAt).toLocaleString("en-IN")}</div>
        </div>
        <div className="text-right">
          <div className="text-base font-black">{inr(refund.amount)}</div>
          <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusClass(refund.status)}`}>{statusLabel(refund.status)}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{refund.reason}</span>
        {refund.razorpayRefundId && <span>Refund ID: {refund.razorpayRefundId}</span>}
      </div>
    </button>
  );
}

function RefundDetails({ refund, loading, onClose }: { refund: CustomerRefund | null; loading: boolean; onClose: () => void }) {
  if (loading && !refund) return <div className="h-64 animate-pulse rounded-3xl bg-muted" />;
  if (!refund) return null;

  const history = refund.statusHistory?.length
    ? refund.statusHistory
    : [{ status: "REQUESTED" as RefundStatus, at: refund.createdAt }, ...(refund.processedAt && refund.status !== "REQUESTED" ? [{ status: refund.status, at: refund.processedAt }] : [])];

  return (
    <section className="rounded-3xl border bg-surface-elevated p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Refund details</div>
          <h2 className="mt-1 text-xl font-black">{inr(refund.amount)} · {statusLabel(refund.status)}</h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl border px-3 py-1.5 text-xs font-semibold">Close</button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-background p-4">
          <div className="text-xs text-muted-foreground">Order</div>
          <div className="mt-1 font-bold">{refund.orderId?.orderNumber ?? refund.orderId?._id ?? "—"}</div>
          {refund.orderId?._id && <a href={`/orders/${refund.orderId._id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">View order <ExternalLink className="h-3 w-3" /></a>}
        </div>
        <div className="rounded-2xl bg-background p-4">
          <div className="text-xs text-muted-foreground">Payment</div>
          <div className="mt-1 font-bold">{refund.orderId?.paymentMethod ?? "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">Refunds are returned to the original payment source for online payments.</div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-background p-4">
        <div className="mb-4 text-sm font-bold">Refund timeline</div>
        <div className="space-y-4">
          {history.map((event, index) => {
            const isLast = index === history.length - 1;
            return <div key={`${event.status}-${event.at}-${index}`} className="relative flex gap-3">
              <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${event.status === "PROCESSED" ? "bg-success/10 text-success" : event.status === "FAILED" || event.status === "REJECTED" || event.status === "REVERSED" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                {event.status === "PROCESSED" ? <CheckCircle2 className="h-4 w-4" /> : event.status === "FAILED" || event.status === "REJECTED" || event.status === "REVERSED" ? <XCircle className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{statusLabel(event.status)}</div>
                <div className="text-xs text-muted-foreground">{new Date(event.at).toLocaleString("en-IN")}</div>
                {!isLast && <div className="mt-3 h-px bg-border" />}
              </div>
            </div>;
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <Info label="Reason" value={refund.reason} />
        <Info label="Refund reference" value={refund.razorpayRefundId ?? refund.manualReference ?? refund._id} copy />
        {refund.rejectionReason && <Info label="Why it was rejected/failed" value={refund.rejectionReason} />}
        {refund.processedAt && <Info label="Processed at" value={new Date(refund.processedAt).toLocaleString("en-IN")} />}
      </div>
    </section>
  );
}

function Info({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  const copyValue = async () => {
    try { await navigator.clipboard.writeText(value); toast.success("Copied"); } catch { toast.error("Could not copy"); }
  };
  return <div className="rounded-2xl border p-3"><div className="text-muted-foreground">{label}</div><div className="mt-1 flex items-center justify-between gap-2 font-semibold"><span className="break-all">{value}</span>{copy && <button type="button" onClick={() => void copyValue()} aria-label={`Copy ${label}`}><Copy className="h-3.5 w-3.5 text-muted-foreground" /></button>}</div></div>;
}
