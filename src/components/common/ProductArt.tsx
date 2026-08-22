import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";

type Props = {
  emoji: string;
  /** Optional backend image URL — falls back to the emoji art when absent or broken. */
  src?: string | undefined;
  alt?: string;
  gradient?: "warm" | "cool" | "fresh" | "primary";
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children?: ReactNode;
};

const sizeMap = {
  sm: "text-3xl",
  md: "text-5xl",
  lg: "text-7xl",
  xl: "text-8xl",
};

const gradientMap: Record<NonNullable<Props["gradient"]>, string> = {
  warm: "gradient-warm",
  cool: "gradient-cool",
  fresh: "gradient-fresh",
  primary: "gradient-primary",
};

export function ProductArt({ emoji, src, alt, gradient = "fresh", className, size = "md", children }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl",
        gradientMap[gradient],
        className,
      )}
    >
      <div className="absolute inset-0 bg-white/10 mix-blend-overlay" />
      {showImage ? (
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className={cn("relative drop-shadow-sm", sizeMap[size])} aria-hidden>
          {emoji}
        </span>
      )}
      {children}
    </div>
  );
}

