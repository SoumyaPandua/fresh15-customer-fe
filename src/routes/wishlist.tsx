import { createFileRoute } from "@/lib/next-router-compat";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProductCard } from "@/components/common/ProductCard";
import { ProductGridSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { useWishlistBook } from "@/lib/hooks/use-wishlist-book";
import { api } from "@/lib/api";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — Fresh15" },
      { name: "description", content: "Your saved favourites on Fresh15." },
      { property: "og:title", content: "Wishlist — Fresh15" },
      { property: "og:description", content: "Your saved favourites." },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const wishlist = useWishlistBook();
  const ids = wishlist.ids;

  // Guests keep the local wishlist: resolve saved ids against the public catalog.
  const q = useQuery({
    queryKey: ["products", undefined],
    queryFn: () => api.getProducts(),
    enabled: !wishlist.isAuthed && ids.length > 0,
  });

  const items = wishlist.isAuthed
    ? wishlist.products
    : ids.map((id) => q.data?.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);

  const loading = wishlist.isAuthed ? wishlist.isLoading : q.isLoading && ids.length > 0;
  const errorMessage = wishlist.isAuthed ? wishlist.error : q.isError ? (q.error as Error)?.message : null;

  return (
    <AppLayout>
      <h1 className="mb-4 text-2xl font-black tracking-tight sm:text-3xl">Wishlist</h1>
      {loading ? (
        <ProductGridSkeleton count={Math.max(ids.length, 4)} />
      ) : errorMessage ? (
        <EmptyState
          emoji="⚠️"
          title="Couldn't load your saved items"
          description={errorMessage ?? "Please try again in a moment."}
          cta={{ to: "/", label: "Back to home" }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          emoji="💚"
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here."
          cta={{ to: "/", label: "Explore products" }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
