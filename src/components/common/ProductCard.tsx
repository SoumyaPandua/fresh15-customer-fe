import { memo } from "react";
import { Link } from "@/lib/next-router-compat";
import { Clock, Heart } from "lucide-react";
import type { Product } from "@/lib/types";
import { inr, pct } from "@/lib/format";
import { useCartBook } from "@/lib/hooks/use-cart-book";
import { useWishlistBook } from "@/lib/hooks/use-wishlist-book";
import { ProductArt } from "./ProductArt";
import { QuantityStepper } from "./QuantityStepper";
import { cn } from "@/lib/utils";

function ProductCardBase({ product }: { product: Product }) {
  const cart = useCartBook();
  const wishlist = useWishlistBook();
  const qty = cart.qtyOf(product.id);
  const discount = pct(product.mrp, product.price);
  const inWishlist = wishlist.has(product.id);
  const unavailable = product.isActive === false || product.stock <= 0;

  return (
    <div className="group relative flex h-full flex-col rounded-2xl border bg-card p-3 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card cv-card">
      <button
        onClick={(e) => {
          e.preventDefault();
          void wishlist.toggle(product.id);
        }}
        className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 backdrop-blur transition hover:scale-110"
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart className={cn("h-4 w-4", inWishlist ? "fill-destructive text-destructive" : "text-muted-foreground")} />
      </button>

      <Link to="/product/$id" params={{ id: product.id }} className="block">
        <ProductArt
          emoji={product.emoji}
          src={product.image}
          alt={product.name}
          gradient={product.gradient}
          size="md"
          className="aspect-square w-full"
        />
      </Link>


      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{product.etaMinutes} MINS</span>
        </div>
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className="line-clamp-2 text-sm font-semibold leading-tight text-foreground hover:text-primary"
        >
          {product.name}
        </Link>
        <div className="text-xs text-muted-foreground">{product.unit}</div>
        {product.stock > 0 && product.stock <= 5 && (
          <div className="text-[11px] font-semibold text-warning">Only {product.stock} left</div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground">{inr(product.price)}</div>
          {discount > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-muted-foreground line-through">{inr(product.mrp)}</span>
              <span className="font-semibold text-success">{discount}% off</span>
            </div>
          )}
        </div>
        {unavailable ? (
          <span className="rounded-full bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
            Out of stock
          </span>
        ) : (
          <QuantityStepper
            qty={qty}
            onAdd={() => void cart.add(product)}
            onInc={() => void cart.inc(product.id)}
            onDec={() => void cart.dec(product.id)}
          />
        )}

      </div>
    </div>
  );
}

/** Grids render many cards — skip re-rendering when the product object is unchanged. */
export const ProductCard = memo(ProductCardBase);
