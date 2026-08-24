"use client";

import { createFileRoute } from "@/lib/next-router-compat";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuth } from "@/lib/store/auth";
import { createRefundRequest, getMyRefunds } from "@/lib/refund-api";
import { inr } from "@/lib/format";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refunds — Fresh15" },
      {
        name: "description",
        content: "Request and track Fresh15 refunds.",
      },
    ],
  }),
  component: RefundsPage,
});

function RefundsPage() {
  const token = useAuth((state) => state.token);
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const refundsQuery = useQuery({
    queryKey: ["customer-refunds", token],
    enabled: Boolean(token),
    queryFn: () => getMyRefunds(token),
  });

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
        amount: parsedAmount,
        reason: reason.trim(),
      });
      toast.success("Refund request submitted.");
      setOrderId("");
      setAmount("");
      setReason("");
      await refundsQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not submit refund request.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            Refunds
          </h1>
          <p className="text-sm text-muted-foreground">
            Request a refund for an eligible delivered or cancelled order
            and track its status.
          </p>
        </div>

        <div className="rounded-3xl border bg-surface-elevated p-5">
          <div className="mb-4 text-sm font-bold">
            Request a refund
          </div>

          <div className="grid gap-3">
            <input
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              placeholder="Order ID"
              className="rounded-xl border bg-background px-3 py-2 text-sm outline-none"
            />

            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Refund amount"
              inputMode="decimal"
              className="rounded-xl border bg-background px-3 py-2 text-sm outline-none"
            />

            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason for refund"
              maxLength={500}
              rows={4}
              className="rounded-xl border bg-background px-3 py-2 text-sm outline-none"
            />

            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                "Submit refund request"
              )}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border bg-surface-elevated p-5">
          <div className="mb-4 text-sm font-bold">
            My refund requests
          </div>

          {refundsQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          ) : refundsQuery.data?.length ? (
            <div className="space-y-3">
              {refundsQuery.data.map((refund) => (
                <div
                  key={refund._id}
                  className="rounded-2xl border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {refund.orderId?.orderNumber ??
                        refund.orderId?._id ??
                        "Order"}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                      {refund.status
                        .toLowerCase()
                        .replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="mt-2 text-sm font-bold">
                    {inr(refund.amount)}
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground">
                    {refund.reason}
                  </div>

                  {refund.rejectionReason && (
                    <div className="mt-2 text-xs text-destructive">
                      {refund.rejectionReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No refund requests yet.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
