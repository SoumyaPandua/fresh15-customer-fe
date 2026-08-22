import type { ReactNode } from "react";
import { Link } from "@/lib/next-router-compat";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-accent p-10 text-primary-foreground lg:flex lg:flex-col">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-lg font-black backdrop-blur">F</div>
          <div>
            <div className="text-lg font-black">Fresh15</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest opacity-80">15 min delivery</div>
          </div>
        </Link>
        <div className="mt-auto">
          <div className="grid grid-cols-3 gap-3">
            {["🥭","🥛","🥦","🍞","🥚","🥑"].map((e,i) => (
              <div key={i} className="grid aspect-square place-items-center rounded-2xl bg-white/15 text-4xl backdrop-blur">{e}</div>
            ))}
          </div>
          <div className="mt-6 max-w-md text-3xl font-black leading-tight">
            Groceries, fruits & essentials at your door in 15 minutes.
          </div>
          <div className="mt-2 text-sm opacity-80">Trusted by 2M+ homes across India.</div>
        </div>
        <div className="absolute inset-0 -z-10 opacity-30 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:24px_24px]" />
      </aside>
      <section className="relative flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="absolute right-4 top-4"><ThemeToggle /></div>
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary text-primary-foreground text-lg font-black">F</div>
            <div className="text-lg font-black">Fresh15</div>
          </Link>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
        </div>
      </section>
    </div>
  );
}
