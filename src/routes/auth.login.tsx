import { createFileRoute, Link, useNavigate } from "@/lib/next-router-compat";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/store/auth";
import { authApi, getErrorMessage } from "@/lib/auth-api";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Login — Fresh15" },
      { name: "description", content: "Sign in to your Fresh15 account." },
      { property: "og:title", content: "Login — Fresh15" },
      { property: "og:description", content: "Sign in to Fresh15." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const u = res.data.user;
      login(
        {
          id: u._id,
          name: u.name,
          email: u.email,
          phone: u.phone ?? "",
          avatar: u.profileImage || undefined,
          role: u.role,
          isEmailVerified: u.isEmailVerified,
        },
        res.data.token,
      );
      toast.success(res.message || "Login successful");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your fresh journey"
      footer={<>New here? <Link to="/auth/signup" className="font-bold text-primary hover:underline">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 h-11" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/auth/forgot-password" className="text-xs font-semibold text-primary hover:underline">Forgot?</Link>
          </div>
          <div className="relative mt-1">
            <Input id="password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 pr-10" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Show password">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button disabled={loading} type="submit" className="h-11 w-full rounded-full bg-primary font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <div className="relative py-2 text-center text-xs text-muted-foreground">
          <span className="relative z-10 bg-background px-2">or continue with</span>
          <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
        </div>
        <button type="button" onClick={() => { loginAsGuest(); toast.info("Browsing as guest"); navigate({ to: "/" }); }} className="h-11 w-full rounded-full border bg-surface-elevated text-sm font-semibold hover:bg-muted">
          Guest mode
        </button>
      </form>
    </AuthLayout>
  );
}
