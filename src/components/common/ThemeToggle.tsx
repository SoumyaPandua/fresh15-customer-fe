import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/store/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      className={
        "inline-flex h-9 w-9 items-center justify-center rounded-full border bg-surface-elevated text-foreground transition hover:bg-muted " +
        (className ?? "")
      }
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
