// Centralized customer profile API layer (real Fresh15 backend).
import type { ApiResponse, ApiUser } from "./auth-api";

import { API_BASE_URL as BASE_URL } from "./config";

export type ApiProfile = {
  _id?: string;
  userId?: string;
  role?: string;
  avatar?: string | null;
  gender?: string | null;
  dob?: string | null;
  preferences?: Record<string, unknown> | null;
};

export type ProfilePayload = { user: ApiUser; profile: ApiProfile | null };

async function request<T>(path: string, init: RequestInit, token: string | null): Promise<ApiResponse<T>> {
  if (!token) throw new Error("You need to sign in to continue.");
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("Network error. Please check your connection and try again.");
  }
  let json: Partial<ApiResponse<T>> | null = null;
  try {
    json = (await res.json()) as Partial<ApiResponse<T>>;
  } catch {
    json = null;
  }
  if (!res.ok || !json?.success) throw new Error(json?.message || "Something went wrong. Please try again.");
  return json as ApiResponse<T>;
}

export const profileApi = {
  get(token: string | null) {
    return request<ProfilePayload>("/api/profile", { method: "GET" }, token);
  },
  update(
    token: string | null,
    input: { name?: string; email?: string; phone?: string; gender?: string; dob?: string; preferences?: Record<string, unknown> },
  ) {
    return request<ProfilePayload>(
      "/api/profile",
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
      token,
    );
  },
  updateAvatar(token: string | null, file: File) {
    const fd = new FormData();
    fd.append("image", file);
    // No manual Content-Type — the browser sets the multipart boundary.
    return request<{ profileImage?: string; avatar?: string; profile?: ApiProfile }>(
      "/api/profile/avatar",
      { method: "PATCH", body: fd },
      token,
    );
  },
  changePassword(token: string | null, input: { currentPassword: string; newPassword: string }) {
    return request<null>(
      "/api/profile/password",
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
      token,
    );
  },
};
