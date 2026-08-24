"use client";

import { createFileRoute, Link } from "@/lib/next-router-compat";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  History,
  Loader2,
  RefreshCcw,
  Search,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuth } from "@/lib/store/auth";
import {
  createRefundRequest,
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
        content: "Request and track Fresh15 refunds.",
      },
    ],
  }),
  component: RefundsPage,
});

const STATUS_LABELS: Record<RefundStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  PROCESSING: "Processing",
  PROCESSED: "Processed",
  FAILED: "Failed",
  REJECTED: "Rejected",
  MANUAL_REQUIRED: "Manual action required",
  REVERSED: "Reversed",
};

const STATUS_CLASS: Record<RefundStatus, string> = {
  REQUESTED: "bg-amber-500/10 text-amber-700",
  APPROVED: "bg-blue-500/10 text-blue-700",
  PROCESSING: "bg-blue-500/10 text-blue-700",
  PROCESSED: "bg-green-500/10 text-green-700",
  FAILED: "bg-red-500/10 text-red-700",
  REJECTED: "bg-red-500/10 text-red-700",
  MANUAL_REQUIRED: "bg-orange-500/10 text-orange-700",
  REVERSED: "bg-purple-500/10 text-purple-700",
};

function RefundsPage() {
  const token = useAuth((state) => state.token);

  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | RefundStatus>(
    "ALL",
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refundsQuery = useQuery<CustomerRefund[]>({
    queryKey: ["customer-refunds", token],
    enabled: Boolean(token),
    queryFn: () => getMyRefunds(token),
    staleTime: 15_000,
  });

  const refunds = refundsQuery.data ?? [];

  const filteredRefunds = useMemo(() => {
    const term = search.trim().toLowerCase();

    return refunds.filter((refund: CustomerRefund) => {
      const matchesStatus =
        statusFilter === "ALL" || refund.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      const orderNumber =
        refund.orderId?.orderNumber ??
        refund.orderId?._id ??
        "";

      const searchable = [
        orderNumber,
        refund._id,
        refund.reason,
        refund.razorpayRefundId ?? "",
        refund.manualReference ?? "",
        refund.status,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [refunds, search, statusFilter]);

  const summary = useMemo(() => {
    const total = refunds.length;

    const processing = refunds.filter(
      (refund: CustomerRefund) =>
        refund.status === "REQUESTED" ||
        refund.status === "APPROVED" ||
        refund.status === "PROCESSING" ||
        refund.status === "MANUAL_REQUIRED",
    ).length;

    const completed = refunds.filter(
      (refund: CustomerRefund) => refund.status === "PROCESSED",
    ).length;

    const failed = refunds.filter(
      (refund: CustomerRefund) =>
        refund.status === "FAILED" ||
        refund.status === "REJECTED" ||
        refund.status === "REVERSED",
    ).length;

    const returnedAmount = refunds
      .filter(
        (refund: CustomerRefund) => refund.status === "PROCESSED",
      )
      .reduce(
        (sum: number, refund: CustomerRefund) =>
          sum + Number(refund.amount || 0),
        0,
      );

    return {
      total,
      processing,
      completed,
      failed,
      returnedAmount,
    };
  }, [refunds]);

  if (!token) {
    return (
      <AppLayout>
        <EmptyState
          emoji="🔐"
          title="Login required"
          description="Please log in to manage refunds."
          cta={{
            to: "/auth/login",
            label: "Login",
          }}
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
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            Refunds
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Request refunds and track all your refund activity in one place.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="All refunds"
            value={summary.total}
          />

          <SummaryCard
            label="In progress"
            value={summary.processing}
          />

          <SummaryCard
            label="Completed"
            value={summary.completed}
          />

          <SummaryCard
            label="Returned"
            value={inr(summary.returnedAmount)}
          />
        </div>

        <div className="rounded-3xl border bg-surface-elevated p-5">
          <div className="mb-4 text-sm font-bold">
            Request a refund
          </div>

          <div className="grid gap-3">
            <input
              value={orderId}
              onChange={(event) =>
                setOrderId(event.target.value)
              }
              placeholder="Order ID"
              className="rounded-xl border bg-background px-3 py-2 text-sm outline-none"
            />

            <input
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              placeholder="Refund amount"
              inputMode="decimal"
              className="rounded-xl border bg-background px-3 py-2 text-sm outline-none"
            />

            <textarea
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold">
                Refund history
              </div>

              <div className="text-xs text-muted-foreground">
                View every refund request and its current status.
              </div>
            </div>

            <button
              type="button"
              disabled={refundsQuery.isFetching}
              onClick={() => void refundsQuery.refetch()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-60"
            >
              <RefreshCcw
                className={`h-3.5 w-3.5 ${
                  refundsQuery.isFetching
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search order, refund ID or reason"
                className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "ALL" | RefundStatus,
                )
              }
              className="h-10 rounded-xl border bg-background px-3 text-sm outline-none"
            >
              <option value="ALL">All statuses</option>

              {Object.entries(STATUS_LABELS).map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="mt-4">
            {refundsQuery.isLoading ? (
              <div className="h-32 animate-pulse rounded-2xl bg-muted" />
            ) : refundsQuery.isError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center">
                <div className="text-sm font-semibold">
                  Couldn’t load your refunds
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  Please try again.
                </div>

                <button
                  type="button"
                  onClick={() => void refundsQuery.refetch()}
                  className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                >
                  Try again
                </button>
              </div>
            ) : filteredRefunds.length === 0 ? (
              <div className="rounded-2xl border bg-background p-8 text-center">
                <History className="mx-auto h-8 w-8 text-muted-foreground" />

                <div className="mt-3 text-sm font-bold">
                  {refunds.length === 0
                    ? "No refund requests yet"
                    : "No matching refunds"}
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  {refunds.length === 0
                    ? "Your refund activity will appear here."
                    : "Try changing your search or status filter."}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRefunds.map(
                  (refund: CustomerRefund) => {
                    const expanded =
                      expandedId === refund._id;

                    const orderNumber =
                      refund.orderId?.orderNumber ??
                      refund.orderId?._id ??
                      "Order";

                    return (
                      <div
                        key={refund._id}
                        className="overflow-hidden rounded-2xl border bg-background"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(
                              expanded
                                ? null
                                : refund._id,
                            )
                          }
                          className="w-full p-4 text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold">
                                  {orderNumber}
                                </span>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_CLASS[refund.status]}`}
                                >
                                  {STATUS_LABELS[refund.status]}
                                </span>
                              </div>

                              <div className="mt-1 text-xs text-muted-foreground">
                                Refund ID: {refund._id}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-sm font-black">
                                {inr(refund.amount)}
                              </div>

                              {expanded ? (
                                <ChevronUp className="ml-auto mt-1 h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="ml-auto mt-1 h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </button>

                        {expanded && (
                          <RefundDetails
                            refund={refund}
                          />
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function RefundDetails({
  refund,
}: {
  refund: CustomerRefund;
}) {
  const orderNumber =
    refund.orderId?.orderNumber ??
    refund.orderId?._id;

  return (
    <div className="border-t bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Detail
          label="Reason"
          value={refund.reason || "—"}
        />

        <Detail
          label="Requested"
          value={formatDate(refund.createdAt)}
        />

        <Detail
          label="Processed"
          value={
            refund.processedAt
              ? formatDate(refund.processedAt)
              : "Not processed yet"
          }
        />

        <Detail
          label="Payment method"
          value={
            refund.orderId?.paymentMethod ??
            "—"
          }
        />

        {refund.razorpayRefundId && (
          <Detail
            label="Razorpay refund ID"
            value={refund.razorpayRefundId}
          />
        )}

        {refund.manualReference && (
          <Detail
            label="Manual refund reference"
            value={refund.manualReference}
          />
        )}
      </div>

      {refund.rejectionReason && (
        <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
          <div className="text-xs font-bold text-destructive">
            Refund reason / rejection
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            {refund.rejectionReason}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border bg-background p-3">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold">
          <Clock className="h-3.5 w-3.5 text-primary" />
          Refund status
        </div>

        <RefundTimeline status={refund.status} />
      </div>

      {orderNumber && (
        <div className="mt-3">
          <Link
            to={`/orders/${orderNumber}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            View order
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

function RefundTimeline({
  status,
}: {
  status: RefundStatus;
}) {
  const steps: RefundStatus[] = [
    "REQUESTED",
    "APPROVED",
    "PROCESSING",
    "PROCESSED",
  ];

  if (
    status === "REJECTED" ||
    status === "FAILED" ||
    status === "REVERSED"
  ) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive" />

        <span className="text-xs font-semibold text-destructive">
          {STATUS_LABELS[status]}
        </span>
      </div>
    );
  }

  const currentIndex = steps.indexOf(status);

  return (
    <div className="space-y-2">
      {steps.map(
        (step: RefundStatus, index: number) => {
          const active = index <= currentIndex;

          return (
            <div
              key={step}
              className="flex items-center gap-2"
            >
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  active
                    ? "bg-primary"
                    : "bg-muted-foreground/25"
                }`}
              />

              <span
                className={`text-xs ${
                  active
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {STATUS_LABELS[step]}
              </span>
            </div>
          );
        },
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border bg-surface-elevated p-4">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 text-xl font-black">
        {typeof value === "number"
          ? value.toLocaleString("en-IN")
          : value}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="mt-0.5 break-words text-xs font-medium">
        {value}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}