import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  qty: number;
  onInc: () => void;
  onDec: () => void;
  onAdd?: () => void;
  size?: "sm" | "md";
  className?: string;
};

export function QuantityStepper({ qty, onInc, onDec, onAdd, size = "sm", className }: Props) {
  const h = size === "sm" ? "h-8" : "h-10";
  const px = size === "sm" ? "px-3" : "px-4";
  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-primary bg-primary/5 font-semibold text-primary transition-all",
          "hover:bg-primary hover:text-primary-foreground hover:scale-[1.02] active:scale-95",
          h,
          px,
          "text-sm",
          className,
        )}
      >
        ADD
      </button>
    );
  }
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-primary text-primary-foreground font-semibold overflow-hidden select-none",
        h,
        className,
      )}
    >
      <button type="button" onClick={onDec} className="h-full px-2.5 hover:bg-black/10 active:scale-95 transition" aria-label="Decrease">
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[1.5rem] text-center text-sm tabular-nums">{qty}</span>
      <button type="button" onClick={onInc} className="h-full px-2.5 hover:bg-black/10 active:scale-95 transition" aria-label="Increase">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
