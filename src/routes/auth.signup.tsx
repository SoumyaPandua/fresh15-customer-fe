import { createFileRoute, Link, useNavigate } from "@/lib/next-router-compat";
import { useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, getErrorMessage } from "@/lib/auth-api";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Fresh15" },
      { name: "description", content: "Join Fresh15 and get groceries delivered in 15 minutes." },
      { property: "og:title", content: "Create account — Fresh15" },
      { property: "og:description", content: "Join Fresh15." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register(form);
      toast.success(res.message || "Registration successful. OTP sent to email.");
      navigate({ to: "/auth/otp", search: { email: form.email, purpose: "REGISTER" } });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Fresh groceries, in 15 minutes"
      footer={<>Already have one? <Link to="/auth/login" className="font-bold text-primary hover:underline">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 h-11" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 h-11" />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" className="mt-1 h-11" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 h-11" />
        </div>
        <button disabled={loading} type="submit" className="mt-2 h-11 w-full rounded-full bg-primary font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {loading ? "Creating…" : "Create account"}
        </button>
        <p className="text-center text-xs text-muted-foreground">By continuing you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy</Link>.</p>
      </form>
    </AuthLayout>
  );
}
