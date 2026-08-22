import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Repeat2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ProductArt } from "@/components/common/ProductArt";
import { api } from "@/lib/api";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";
import {
  DEFAULT_SUBSTITUTION,
  SUBSTITUTION_HINTS,
  SUBSTITUTION_LABELS,
  SUBSTITUTION_PREFERENCES,
  substitutionBadge,
  type SubstitutionPreference,
} from "@/lib/substitution";

type Props = {
  productId: string;
  productName: string;
  preference?: SubstitutionPreference | undefined;
  replacementId?: string | null | undefined;
  replacementName?: string | null | undefined;
  onSave: (
    preference: SubstitutionPreference,
    replacement?: { id: string; name: string } | null,
  ) => Promise<boolean | void>;
  disabled?: boolean;
};

/** Compact "If unavailable" control shown on every cart line. */
export function SubstitutionControl({
  productId,
  productName,
  preference,
  replacementId,
  replacementName,
  onSave,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const current = preference ?? DEFAULT_SUBSTITUTION;
  const badge = substitutionBadge(current, replacementName ?? undefined);
  const incomplete = current === "SPECIFIC_ITEM" && !replacementId;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
          "hover:border-primary hover:bg-primary/5 disabled:opacity-50",
          incomplete ? "border-warning/50 bg-warning/10 text-warning" : "border-border text-muted-foreground",
        )}
        aria-label={`If unavailable: ${badge}`}
      >
        <Repeat2 className="h-3 w-3 shrink-0" />
        <span className="truncate">If unavailable · {badge}</span>
      </button>

      {open && (
        <SubstitutionDialog
          open={open}
          onOpenChange={setOpen}
          productId={productId}
          productName={productName}
          current={current}
          currentReplacementId={replacementId ?? null}
          onSave={onSave}
        />
      )}
    </>
  );
}

function SubstitutionDialog({
  open,
  onOpenChange,
  productId,
  productName,
  current,
  currentReplacementId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string;
  productName: string;
  current: SubstitutionPreference;
  currentReplacementId: string | null;
  onSave: Props["onSave"];
}) {
  const [choice, setChoice] = useState<SubstitutionPreference>(current);
  const [replacement, setReplacement] = useState<{ id: string; name: string } | null>(null);
  const [term, setTerm] = useState("");
  const [saving, setSaving] = useState(false);

  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.getProduct(productId),
    staleTime: 5 * 60_000,
  });
  const categoryId = productQuery.data?.categoryId;

  // Prefer same-category products; fall back to the whole catalog.
  const similarQuery = useQuery({
    queryKey: ["products", categoryId ?? undefined],
    queryFn: () => api.getProducts(categoryId ? { categoryId } : undefined),
    enabled: choice === "SPECIFIC_ITEM" && !productQuery.isLoading,
    staleTime: 60_000,
  });
  const allQuery = useQuery({
    queryKey: ["products", undefined],
    queryFn: () => api.getProducts(),
    enabled: choice === "SPECIFIC_ITEM" && (similarQuery.data?.length ?? 0) === 0 && similarQuery.isFetched,
    staleTime: 60_000,
  });

  const options = useMemo(() => {
    const base = (similarQuery.data?.length ? similarQuery.data : (allQuery.data ?? [])) as Product[];
    const valid = base.filter((p) => p.id !== productId && p.isActive !== false && p.stock > 0);
    const s = term.trim().toLowerCase();
    return (s ? valid.filter((p) => p.name.toLowerCase().includes(s)) : valid).slice(0, 40);
  }, [similarQuery.data, allQuery.data, productId, term]);

  const picking = choice === "SPECIFIC_ITEM";
  const loadingOptions = picking && (productQuery.isLoading || similarQuery.isLoading || allQuery.isLoading);
  const selectedId = replacement?.id ?? (choice === current ? currentReplacementId : null);
  const canSave = !picking || !!replacement || !!selectedId;

  async function save() {
    if (saving) return;
    setSaving(true);
    const payload = picking
      ? (replacement ?? (selectedId ? { id: selectedId, name: "Selected replacement" } : null))
      : null;
    const ok = await onSave(choice, payload);
    setSaving(false);
    if (ok !== false) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-4 overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">If unavailable</DialogTitle>
          <DialogDescription className="line-clamp-1 text-xs">{productName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {SUBSTITUTION_PREFERENCES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setChoice(p)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition",
                choice === p ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted",
              )}
            >
              <div className="flex-1">
                <div className="text-sm font-semibold">{SUBSTITUTION_LABELS[p]}</div>
                <div className="text-xs text-muted-foreground">{SUBSTITUTION_HINTS[p]}</div>
              </div>
              {choice === p && (
                <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          ))}
        </div>

        {picking && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search a replacement"
                className="h-10 pl-9"
              />
            </div>
            {loadingOptions ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl border bg-muted/40" />
                ))}
              </div>
            ) : options.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                No similar items are in stock right now. Try “Best similar item” instead.
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {options.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setReplacement({ id: p.id, name: p.name })}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-2 text-left transition",
                      selectedId === p.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted",
                    )}
                  >
                    <ProductArt
                      emoji={p.emoji}
                      src={p.image}
                      alt={p.name}
                      gradient={p.gradient}
                      size="sm"
                      className="h-10 w-10 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.unit} · {inr(p.price)}
                      </div>
                    </div>
                    {selectedId === p.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave || saving}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save preference"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
