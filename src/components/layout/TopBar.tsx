import {
  Link,
  useLocation as useRouterLocation,
  useNavigate,
} from "@/lib/next-router-compat";
import {
  Bell,
  Heart,
  MapPin,
  Package,
  Search,
  ShoppingCart,
  Tag,
  Info,
  User,
  ChevronDown,
} from "lucide-react";
import { useCartBook } from "@/lib/hooks/use-cart-book";
import { useLocation } from "@/lib/store/location";
import { useAddressBook } from "@/lib/hooks/use-address-book";
import { useAuth } from "@/lib/store/auth";
import { useWishlistBook } from "@/lib/hooks/use-wishlist-book";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useEffect, useState } from "react";
import {
  checkServiceability,
  type ServiceabilityResult,
} from "@/lib/serviceability-api";
import { useServiceability } from "@/lib/store/serviceability";

const iconMap = {
  order: Package,
  offer: Tag,
  system: Info,
} as const;

export function TopBar() {
  const cartCount = useCartBook().totals.count;

  const { city, pincode } = useLocation();

  const {
    addresses,
    activeAddressId,
    setActive,
  } = useAddressBook();

  const active = addresses.find(
    (a) => a.id === activeAddressId,
  );

  /*
   * IMPORTANT:
   *
   * Do not use the global/mock pincode from useLocation() when an
   * authenticated customer has a selected saved address.
   *
   * Previously the address could be 411057 while the header and
   * serviceability flow still used the old 411001 value.
   */
  const activePincode =
    active?.pincode?.trim() || pincode;

  const activeCity =
    active?.city?.trim() || city;

  const setServiceability = useServiceability(
    (s) => s.set,
  );

  const [serviceability, setServiceabilityView] =
    useState<ServiceabilityResult | null>(null);

  /*
   * Every time the active address changes:
   *
   * 1. Immediately invalidate the previous serviceability snapshot.
   * 2. Check serviceability using the NEW address.
   * 3. Update the shared serviceability store.
   *
   * This prevents a previous address such as 411001 from being reused
   * while the user has selected 411057.
   */
  useEffect(() => {
    let cancelled = false;

    if (!active) {
      setServiceabilityView(null);

      setServiceability({
        addressKey: "",
        serviceable: false,
      });

      return () => {
        cancelled = true;
      };
    }

    /*
     * Clear the previous address result immediately.
     *
     * Cart/checkout therefore cannot temporarily use the previous
     * address's delivery fee/minimum order while the new request runs.
     */
    setServiceability({
      addressKey: active.id,
      serviceable: false,
    });

    void checkServiceability({
      pincode: active.pincode,
      latitude: active.latitude,
      longitude: active.longitude,
    })
      .then((result) => {
        if (cancelled) return;

        setServiceabilityView(result);

        setServiceability({
          addressKey: active.id,
          serviceable: true,
          baseDeliveryFee: result.baseDeliveryFee,
          freeDeliveryAbove:
            result.freeDeliveryAbove,
          minOrder: result.minOrder,
          etaMinutes: result.etaMinutes,
          storeName: result.store.name,
          storeDistanceKm:
            result.store.distanceKm,
          zoneName: result.zone.name,
        });
      })
      .catch(() => {
        if (cancelled) return;

        setServiceabilityView(null);

        setServiceability({
          addressKey: active.id,
          serviceable: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    active?.id,
    active?.pincode,
    active?.latitude,
    active?.longitude,
    setServiceability,
  ]);

  const { user, isGuest } = useAuth();

  const wishCount =
    useWishlistBook().count;

  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [notifOpen, setNotifOpen] =
    useState(false);

  const routerLoc = useRouterLocation();

  const hideSearch =
    routerLoc.pathname === "/search";

  const notif = useNotifications();

  const unreadCount =
    notif.unreadCount;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 glass">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-3 sm:gap-4 sm:px-6">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2"
        >
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-soft">
            <span className="text-lg font-black">
              F
            </span>
          </div>

          <div className="hidden leading-tight sm:block">
            <div className="text-base font-black tracking-tight text-foreground">
              Fresh15
            </div>

            <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              15 min delivery
            </div>
          </div>
        </Link>

        <Popover>
          <PopoverTrigger asChild>
            <button className="flex min-w-0 shrink items-center gap-1.5 rounded-xl px-2 py-1.5 text-left hover:bg-muted">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />

              <div className="min-w-0 leading-tight">
                <div className="truncate text-xs font-semibold text-foreground sm:text-sm">
                  {active?.label ?? "Deliver to"} ·{" "}
                  {activePincode}
                </div>

                <div className="truncate text-[11px] text-muted-foreground">
                  {active
                    ? active.line1
                    : activeCity}
                </div>
              </div>

              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className="w-72 p-2"
          >
            <div className="mb-2 px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Saved addresses
            </div>

            {serviceability ? (
              <div className="mb-2 rounded-lg border border-primary/20 bg-primary/5 p-2">
                <div className="text-xs font-semibold text-foreground">
                  {serviceability.etaMinutes
                    ? `${serviceability.etaMinutes} min delivery`
                    : "Delivery available"}
                </div>

                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {serviceability.store.name}

                  {serviceability.store
                    .distanceKm != null
                    ? ` · ${serviceability.store.distanceKm.toFixed(1)} km`
                    : ""}

                  {` · ${
                    serviceability.deliveryFee ===
                    0
                      ? "Free delivery"
                      : `₹${serviceability.deliveryFee} delivery`
                  }`}
                </div>

                {serviceability.minOrder >
                  0 && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Minimum order ₹
                    {serviceability.minOrder}
                  </div>
                )}
              </div>
            ) : active ? (
              <div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-300">
                Checking delivery availability…
              </div>
            ) : null}

            <div className="space-y-1">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  onClick={() =>
                    void setActive(a.id).catch(
                      () => undefined,
                    )
                  }
                  className={
                    "block w-full rounded-lg p-2 text-left text-sm hover:bg-muted " +
                    (a.id === activeAddressId
                      ? "bg-muted"
                      : "")
                  }
                >
                  <div className="font-semibold">
                    {a.label}
                  </div>

                  <div className="line-clamp-1 text-xs text-muted-foreground">
                    {a.line1}, {a.city}
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    {a.pincode}
                  </div>
                </button>
              ))}
            </div>

            <Link
              to="/addresses"
              className="mt-2 block rounded-lg bg-primary/10 p-2 text-center text-sm font-semibold text-primary hover:bg-primary/15"
            >
              Manage addresses
            </Link>
          </PopoverContent>
        </Popover>

        {!hideSearch && (
          <form
            className="ml-2 hidden flex-1 md:block"
            onSubmit={(e) => {
              e.preventDefault();

              navigate({
                to: "/search",
                search: { q },
              });
            }}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={q}
                onChange={(e) =>
                  setQ(e.target.value)
                }
                placeholder='Search "milk", "bread", "mangoes"…'
                className="h-10 rounded-full border-transparent bg-muted pl-9"
              />
            </div>
          </form>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            to="/search"
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted md:hidden"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Link>

          <button
            onClick={() => setNotifOpen(true)}
            className="relative hidden h-9 w-9 place-items-center rounded-full hover:bg-muted sm:grid"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />

            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-2.5 w-2.5 place-items-center rounded-full bg-destructive ring-2 ring-background" />
            )}
          </button>

          <Link
            to="/wishlist"
            className="relative hidden h-9 w-9 place-items-center rounded-full hover:bg-muted sm:grid"
            aria-label="Wishlist"
          >
            <Heart className="h-4 w-4" />

            {wishCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white ring-2 ring-background">
                {wishCount}
              </span>
            )}
          </Link>

          <ThemeToggle />

          <Link
            to={
              user || isGuest
                ? "/profile"
                : "/auth/login"
            }
            className="hidden h-9 w-9 place-items-center rounded-full hover:bg-muted sm:grid"
            aria-label="Profile"
          >
            <User className="h-4 w-4" />
          </Link>

          <Link
            to="/cart"
            className="relative inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 active:scale-95 sm:px-4"
          >
            <ShoppingCart className="h-4 w-4" />

            <span className="hidden sm:inline">
              Cart
            </span>

            {cartCount > 0 && (
              <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-white/25 px-1 text-[11px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <Dialog
        open={notifOpen}
        onOpenChange={setNotifOpen}
      >
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Bell className="h-4 w-4 text-primary" />

              Notifications

              {unreadCount > 0 && (
                <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount} new
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto p-3">
            {notif.notifications.length >
            0 ? (
              <div className="space-y-2">
                {notif.notifications.map(
                  (n) => {
                    const Icon =
                      iconMap[n.icon];

                    return (
                      <button
                        key={n.id}
                        onClick={() => {
                          if (!n.read) {
                            notif.markRead.mutate(
                              n.id,
                            );
                          }

                          if (n.orderId) {
                            setNotifOpen(false);

                            void navigate({
                              to: "/orders/$id",
                              params: {
                                id: n.orderId,
                              },
                            });
                          }
                        }}
                        className={
                          "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition " +
                          (n.read
                            ? "bg-card"
                            : "border-primary/30 bg-primary/5")
                        }
                      >
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold">
                              {n.title}
                            </div>

                            {!n.read && (
                              <span className="h-2 w-2 rounded-full bg-destructive" />
                            )}
                          </div>

                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {n.body}
                          </div>

                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {n.time}
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No notifications yet.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t px-5 py-3">
            {unreadCount > 0 ? (
              <button
                onClick={() =>
                  notif.markAllRead.mutate()
                }
                disabled={
                  notif.markAllRead.isPending
                }
                className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                Mark all read
              </button>
            ) : (
              <span />
            )}

            <Link
              to="/notifications"
              onClick={() => setNotifOpen(false)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all →
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}