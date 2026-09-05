import { createFileRoute, Link } from "@/lib/next-router-compat";
import { useQuery } from "@tanstack/react-query";
import { Package, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Skeletons";
import { orderApi } from "@/lib/order-api";
import { useAuth } from "@/lib/store/auth";
import { inr } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Order } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ReorderSection } from "@/components/common/ReorderSection";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My orders — Fresh15" },
      { name: "description", content: "Track active, delivered and cancelled orders." },
      { property: "og:title", content: "My orders — Fresh15" },
      { property: "og:description", content: "Track your Fresh15 orders." },
    ],
  }),
  component: OrdersPage,
});

const statusLabel: Record<Order["status"], { label: string; className: string }> = {
  placed: { label: "Placed", className: "bg-warning/15 text-warning-foreground" },
  packed: { label: "Packed", className: "bg-warning/15 text-warning-foreground" },
  out_for_delivery: { label: "Out for delivery", className: "bg-primary/15 text-primary" },
  delivered: { label: "Delivered", className: "bg-success/15 text-success" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
};

function OrdersPage() {
  const token = useAuth((s) => s.token);

  const q = useQuery({
    queryKey: ["orders", token ?? "guest"],
    queryFn: () => orderApi.list(token),
    enabled: Boolean(token),
  });

  const orders = q.data ?? [];

  const active = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  );
  const delivered = orders.filter((o) => o.status === "delivered");
  const cancelled = orders.filter((o) => o.status === "cancelled");

  return (
    <AppLayout>
      <h1 className="mb-4 text-2xl font-black tracking-tight sm:text-3xl">
        My orders
      </h1>

      {/* Primary navigation: Orders first/default, Buy again second. */}
      <Tabs defaultValue="orders" className="space-y-5">
        <TabsList className="grid w-full grid-cols-2 sm:w-full">
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="buy-again">Buy again</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-0">
          {/* Order status filters remain inside the Orders tab. */}
          <Tabs defaultValue="active">
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
              <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
              <TabsTrigger value="delivered">
                Delivered ({delivered.length})
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                Cancelled ({cancelled.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4">
              <OrdersList
                list={active}
                loading={q.isLoading}
                emptyTitle="No active orders"
              />
            </TabsContent>

            <TabsContent value="delivered" className="mt-4">
              <OrdersList
                list={delivered}
                loading={q.isLoading}
                emptyTitle="Nothing delivered yet"
              />
            </TabsContent>

            <TabsContent value="cancelled" className="mt-4">
              <OrdersList
                list={cancelled}
                loading={q.isLoading}
                emptyTitle="No cancelled orders"
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="buy-again" className="mt-0">
          <ReorderSection />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function OrdersList({
  list,
  loading,
  emptyTitle,
}: {
  list: Order[];
  loading: boolean;
  emptyTitle: string;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <EmptyState
        emoji="📦"
        title={emptyTitle}
        description="Once you place an order, it will appear here."
        cta={{ to: "/", label: "Start shopping" }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {list.map((o) => (
        <Link
          key={o.id}
          to="/orders/$id"
          params={{ id: o.id }}
          className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-card"
        >
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-muted">
            <Package className="h-6 w-6 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="text-sm font-bold">
                Order #{o.orderNumber ?? o.id}
              </div>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-[10px] font-bold " +
                  statusLabel[o.status].className
                }
              >
                {statusLabel[o.status].label}
              </span>
            </div>

            <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {o.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}
            </div>

            <div className="mt-1 flex items-center gap-3 text-xs">
              <span className="font-semibold">{inr(o.total)}</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(o.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}
