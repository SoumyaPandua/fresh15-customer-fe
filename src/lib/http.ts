import { API_BASE_URL } from "./config";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, options: { status?: number; code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? 0;
    this.code = options.code;
    this.details = options.details;
  }
}

export type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    throw new ApiError("Network error. Please check your connection and try again.", { details: error });
  }

  const raw = await response.text();
  let payload: any = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(payload?.message || "Something went wrong. Please try again.", {
      status: response.status,
      code: payload?.code,
      details: payload,
    });
  }

  if (payload && typeof payload === "object" && "success" in payload && payload.success === false) {
    throw new ApiError(payload.message || "Something went wrong. Please try again.", {
      status: response.status,
      code: payload.code,
      details: payload,
    });
  }

  return (payload?.data ?? payload) as T;
}
