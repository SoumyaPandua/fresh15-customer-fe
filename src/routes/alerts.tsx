import { createFileRoute, Link } from "@/lib/next-router-compat";
import { BellRing, Mail, Tag, Trash2 } from "lucide-react";
import {
  useProductAlerts,
  productIdOfAlert,
  productSnapshotOfAlert,
  useRemoveProductAlert,
  type ProductAlert,
} from "@/lib/product-alert-api";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Skeletons";
import { useAuth } from "@/lib/store/auth";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "My Alerts — Fresh15" },
      {
        name: "description",
        content: "Manage your Fresh15 back-in-stock and price-drop alerts.",
      },
    ],
  }),
  component: AlertsPage,
});

function AlertRow({ alert }: { alert: ProductAlert }) {
  const product = productSnapshotOfAlert(alert);
  const productId = productIdOfAlert(alert);
  const remove = useRemoveProductAlert(productId);

  if (!product) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
      <Link
        to="/product/$id"
        params={{ id: productId }}
        className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted"
      >
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name ?? "Product"}
            className="h-full w-full object-cover"
          />
        ) : (
          <BellRing className="h-5 w-5 text-muted-foreground" />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          to="/product/$id"
          params={{ id: productId }}
          className="line-clamp-1 text-sm font-semibold hover:text-primary"
        >
          {product.name ?? "Product"}
        </Link>

        <div className="mt-1 text-xs text-muted-foreground">
          Current price:{" "}
          <span className="font-semibold text-foreground">
            {inr(Number(product.sellingPrice ?? 0))}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {alert.backInStock && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
              <BellRing className="h-3 w-3" />
              Back in stock
            </span>
          )}

          {alert.priceDrop && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-[10px] font-semibold text-success">
              <Tag className="h-3 w-3" />
              Price drop
              {alert.targetPrice != null
                ? ` · ${inr(alert.targetPrice)} target`
                : ""}
            </span>
          )}

          {alert.emailEnabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
              <Mail className="h-3 w-3" />
              Email
            </span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Remove alert for ${product.name ?? "product"}`}
        onClick={() => remove.mutate()}
        disabled={remove.isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AlertsPage() {
  const token = useAuth((state) => state.token);
  const query = useProductAlerts();

  return (
    <AppLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          My alerts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stay ahead of restocks and meaningful price drops.
        </p>
      </div>

      {!token ? (
        <EmptyState
          emoji="🔔"
          title="Sign in to manage alerts"
          description="Save product alerts and we’ll notify you when something changes."
          cta={{ to: "/auth/login", label: "Log in" }}
        />
      ) : query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-24 w-full rounded-2xl"
            />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState
          emoji="⚠️"
          title="Couldn't load your alerts"
          description={query.error instanceof Error ? query.error.message : "Please try again."}
          cta={{ to: "/", label: "Continue shopping" }}
        />
      ) : query.data && query.data.length > 0 ? (
        <div className="space-y-2">
          {query.data.map((alert) => (
            <AlertRow key={alert._id} alert={alert} />
          ))}
        </div>
      ) : (
        <EmptyState
          emoji="🔔"
          title="No product alerts yet"
          description="Open a product and turn on back-in-stock or price-drop alerts."
          cta={{ to: "/", label: "Browse groceries" }}
        />
      )}
    </AppLayout>
  );
}
