export default function Loading() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" aria-label="Loading" />
    </div>
  );
}
