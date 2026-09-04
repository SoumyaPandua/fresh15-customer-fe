import { useEffect, useState } from "react";
import { Link, useLocation as useRouterLocation, useNavigate } from "@/lib/next-router-compat";
import { Bell, Heart, MapPin, Package, Search, ShoppingCart, Tag, Info, User, ChevronDown } from "lucide-react";
import { useCartCount } from "@/lib/hooks/use-cart-book";
import { useAddressBook } from "@/lib/hooks/use-address-book";
import { useAuth } from "@/lib/store/auth";
import { useWishlistBook } from "@/lib/hooks/use-wishlist-book";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useServiceability } from "@/lib/store/serviceability";

const iconMap = { order: Package, offer: Tag, system: Info } as const;

export function TopBar() {
  const cartCount = useCartCount();
  const { addresses, activeAddressId, setActive, addressReady } = useAddressBook();
  const { user, isGuest } = useAuth();
  const active = addresses.find((address) => address.id === activeAddressId) ?? null;
  const service = useServiceability();
  const wishCount = useWishlistBook().count;
  const navigate = useNavigate();
  const routerLoc = useRouterLocation();
  const hideSearch = routerLoc.pathname === "/search";
  const notif = useNotifications();
  const [query, setQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (!addressReady && !isGuest) useServiceability.getState().clear();
  }, [addressReady, isGuest]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 glass">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-3 sm:gap-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-soft">
            <span className="text-lg font-black">F</span>
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-base font-black tracking-tight">Fresh15</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">15 min delivery</div>
          </div>
        </Link>

        <Popover>
          <PopoverTrigger asChild>
            <button className="flex min-w-0 shrink items-center gap-1.5 rounded-xl px-2 py-1.5 text-left hover:bg-muted">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 leading-tight">
                <div className="truncate text-xs font-semibold sm:text-sm">
                  {active?.label ?? "Deliver to"}{active?.pincode ? ` · ${active.pincode}` : ""}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {active?.line1 || active?.city || "Choose an address"}
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-2">
            <div className="mb-2 px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved addresses</div>
            {active && (
              <div className="mb-2 rounded-lg border border-primary/20 bg-primary/5 p-2 text-xs">
                <div className="font-semibold">
                  {service.isLoading
                    ? "Checking delivery availability…"
                    : service.serviceable
                      ? `${service.etaMinutes ?? ""}${service.etaMinutes ? " min delivery" : "Delivery available"}`
                      : "Delivery unavailable"}
                </div>
                {service.storeName && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {service.storeName}{service.storeDistanceKm != null ? ` · ${service.storeDistanceKm.toFixed(1)} km` : ""}
                  </div>
                )}
                {service.serviceable && service.minOrder > 0 && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">Minimum order ₹{service.minOrder}</div>
                )}
              </div>
            )}
            <div className="space-y-1">
              {addresses.map((address) => (
                <button
                  key={address.id}
                  onClick={() => void setActive(address.id)}
                  className={`block w-full rounded-lg p-2 text-left text-sm hover:bg-muted ${address.id === activeAddressId ? "bg-muted" : ""}`}
                >
                  <div className="font-semibold">{address.label}</div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">{address.line1}, {address.city}</div>
                  <div className="text-[11px] text-muted-foreground">{address.pincode}</div>
                </button>
              ))}
            </div>
            <Link to="/addresses" className="mt-2 block rounded-lg bg-primary/10 p-2 text-center text-sm font-semibold text-primary">Manage addresses</Link>
          </PopoverContent>
        </Popover>

        {!hideSearch && (
          <form
            className="ml-2 hidden flex-1 md:block"
            onSubmit={(event) => {
              event.preventDefault();
              void navigate({ to: "/search", search: { q: query } });
            }}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search "milk", "bread", "mangoes"…' className="h-10 rounded-full border-transparent bg-muted pl-9" />
            </div>
          </form>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Link to="/search" className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted md:hidden" aria-label="Search">
            <Search className="h-4 w-4" />
          </Link>
          <button onClick={() => setNotifOpen(true)} className="relative hidden h-9 w-9 place-items-center rounded-full hover:bg-muted sm:grid" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {notif.unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />}
          </button>
          <Link to="/wishlist" className="relative hidden h-9 w-9 place-items-center rounded-full hover:bg-muted sm:grid" aria-label="Wishlist">
            <Heart className="h-4 w-4" />
            {wishCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">{wishCount}</span>}
          </Link>
          <ThemeToggle />
          <Link to={user || isGuest ? "/profile" : "/auth/login"} className="hidden h-9 w-9 place-items-center rounded-full hover:bg-muted sm:grid" aria-label="Profile">
            <User className="h-4 w-4" />
          </Link>
          <Link to="/cart" className="relative inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-soft sm:px-4">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-white/25 px-1 text-[11px] font-bold">{cartCount}</span>}
          </Link>
        </div>
      </div>

      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b px-5 py-4"><DialogTitle className="flex items-center gap-2 text-base font-bold"><Bell className="h-4 w-4 text-primary" />Notifications</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-3">
            {notif.notifications.length ? notif.notifications.map((item) => {
              const Icon = iconMap[item.icon];
              return (
                <button key={item.id} onClick={() => { if (!item.read) notif.markRead.mutate(item.id); if (item.orderId) { setNotifOpen(false); void navigate({ to: "/orders/$id", params: { id: item.orderId } }); } }} className={`mb-2 flex w-full items-start gap-3 rounded-xl border p-3 text-left ${item.read ? "bg-card" : "border-primary/30 bg-primary/5"}`}>
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-primary"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{item.title}</div><div className="text-xs text-muted-foreground">{item.body}</div><div className="text-[10px] text-muted-foreground">{item.time}</div></div>
                </button>
              );
            }) : <div className="py-10 text-center text-sm text-muted-foreground">No notifications yet.</div>}
          </div>
          <div className="flex items-center justify-between border-t px-5 py-3">
            {notif.unreadCount > 0 ? <button onClick={() => notif.markAllRead.mutate()} className="text-xs font-semibold text-muted-foreground">Mark all read</button> : <span />}
            <Link to="/notifications" onClick={() => setNotifOpen(false)} className="text-xs font-semibold text-primary">View all →</Link>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
