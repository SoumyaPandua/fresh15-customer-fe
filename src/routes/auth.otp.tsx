import { createFileRoute, useNavigate, Link } from "@/lib/next-router-compat";
import { useState, useEffect } from "react";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authApi, getErrorMessage } from "@/lib/auth-api";
import { toast } from "sonner";

const searchSchema = z.object({
  email: z.string().optional(),
  purpose: z.enum(["REGISTER", "FORGOT_PASSWORD"]).optional(),
});

export const Route = createFileRoute("/auth/otp")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Verify OTP — Fresh15" },
      { name: "description", content: "Verify your email address with a 6-digit OTP." },
      { property: "og:title", content: "Verify OTP — Fresh15" },
      { property: "og:description", content: "Verify your email." },
    ],
  }),
  component: OtpPage,
});

function OtpPage() {
  const { email, purpose = "REGISTER" } = Route.useSearch() as { email?: string; purpose?: "REGISTER" | "FORGOT_PASSWORD" };
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [seconds, setSeconds] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function verify(v: string) {
    if (!email) {
      toast.error("Missing email. Please start again.");
      return;
    }
    setVerifying(true);
    try {
      const res = await authApi.verifyOtp({ email, otp: v, purpose });
      toast.success(res.message || "OTP verified successfully");
      if (purpose === "FORGOT_PASSWORD") {
        const resetToken = (res.data as { resetToken?: string } | null)?.resetToken;
        if (!resetToken) throw new Error("Reset token missing. Please try again.");
        sessionStorage.setItem("fresh15-reset-token", resetToken);
        navigate({ to: "/auth/reset-password" });
      } else {
        navigate({ to: "/auth/login" });
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      setValue("");
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    if (!email) {
      toast.error("Missing email. Please start again.");
      return;
    }
    setResending(true);
    try {
      const res =
        purpose === "FORGOT_PASSWORD"
          ? await authApi.forgotPassword(email)
          : await authApi.resendOtp(email);
      setSeconds(30);
      toast.success(res.message || "OTP sent successfully");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={`Enter the 6-digit code we sent${email ? ` to ${email}` : " to your email"}`}
    >
      <div className="space-y-5">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={value}
            disabled={verifying}
            onChange={(v) => {
              setValue(v);
              if (v.length === 6) verify(v);
            }}
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} className="h-12 w-10 text-lg sm:h-14 sm:w-12 sm:text-xl" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        {verifying && <div className="text-center text-sm text-muted-foreground">Verifying…</div>}
        <div className="text-center text-sm text-muted-foreground">
          {seconds > 0 ? (
            <>Resend code in {seconds}s</>
          ) : (
            <button onClick={resend} disabled={resending} className="font-bold text-primary hover:underline disabled:opacity-50">
              {resending ? "Sending…" : "Resend OTP"}
            </button>
          )}
        </div>
        <div className="text-center">
          <Link to="/auth/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Back to sign in</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
