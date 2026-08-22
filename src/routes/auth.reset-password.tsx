import { createFileRoute, useNavigate } from "@/lib/next-router-compat";
import { useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, getErrorMessage } from "@/lib/auth-api";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Fresh15" },
      { name: "description", content: "Choose a new password for your Fresh15 account." },
      { property: "og:title", content: "Reset password — Fresh15" },
      { property: "og:description", content: "Choose a new password." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw !== pw2) return toast.error("Passwords don't match");
    const token = typeof window !== "undefined" ? sessionStorage.getItem("fresh15-reset-token") : null;
    if (!token) {
      toast.error("Reset session expired. Please request a new OTP.");
      navigate({ to: "/auth/forgot-password" });
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.resetPassword({ token, password: pw });
      sessionStorage.removeItem("fresh15-reset-token");
      toast.success(res.message || "Password reset successful");
      navigate({ to: "/auth/login" });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose something strong and memorable">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1 h-11" />
        </div>
        <div>
          <Label htmlFor="pw2">Confirm password</Label>
          <Input id="pw2" type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} className="mt-1 h-11" />
        </div>
        <button type="submit" disabled={loading} className="h-11 w-full rounded-full bg-primary font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthLayout>
  );
}
