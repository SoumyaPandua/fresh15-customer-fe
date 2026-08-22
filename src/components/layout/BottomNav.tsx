import { Link, useLocation } from "@/lib/next-router-compat";
import { Home, Search, ShoppingCart, User, Heart } from "lucide-react";
import { useCartBook } from "@/lib/hooks/use-cart-book";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const count = useCartBook().totals.count;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/85 glass pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((it) => {
          const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                {it.label}
                {it.to === "/cart" && count > 0 && (
                  <span className="absolute right-4 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
