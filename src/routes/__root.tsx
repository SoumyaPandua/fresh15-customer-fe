import { Link } from "@/lib/next-router-compat";

export function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-3xl gradient-primary text-6xl shadow-elevated">🛒</div>
        <h1 className="text-6xl font-black tracking-tight text-foreground">404</h1>
        <h2 className="mt-2 text-xl font-semibold text-foreground">This aisle doesn't exist</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for may have been moved or removed.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/" className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Back to home</Link>
          <Link to="/search" className="inline-flex items-center justify-center rounded-full border bg-surface-elevated px-5 py-2.5 text-sm font-semibold text-foreground">Search products</Link>
        </div>
      </div>
    </div>
  );
}
