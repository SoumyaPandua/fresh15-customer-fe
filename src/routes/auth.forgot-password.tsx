import { createFileRoute, Link, useNavigate } from "@/lib/next-router-compat";
import { useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, getErrorMessage } from "@/lib/auth-api";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — Fresh15" },
      { name: "description", content: "Reset your Fresh15 password with an email OTP." },
      { property: "og:title", content: "Forgot password — Fresh15" },
      { property: "og:description", content: "Reset your password." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      toast.success(res.message || "OTP sent successfully");
      navigate({ to: "/auth/otp", search: { email, purpose: "FORGOT_PASSWORD" } });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="We'll email you a password reset OTP"
      footer={<>Remembered? <Link to="/auth/login" className="font-bold text-primary hover:underline">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-11" />
        </div>
        <button type="submit" disabled={loading} className="h-11 w-full rounded-full bg-primary font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {loading ? "Sending…" : "Send password reset OTP"}
        </button>
      </form>
    </AuthLayout>
  );
}
