import { apiRequest } from "./http";

export type RefundStatus =
  | "REQUESTED"
  | "APPROVED"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED"
  | "REJECTED"
  | "MANUAL_REQUIRED"
  | "REVERSED";

export type CustomerRefund = {
  _id: string;
  amount: number;
  currency?: string;
  reason: string;
  status: RefundStatus;
  razorpayRefundId?: string | null;
  rejectionReason?: string;
  manualReference?: string;
  createdAt: string;
  processedAt?: string | null;
  statusHistory?: Array<{ status: RefundStatus; at: string }>;
  orderId?: {
    _id: string;
    orderNumber?: string;
    grandTotal?: number;
    paymentMethod?: string;
    paymentStatus?: string;
    orderStatus?: string;
  } | null;
};

const authHeaders = (token: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

export async function getMyRefunds(token: string | null) {
  return apiRequest<CustomerRefund[]>("/api/refund/mine", {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function getMyRefund(token: string | null, refundId: string) {
  return apiRequest<CustomerRefund>(`/api/refund/mine/${refundId}`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function createRefundRequest(
  token: string | null,
  payload: { orderId: string; amount: number; reason: string },
) {
  return apiRequest<CustomerRefund>("/api/refund/request", {
    method: "POST",
    headers: authHeaders(token),
    body: payload,
  });
}
