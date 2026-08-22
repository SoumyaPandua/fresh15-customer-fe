"use client";
import { createFileRoute, Link } from "@/lib/next-router-compat";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarClock, Check, ChevronRight, Loader2, Pin, PinOff, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { ProductArt } from "@/components/common/ProductArt";
import { Skeleton } from "@/components/common/Skeletons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/store/auth";
import { groceryListApi, type GroceryList, type GroceryListWriteItem } from "@/lib/grocery-list-api";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/weekly-essentials")({
  head: () => ({
    meta: [
      { title: "Weekly Essentials — Fresh15" },
      { name: "description", content: "Save and repeat your favorite weekly grocery baskets in one tap." },
    ],
  }),
  component: WeeklyEssentialsPage,
});

function WeeklyEssentialsPage() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<GroceryList | null>(null);
  const [editName, setEditName] = useState("");
  const [editItems, setEditItems] = useState<GroceryListWriteItem[]>([]);

  const listsQ = useQuery({
    queryKey: ["grocery-lists", token],
    queryFn: () => groceryListApi.list(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["grocery-lists", token] });

  const saveCart = useMutation({
    mutationFn: () => groceryListApi.saveCart(token),
    onSuccess: () => { refresh(); toast.success("Weekly Essentials saved from your cart"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save your basket"),
  });

  const smart = useMutation({
    mutationFn: () => groceryListApi.createSmartWeekly(token),
    onSuccess: () => { refresh(); toast.success("Your smart Weekly Essentials basket is ready"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Not enough purchase history yet"),
  });

  const addToCart = useMutation({
    mutationFn: (id: string) => groceryListApi.addToCart(token, id),
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: ["cart", token] });
      toast.success(`${result.summary.addedCount} item${result.summary.addedCount === 1 ? "" : "s"} added to cart`);
      if (result.summary.skippedCount) toast.info(`${result.summary.skippedCount} unavailable item${result.summary.skippedCount === 1 ? " was" : "s were"} skipped.`);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add this basket"),
  });

  const update = useMutation({
    mutationFn: (input: { id: string; items: GroceryListWriteItem[]; name: string; isPinned: boolean }) => groceryListApi.update(token, input.id, { name: input.name, items: input.items, isPinned: input.isPinned }),
    onSuccess: () => { setEditing(null); refresh(); toast.success("Weekly basket updated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update this basket"),
  });

  const pin = useMutation({
    mutationFn: (input: { id: string; isPinned: boolean }) => groceryListApi.update(token, input.id, { isPinned: input.isPinned }),
    onSuccess: refresh,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update pin"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => groceryListApi.remove(token, id),
    onSuccess: () => { refresh(); toast.success("Basket removed"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove basket"),
  });

  const lists = listsQ.data ?? [];
  const pinned = useMemo(() => lists.filter((list) => list.isPinned), [lists]);

  if (!token) {
    return (
      <AppLayout>
        <EmptyState emoji="🧺" title="Save your weekly essentials" description="Sign in to pin a grocery basket and add it back to your cart whenever you need it." cta={{ to: "/auth/login", label: "Login / Sign up" }} />
      </AppLayout>
    );
  }

  if (listsQ.isLoading) {
    return <AppLayout><div className="space-y-4"><Skeleton className="h-36 w-full rounded-3xl" /><div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></div></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary"><CalendarClock className="h-3.5 w-3.5" /> SMART WEEKLY</div>
              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Weekly Essentials</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Pin a basket once. Bring the whole routine back to your cart in one tap. Prices and stock are always checked live.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => smart.mutate()} disabled={smart.isPending}>
                {smart.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Build smart list
              </Button>
              <Button onClick={() => saveCart.mutate()} disabled={saveCart.isPending}>
                {saveCart.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                Save current cart
              </Button>
            </div>
          </div>
          {pinned.length > 0 && (
            <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-primary"><Pin className="h-3.5 w-3.5 fill-current" /> {pinned.length} pinned basket{pinned.length === 1 ? "" : "s"} ready for a one-tap repeat</div>
          )}
        </section>

        {!lists.length ? (
          <div className="rounded-3xl border bg-card p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="h-6 w-6" /></div>
            <h2 className="mt-4 text-lg font-black">Your first weekly basket is waiting</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Add your usual groceries to the cart, then save it here. Fresh15 will remember the quantities you chose.</p>
            <Link to="/" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Start shopping <ChevronRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {lists.map((list) => (
              <BasketCard key={list._id} list={list} busy={addToCart.isPending || pin.isPending || remove.isPending} onAdd={() => addToCart.mutate(list._id)} onPin={() => pin.mutate({ id: list._id, isPinned: !list.isPinned })} onEdit={() => { setEditing(list); setEditName(list.name); setEditItems(list.items.map((item) => ({ productId: item.productId, quantity: item.quantity }))); }} onRemove={() => remove.mutate(list._id)} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Edit basket</DialogTitle><DialogDescription>Keep your weekly quantities exactly how you like them.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Basket name" />
            <div className="space-y-2">
              {editing?.items.map((item) => {
                const index = editItems.findIndex((entry) => entry.productId === item.productId);
                const current = index >= 0 ? editItems[index].quantity : item.quantity;
                return (
                  <div key={item.productId} className="flex items-center gap-3 rounded-xl border p-2.5">
                    <ProductArt emoji="🛍️" src={item.product?.image ?? undefined} alt={item.product?.name ?? "Product"} size="sm" className="h-11 w-11 shrink-0" />
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{item.product?.name ?? "Unavailable product"}</div><div className="text-[11px] text-muted-foreground">{item.product?.unit ?? ""}</div></div>
                    <div className="flex items-center gap-1 rounded-full border p-1">
                      <button type="button" className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted" onClick={() => setEditItems((currentItems) => currentItems.map((entry) => entry.productId === item.productId ? { ...entry, quantity: Math.max(1, entry.quantity - 1) } : entry))}>−</button>
                      <span className="w-5 text-center text-xs font-bold">{current}</span>
                      <button type="button" className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted" onClick={() => setEditItems((currentItems) => currentItems.map((entry) => entry.productId === item.productId ? { ...entry, quantity: Math.min(50, entry.quantity + 1) } : entry))}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={!editing || !editName.trim() || update.isPending} onClick={() => editing && update.mutate({ id: editing._id, name: editName.trim(), items: editItems, isPinned: editing.isPinned })}>{update.isPending ? <Loader2 className="animate-spin" /> : <Check />} Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function BasketCard({ list, busy, onAdd, onPin, onEdit, onRemove }: { list: GroceryList; busy: boolean; onAdd: () => void; onPin: () => void; onEdit: () => void; onRemove: () => void }) {
  const available = list.items.filter((item) => item.isAvailable).length;
  return (
    <article className="overflow-hidden rounded-3xl border bg-card transition-shadow hover:shadow-soft">
      <div className="flex items-start gap-3 border-b p-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><CalendarClock className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-base font-black">{list.name}</h2>{list.isPinned && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"><Pin className="h-3 w-3 fill-current" /> Pinned</span>}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{list.repeatInterval === "WEEKLY" ? "Repeats weekly" : "Reusable basket"} · {list.items.length} item{list.items.length === 1 ? "" : "s"} · {available} available now</p>
        </div>
      </div>
      <div className="grid gap-2 p-4 sm:grid-cols-2">
        {list.items.slice(0, 6).map((item) => (
          <div key={item.productId} className="flex items-center gap-2 rounded-xl bg-muted/50 p-2">
            <ProductArt emoji="🛍️" src={item.product?.image ?? undefined} alt={item.product?.name ?? "Product"} size="sm" className="h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{item.product?.name ?? "Unavailable"}</div><div className="text-[10px] text-muted-foreground">× {item.quantity} · {item.product ? inr(item.product.price) : "Unavailable"}</div></div>
            {!item.isAvailable && <span className="text-[9px] font-bold text-destructive">OOS</span>}
          </div>
        ))}
      </div>
      {list.items.length > 6 && <div className="px-4 pb-2 text-[11px] text-muted-foreground">+ {list.items.length - 6} more item{list.items.length - 6 === 1 ? "" : "s"}</div>}
      <div className="flex flex-wrap gap-2 border-t p-4">
        <Button className="flex-1" onClick={onAdd} disabled={busy || available === 0}><RefreshCw /> Add all to cart</Button>
        <Button variant="outline" size="icon" onClick={onPin} disabled={busy} aria-label={list.isPinned ? "Unpin basket" : "Pin basket"}>{list.isPinned ? <PinOff /> : <Pin />}</Button>
        <Button variant="outline" size="icon" onClick={onEdit} disabled={busy} aria-label="Edit basket">✎</Button>
        <Button variant="ghost" size="icon" onClick={onRemove} disabled={busy} aria-label="Delete basket"><Trash2 className="text-destructive" /></Button>
      </div>
    </article>
  );
}
