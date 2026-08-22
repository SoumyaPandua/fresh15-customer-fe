"use client";

import { Bell, BellRing, Mail, Tag, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/store/auth";
import {
  useProductAlert,
  type ProductAlertInput,
} from "@/lib/product-alert-api";
import { inr } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  product: Product;
};

export function ProductAlertCard({ product }: Props) {
  const token = useAuth((state) => state.token);
  const { alert, isLoading, save, remove } =
    useProductAlert(product.id);

  const [backInStock, setBackInStock] = useState(false);
  const [priceDrop, setPriceDrop] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);

  useEffect(() => {
    setBackInStock(Boolean(alert?.backInStock));
    setPriceDrop(Boolean(alert?.priceDrop));
    setTargetPrice(
      alert?.targetPrice != null
        ? String(alert.targetPrice)
        : "",
    );
    setEmailEnabled(Boolean(alert?.emailEnabled));
  }, [alert]);

  const inAppEnabled = true;

  const dirtyInput = useMemo<ProductAlertInput>(
    () => ({
      backInStock,
      priceDrop,
      targetPrice:
        priceDrop && targetPrice.trim()
          ? Number(targetPrice)
          : null,
      inAppEnabled,
      emailEnabled,
    }),
    [
      backInStock,
      priceDrop,
      targetPrice,
      emailEnabled,
    ],
  );

  const hasChanges =
    Boolean(alert?.backInStock) !== backInStock ||
    Boolean(alert?.priceDrop) !== priceDrop ||
    (alert?.targetPrice ?? null) !==
      (dirtyInput.targetPrice ?? null) ||
    Boolean(alert?.emailEnabled) !== emailEnabled;

  if (!token) {
    return (
      <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <BellRing className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground">
              Never miss this product
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Sign in to get a notification when it is
              back in stock or its price drops.
            </p>

            <Button
              asChild
              size="sm"
              className="mt-3 rounded-full"
            >
              <a href="/auth/login">Sign in for alerts</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const saveChanges = () => {
    if (!backInStock && !priceDrop) {
      if (alert) {
        remove.mutate();
      }
      return;
    }

    if (
      priceDrop &&
      targetPrice.trim() &&
      (!Number.isFinite(Number(targetPrice)) ||
        Number(targetPrice) < 0)
    ) {
      return;
    }

    save.mutate(dirtyInput);
  };

  const busy =
    isLoading || save.isPending || remove.isPending;

  return (
    <div className="mt-4 rounded-2xl border bg-surface p-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors",
            alert
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Bell className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-foreground">
            Get product alerts
          </div>

          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            We’ll only notify you when something
            meaningful happens.
          </p>

          <div className="mt-3 space-y-2">
            {product.stock <= 0 && (
              <button
                type="button"
                onClick={() =>
                  setBackInStock((value) => !value)
                }
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                  backInStock
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted",
                )}
              >
                <div
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-lg",
                    backInStock
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <BellRing className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold">
                    Notify me when back in stock
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    We’ll alert you once it becomes available.
                  </div>
                </div>

                <span
                  className={cn(
                    "h-5 w-9 rounded-full p-0.5 transition",
                    backInStock
                      ? "bg-primary"
                      : "bg-muted-foreground/30",
                  )}
                >
                  <span
                    className={cn(
                      "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                      backInStock
                        ? "translate-x-4"
                        : "translate-x-0",
                    )}
                  />
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setPriceDrop((value) => !value)
              }
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                priceDrop
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted",
              )}
            >
              <div
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-lg",
                  priceDrop
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Tag className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold">
                  Notify me when price drops
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Get an alert when the price meaningfully decreases.
                </div>
              </div>

              <span
                className={cn(
                  "h-5 w-9 rounded-full p-0.5 transition",
                  priceDrop
                    ? "bg-primary"
                    : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                    priceDrop
                      ? "translate-x-4"
                      : "translate-x-0",
                  )}
                />
              </span>
            </button>

            {priceDrop && (
              <div className="rounded-xl bg-muted/50 p-3">
                <label
                  htmlFor={`target-price-${product.id}`}
                  className="text-[11px] font-semibold text-foreground"
                >
                  Optional target price
                </label>

                <div className="mt-2 flex items-center gap-2">
                  <div className="text-sm font-semibold">
                    ₹
                  </div>

                  <Input
                    id={`target-price-${product.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={targetPrice}
                    onChange={(event) =>
                      setTargetPrice(
                        event.target.value,
                      )
                    }
                    placeholder={String(
                      Math.max(
                        Math.floor(
                          product.price * 0.9,
                        ),
                        1,
                      ),
                    )}
                    className="h-9 bg-background"
                  />
                </div>

                <p className="mt-1 text-[10px] text-muted-foreground">
                  We’ll alert you when the price reaches
                  this amount.
                </p>
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 hover:bg-muted">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(event) =>
                  setEmailEnabled(
                    event.target.checked,
                  )
                }
                className="h-4 w-4 accent-primary"
              />

              <Mail className="h-4 w-4 text-muted-foreground" />

              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold">
                  Also send me an email
                </div>
                <div className="text-[11px] text-muted-foreground">
                  In-app alerts are always enabled.
                </div>
              </div>
            </label>
          </div>

          {alert && (
            <div className="mt-3 text-[11px] text-muted-foreground">
              Current price:{" "}
              <span className="font-semibold text-foreground">
                {inr(product.price)}
              </span>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              className="rounded-full"
              onClick={saveChanges}
              disabled={
                busy ||
                (!hasChanges && Boolean(alert)) ||
                (!backInStock && !priceDrop)
              }
            >
              {save.isPending
                ? "Saving…"
                : alert
                  ? "Update alerts"
                  : "Save alert"}
            </Button>

            {alert && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground hover:text-destructive"
                onClick={() => remove.mutate()}
                disabled={busy}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
