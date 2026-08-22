import { createFileRoute } from "@/lib/next-router-compat";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProductCard } from "@/components/common/ProductCard";
import { ProductGridSkeleton, Skeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { api } from "@/lib/api";
import { ProductArt } from "@/components/common/ProductArt";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => {
    const label = params.slug.replace(/-/g, " ");
    return {
      meta: [
        { title: `${label} — Fresh15` },
        { name: "description", content: `Shop ${label} — delivered fresh in 15 minutes.` },
        { property: "og:title", content: `${label} — Fresh15` },
        { property: "og:description", content: `Shop ${label} on Fresh15.` },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });
  const categories = catsQ.data ?? [];
  const category = categories.find((c) => c.slug === slug || c.id === slug);

  const q = useQuery({
    queryKey: ["products", category?.id],
    queryFn: () => api.getProducts({ categoryId: category!.id }),
    enabled: !!category,
  });

  if (catsQ.isLoading) {
    return (
      <AppLayout>
        <Skeleton className="mb-6 h-32 w-full rounded-3xl" />
        <ProductGridSkeleton count={12} />
      </AppLayout>
    );
  }

  if (catsQ.isError) {
    return (
      <AppLayout>
        <EmptyState
          emoji="⚠️"
          title="Couldn't load categories"
          description={(catsQ.error as Error)?.message ?? "Please try again in a moment."}
          cta={{ to: "/", label: "Back to home" }}
        />
      </AppLayout>
    );
  }

  if (!category) {
    return (
      <AppLayout>
        <EmptyState
          emoji="🔎"
          title="Category not found"
          description="This category is no longer available."
          cta={{ to: "/", label: "Browse categories" }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6 flex items-center gap-4 rounded-3xl border bg-surface p-5 sm:p-6">
        <ProductArt
          emoji={category.emoji}
          src={category.image}
          alt={category.name}
          gradient={category.gradient}
          size="lg"
          className="h-24 w-24 shrink-0"
        />
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Category</div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">{category.name}</h1>
          <div className="mt-0.5 text-sm text-muted-foreground">{q.data?.length ?? "…"} products · 15 min delivery</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((c) => (
          <a
            key={c.id}
            href={`/category/${c.slug}`}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition " +
              (c.id === category.id
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-surface-elevated hover:bg-muted")
            }
          >
            <span>{c.emoji}</span> {c.name}
          </a>
        ))}
      </div>

      {q.isLoading ? (
        <ProductGridSkeleton count={12} />
      ) : q.isError ? (
        <EmptyState
          emoji="⚠️"
          title="Couldn't load products"
          description={(q.error as Error)?.message ?? "Please try again in a moment."}
          cta={{ to: "/", label: "Back to home" }}
        />
      ) : q.data && q.data.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {q.data.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          emoji="📦"
          title="No products yet"
          description="This category is being restocked. Check back soon."
          cta={{ to: "/", label: "Shop other categories" }}
        />
      )}
    </AppLayout>
  );
}
