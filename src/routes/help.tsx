import { createFileRoute } from "@/lib/next-router-compat";
import { AppLayout } from "@/components/layout/AppLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageSquare, Phone, Mail } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help center — Fresh15" },
      { name: "description", content: "Answers to common questions about Fresh15." },
      { property: "og:title", content: "Help center — Fresh15" },
      { property: "og:description", content: "Answers to common questions." },
    ],
  }),
  component: HelpPage,
});

const faqs = [
  { q: "How does 15-minute delivery work?", a: "We operate hyperlocal dark stores near you, so most orders are packed and dispatched in under 3 minutes and arrive within 15." },
  { q: "What if my item is damaged or missing?", a: "Report the issue in the order details within 24 hours and we'll refund or re-deliver — no questions asked." },
  { q: "Is there a minimum order value?", a: "There's no minimum, but orders below ₹199 include a small delivery fee to cover rider partners." },
  { q: "Which payment methods are supported?", a: "UPI, cards and netbanking via Razorpay, plus Cash on Delivery." },
  { q: "Can I cancel my order?", a: "You can cancel any order that hasn't been packed yet, straight from the order details screen." },
];

function HelpPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-black tracking-tight">Help center</h1>
        <p className="mb-6 text-muted-foreground">Find quick answers, or reach out — we're here 24/7.</p>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <ContactCard icon={<MessageSquare className="h-4 w-4" />} label="Chat with us" sub="Avg. 2 min response" />
          <ContactCard icon={<Phone className="h-4 w-4" />} label="+91 800 15-FRESH" sub="24 × 7 support" />
          <ContactCard icon={<Mail className="h-4 w-4" />} label="hello@fresh15.app" sub="Reply in 6 hours" />
        </div>

        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Frequently asked</h2>
        <Accordion type="single" collapsible className="rounded-2xl border bg-card px-4">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={String(i)}>
              <AccordionTrigger className="text-left text-sm font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </AppLayout>
  );
}

function ContactCard({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div className="mt-2 text-sm font-bold">{label}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
