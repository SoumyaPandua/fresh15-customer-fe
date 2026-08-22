import { createFileRoute, useNavigate } from "@/lib/next-router-compat";
import { Bell, Package, Tag, Info, CheckCheck, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Skeletons";
import { useNotifications } from "@/lib/hooks/use-notifications";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Fresh15" },
      { name: "description", content: "Order updates and offers." },
      { property: "og:title", content: "Notifications — Fresh15" },
      { property: "og:description", content: "Order updates and offers." },
    ],
  }),
  component: NotifPage,
});

const iconMap = { order: Package, offer: Tag, system: Info } as const;

function NotifPage() {
  const { isAuthed, notifications, unreadCount, isLoading, markRead, markAllRead, remove } = useNotifications();
  const navigate = useNavigate();

  function open(id: string, read: boolean, orderId?: string) {
    if (!read) markRead.mutate(id);
    if (orderId) void navigate({ to: "/orders/$id", params: { id: orderId } });
  }

  return (
    <AppLayout>
      <div className="mb-4 flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border bg-surface-elevated px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      ) : !isAuthed ? (
        <EmptyState emoji="🔔" title="Sign in for updates" description="Log in to see your order updates and offers." cta={{ to: "/auth/login", label: "Log in" }} />
      ) : notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = iconMap[n.icon];
            return (
              <div key={n.id} className={"flex items-start gap-3 rounded-2xl border p-4 transition " + (n.read ? "bg-card" : "bg-primary/5 border-primary/30")}>
                <button
                  onClick={() => open(n.id, n.read, n.orderId)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm">{n.title}</div>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{n.body}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{n.time}</div>
                  </div>
                </button>
                <button
                  onClick={() => remove.mutate(n.id)}
                  disabled={remove.isPending}
                  aria-label="Delete notification"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState emoji="🔔" title="No notifications" description="We'll let you know about order updates and offers." cta={{ to: "/", label: "Continue shopping" }} />
      )}
    </AppLayout>
  );
}
