// Centralized customer address API layer (real Fresh15 backend).
import type { ApiResponse } from "./auth-api";
import type { Address } from "./types";

import { API_BASE_URL as BASE_URL } from "./config";

export type ApiAddress = {
  _id: string;
  userId?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  addressType?: "HOME" | "WORK" | "OTHER" | string;
  isDefault?: boolean;
};

/** Editable payload sent to POST/PUT. */
export type AddressInput = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  addressType: "HOME" | "WORK" | "OTHER";
  isDefault: boolean;

  latitude: number | null;
  longitude: number | null;
};

export function toApiType(label: Address["label"]): AddressInput["addressType"] {
  return label === "Work" ? "WORK" : label === "Other" ? "OTHER" : "HOME";
}

export function toUiLabel(type?: string | null): Address["label"] {
  const t = (type ?? "").toUpperCase();
  return t === "WORK" ? "Work" : t === "OTHER" ? "Other" : "Home";
}

export function mapAddress(a: ApiAddress): Address {
  return {
    id: a._id,
    label: toUiLabel(a.addressType),
    name: a.fullName ?? "",
    line1: a.addressLine1 ?? "",
    line2: a.addressLine2 ?? "",
    city: a.city ?? "",
    state: a.state ?? "",
    pincode: a.pincode ?? "",
    phone: a.phone ?? "",
    latitude: a.latitude !== null && a.latitude !== undefined ? Number(a.latitude) : null,
    longitude: a.longitude !== null && a.longitude !== undefined ? Number(a.longitude) : null,
    isDefault: Boolean(a.isDefault),
  };
}

export function toAddressInput(form: Omit<Address, "id">, isDefault = false): AddressInput {
  return {
    fullName: form.name,
    phone: form.phone,
    addressLine1: form.line1,
    addressLine2: form.line2 ?? "",
    landmark: "",
    city: form.city,
    state: form.state,
    country: "India",
    pincode: form.pincode,
    addressType: toApiType(form.label),
    isDefault: form.isDefault ?? isDefault,

    latitude: form.latitude ?? null,

    longitude: form.longitude ?? null,
  };
}

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

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const addressApi = {
  list(token: string | null) {
    return request<ApiAddress[]>("/api/address", { method: "GET" }, token);
  },
  get(token: string | null, id: string) {
    return request<ApiAddress>(`/api/address/${id}`, { method: "GET" }, token);
  },
  create(token: string | null, input: AddressInput) {
    return request<ApiAddress>("/api/address", jsonInit("POST", input), token);
  },
  update(token: string | null, id: string, input: AddressInput) {
    return request<ApiAddress>(`/api/address/${id}`, jsonInit("PUT", input), token);
  },
  remove(token: string | null, id: string) {
    return request<null>(`/api/address/${id}`, { method: "DELETE" }, token);
  },
  setDefault(token: string | null, id: string) {
    return request<ApiAddress>(`/api/address/${id}/default`, { method: "PATCH" }, token);
  },
};
