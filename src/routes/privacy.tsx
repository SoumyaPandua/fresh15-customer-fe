import { createFileRoute } from "@/lib/next-router-compat";
import { AppLayout } from "@/components/layout/AppLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — Fresh15" },
      { name: "description", content: "How Fresh15 collects, uses and protects your data." },
      { property: "og:title", content: "Privacy policy — Fresh15" },
      { property: "og:description", content: "How Fresh15 protects your data." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AppLayout>
      <article className="prose prose-sm mx-auto max-w-3xl">
        <h1 className="text-3xl font-black tracking-tight">Privacy policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: 24 July 2026</p>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-foreground">
          <p>Fresh15 ("we", "us") respects your privacy. This policy explains what we collect, how we use it and the choices you have.</p>
          <h2 className="mt-6 text-lg font-bold">Information we collect</h2>
          <p>Contact details (name, phone, email), delivery addresses, order history and device information used to improve your experience.</p>
          <h2 className="mt-6 text-lg font-bold">How we use your data</h2>
          <p>To process orders, personalise recommendations, communicate updates, prevent fraud and comply with law. We never sell your personal data.</p>
          <h2 className="mt-6 text-lg font-bold">Your choices</h2>
          <p>You can edit or delete your profile and addresses any time. Contact hello@fresh15.app for account deletion requests.</p>
          <h2 className="mt-6 text-lg font-bold">Security</h2>
          <p>Payments are processed by certified partners. We use TLS in transit and encryption at rest for sensitive fields.</p>
        </div>
      </article>
    </AppLayout>
  );
}
