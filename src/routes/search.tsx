import { createFileRoute, Link, useNavigate } from "@/lib/next-router-compat";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { Search as SearchIcon, X, TrendingUp } from "lucide-react";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProductCard } from "@/components/common/ProductCard";
import { ProductGridSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useRecent } from "@/lib/store/recent";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Search — Fresh15" },
      { name: "description", content: "Search across thousands of grocery products on Fresh15." },
      { property: "og:title", content: "Search — Fresh15" },
      { property: "og:description", content: "Find fresh groceries, snacks and essentials in seconds." },
    ],
  }),
  component: SearchPage,
});

const trending = ["Milk", "Bread", "Mangoes", "Curd", "Bananas", "Coffee", "Eggs", "Chips"];

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [value, setValue] = useState(q ?? "");
  const debounced = useDebounced(value, 300);
  const { searches, addSearch, clearSearches } = useRecent();

  useEffect(() => {
    if (debounced.trim()) addSearch(debounced.trim());
  }, [debounced, addSearch]);

  useEffect(() => {
    setValue(q ?? "");
  }, [q]);

  const query = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => api.getProducts({ query: debounced }),
    enabled: debounced.trim().length > 0,
  });

  const showResults = debounced.trim().length > 0;

  return (
    <AppLayout>
      <div className="mb-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/search", search: { q: value } });
          }}
          className="relative"
        >
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='Search "milk", "mangoes", "coffee"…'
            className="h-14 rounded-2xl border-transparent bg-muted pl-12 pr-12 text-base"
          />
          {value && (
            <button
              type="button"
              onClick={() => setValue("")}
              className="absolute right-4 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full hover:bg-background"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      {!showResults && (
        <div className="space-y-8">
          {searches.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Recent searches</h2>
                <button onClick={clearSearches} className="text-xs font-semibold text-primary hover:underline">Clear</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searches.map((s) => (
                  <button
                    key={s}
                    onClick={() => navigate({ to: "/search", search: { q: s } })}
                    className="rounded-full border bg-surface-elevated px-4 py-1.5 text-sm hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>
          )}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-4 w-4" /> Trending searches
            </h2>
            <div className="flex flex-wrap gap-2">
              {trending.map((t) => (
                <button
                  key={t}
                  onClick={() => navigate({ to: "/search", search: { q: t } })}
                  className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/15"
                >
                  {t}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {showResults && (
        <div>
          <div className="mb-3 text-sm text-muted-foreground">
            {query.isLoading ? "Searching…" : `${query.data?.length ?? 0} results for "${debounced}"`}
          </div>
          {query.isLoading ? (
            <ProductGridSkeleton count={10} />
          ) : query.data && query.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {query.data.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              emoji="🔍"
              title="No products found"
              description={`We couldn't find anything for "${debounced}". Try a different search.`}
              cta={{ to: "/", label: "Back to home" }}
            />
          )}
        </div>
      )}
    </AppLayout>
  );
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
