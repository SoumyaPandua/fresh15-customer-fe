import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, Loader2, Plus, RefreshCw, ShoppingCart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductArt } from "@/components/common/ProductArt";
import { Skeleton } from "@/components/common/Skeletons";
import { inr } from "@/lib/format";
import { orderApi, type ReorderItem } from "@/lib/order-api";
import { useAuth } from "@/lib/store/auth";
import { mapCart } from "@/lib/cart-api";

function ReorderCard({
  item,
  selected,
  onSelectedChange,
  onAdd,
  adding,
}: {
  item: ReorderItem;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onAdd: () => void;
  adding: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card p-3">
      <div className="flex gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(value) => onSelectedChange(Boolean(value))}
          aria-label={`Select ${item.name}`}
        />
        <ProductArt emoji="🛍️" src={item.image ?? undefined} alt={item.name} size="sm" className="h-14 w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 text-sm font-bold">{item.name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {item.unit || ""} · bought {item.orderCount}× · last qty {item.lastQuantity}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.usuallyBoughtThisWeek && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <CalendarClock className="h-3 w-3" /> Usually this week
              </span>
            )}
            {!item.isAvailable && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                Currently unavailable
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">{item.reason}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-black">{inr(item.price)}</div>
          <div className="mt-2 text-[10px] text-muted-foreground">× {item.lastQuantity}</div>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant={item.isAvailable ? "outline" : "ghost"}
        className="mt-3 w-full"
        disabled={!item.isAvailable || adding}
        onClick={onAdd}
      >
        {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        {item.isAvailable ? "Add to cart" : "Unavailable"}
      </Button>
    </div>
  );
}

export function ReorderSection() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const query = useQuery({
    queryKey: ["reorder-list", token],
    queryFn: () => orderApi.reorderList(token),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof orderApi.reorderToCart>[1]) => orderApi.reorderToCart(token, payload),
    onSuccess: async (result) => {
      setSelected([]);

      toast.success(`${result.summary.addedCount} item${result.summary.addedCount === 1 ? "" : "s"} added to cart`);

      if (result.summary.skippedCount > 0) {
        toast.info(
          `${result.summary.skippedCount} unavailable item${
            result.summary.skippedCount === 1 ? " was" : "s were"
          } skipped.`,
        );
      }

      await qc.invalidateQueries({
        queryKey: ["cart", token],
      });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not reorder these items"),
  });

  const available = query.data?.items.filter((item) => item.isAvailable) ?? [];
  const usually = query.data?.usuallyBoughtThisWeek ?? [];
  const selectedCount = selected.length;

  const selectedItems = useMemo(
    () =>
      available
        .filter((item) => selected.includes(item.productId))
        .map((item) => ({ productId: item.productId, quantity: item.lastQuantity })),
    [available, selected],
  );

  const toggle = (productId: string, checked: boolean) => {
    setSelected((current) =>
      checked ? [...new Set([...current, productId])] : current.filter((id) => id !== productId),
    );
  };

  const addOne = (item: ReorderItem) => {
    mutation.mutate({ mode: "SELECTED", items: [{ productId: item.productId, quantity: item.lastQuantity }] });
  };

  const addAll = () => {
    if (!available.length) return;
    mutation.mutate({
      mode: "SELECTED",
      items: available.map((item) => ({ productId: item.productId, quantity: item.lastQuantity })),
    });
  };

  const addSelected = () => {
    if (!selectedItems.length) return;
    mutation.mutate({ mode: "SELECTED", items: selectedItems });
  };

  if (!token) return null;
  if (query.isLoading) {
    return (
      <div className="mb-6 space-y-3">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }
  if (query.isError || !query.data?.items.length) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-base font-black">Buy again</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Quickly rebuild your usual grocery basket.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAll}
            disabled={mutation.isPending || !available.length}
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Buy again all
          </Button>
          <Button type="button" size="sm" onClick={addSelected} disabled={mutation.isPending || selectedCount === 0}>
            {mutation.isPending ? <Loader2 className="animate-spin" /> : <ShoppingCart />}
            Add selected {selectedCount ? `(${selectedCount})` : ""}
          </Button>
        </div>
      </div>

      {usually.length > 0 && (
        <div className="border-b p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold">Usually bought this week</div>
              <div className="text-xs text-muted-foreground">Based on your recent weekly ordering pattern.</div>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">SMART</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {usually.map((item) => (
              <ReorderCard
                key={`usually-${item.productId}`}
                item={item}
                selected={selected.includes(item.productId)}
                onSelectedChange={(checked) => toggle(item.productId, checked)}
                onAdd={() => addOne(item)}
                adding={mutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      <div className="p-5">
        <div className="mb-3 text-sm font-bold">Your reorder list</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {query.data.items.map((item) => (
            <ReorderCard
              key={item.productId}
              item={item}
              selected={selected.includes(item.productId)}
              onSelectedChange={(checked) => toggle(item.productId, checked)}
              onAdd={() => addOne(item)}
              adding={mutation.isPending}
            />
          ))}
        </div>
      </div>

      <div className="border-t bg-muted/30 px-5 py-3 text-[11px] text-muted-foreground">
        Reorder quantities default to your most recent purchase. You can adjust them from the cart before checkout.
      </div>
    </section>
  );
}
