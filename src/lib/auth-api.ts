// Centralized authentication API layer for the Fresh15 customer portal.
import { apiRequest } from "./http";

const PORTAL = "customer";

export type ApiUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  portal?: string;
  profileImage?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
};

export type ApiResponse<T> = { success: boolean; message: string; data: T };
export type OtpPurpose = "REGISTER" | "FORGOT_PASSWORD";

async function post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    const data = await apiRequest<T>(path, { method: "POST", body });
    return { success: true, message: "", data };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
  }
}

export const authApi = {
  register(input: { name: string; email: string; phone: string; password: string }) {
    return post<{ id: string; name: string; email: string }>("/api/auth/register", { ...input, portal: PORTAL });
  },
  verifyOtp(input: { email: string; otp: string; purpose: OtpPurpose }) {
    return post<{ resetToken?: string } | null>("/api/auth/verify-otp", input);
  },
  resendOtp(email: string) {
    return post<null>("/api/auth/resend-otp", { email });
  },
  login(input: { email: string; password: string }) {
    return post<{ token: string; user: ApiUser }>("/api/auth/login", { ...input, portal: PORTAL });
  },
  forgotPassword(email: string) {
    return post<null>("/api/auth/forgot-password", { email });
  },
  resetPassword(input: { token: string; password: string }) {
    return post<null>("/api/auth/reset-password", input);
  },
};

export function getErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}
