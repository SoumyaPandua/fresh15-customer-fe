import { createFileRoute } from "@/lib/next-router-compat";
import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & conditions — Fresh15" },
      { name: "description", content: "The rules of using Fresh15." },
      { property: "og:title", content: "Terms & conditions — Fresh15" },
      { property: "og:description", content: "The rules of using Fresh15." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppLayout>
      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black tracking-tight">Terms & conditions</h1>
        <p className="text-sm text-muted-foreground">Last updated: 24 July 2026</p>
        <div className="mt-4 space-y-4 text-sm leading-relaxed">
          <p>By using Fresh15 you agree to these terms. Please read them carefully.</p>
          <h2 className="mt-6 text-lg font-bold">Orders and pricing</h2>
          <p>All prices are inclusive of applicable taxes. Availability and prices may change; we'll always confirm the total before you place the order.</p>
          <h2 className="mt-6 text-lg font-bold">Delivery</h2>
          <p>Estimated delivery times are indicative. Delays due to weather, traffic or unforeseen events may occur.</p>
          <h2 className="mt-6 text-lg font-bold">Refunds</h2>
          <p>Damaged, missing or unsatisfactory items are refundable or replaceable within 24 hours of delivery.</p>
          <h2 className="mt-6 text-lg font-bold">Contact</h2>
          <p>Questions? hello@fresh15.app or use the in-app chat.</p>
        </div>
      </article>
    </AppLayout>
  );
}
