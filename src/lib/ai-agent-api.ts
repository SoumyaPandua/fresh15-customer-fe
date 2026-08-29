import { API_BASE_URL } from "./config";

export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AgentProduct = {
  id: string;
  name: string;
  image?: string | null;
  price: number;
  mrp: number;
  unit?: string;
  units?: string[];
  stock?: number;
  inStock?: boolean;
};

export type AgentWidget =
  | {
      type: "PRODUCT_LIST";
      payload: { products: AgentProduct[]; intent?: string };
    }
  | {
      type: "UNIT_PICKER";
      payload: {
        quantity: number | null;
        product: AgentProduct;
        options: string[];
      };
    }
  | {
      type: "ADDRESS_PICKER";
      payload: {
        addresses: Array<{
          id: string;
          label: string;
          addressLine1: string;
          addressLine2?: string;
          city?: string;
          state?: string;
          pincode: string;
          isDefault: boolean;
        }>;
        addAddress?: boolean;
      };
    }
  | {
      type: "SLOT_PICKER";
      payload: {
        slots: Array<{
          id: string;
          dateKey: string;
          label: string;
          etaMinutes?: number | null;
        }>;
      };
    }
  | {
      type: "PAYMENT_PICKER";
      payload: {
        methods: Array<"COD" | "ONLINE">;
      };
    }
  | {
      type: "ORDER_SUMMARY";
      payload: Record<string, unknown>;
    }
  | {
      type: "CART_SUMMARY";
      payload: unknown;
    }
  | {
      type: "WISHLIST";
      payload: unknown;
    }
  | {
      type: "ORDER_LIST";
      payload: unknown;
    }
  | {
      type: "PAYMENT_PENDING";
      payload: { orderId: string; orderNumber: string };
    }
  | {
      type: "ORDER_SUCCESS";
      payload: {
        orderId: string;
        orderNumber: string;
        trackingUrl: string;
      };
    };

export type AgentConfirmation = {
  confirmationId: string;
  action: string;
  summary?: unknown;
  expiresAt?: string;
};

export type AgentResponse = {
  conversationId: string;
  reply: string;
  workflow: {
    mode: string;
    intent: string | null;
    selectedProductId: string | null;
    selectedProductName: string | null;
    requestedQuantity: number | null;
    requestedUnit: string | null;
    selectedAddressId: string | null;
    selectedSlotId: string | null;
    selectedDateKey: string | null;
    paymentMethod: string | null;
    orderId: string | null;
    orderNumber: string | null;
  };
  actions: Array<{
    tool: string;
    success: boolean;
    result?: unknown;
    error?: string;
    code?: string;
  }>;
  ui?: AgentWidget | null;
  confirmation?: AgentConfirmation | null;
  payment?: {
    required: boolean;
    orderId: string;
  } | null;
  blocked: boolean;
};

async function request<T>(
  token: string,
  path: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.message ||
        `AI agent request failed (${response.status})`,
    );
  }

  return payload.data as T;
}

export function sendCustomerAgent(
  token: string,
  message: string,
  conversationId?: string | null,
) {
  return request<AgentResponse>(
    token,
    "/api/ai/customer-agent",
    {
      message,
      conversationId: conversationId || undefined,
    },
  );
}

export function sendCustomerAgentAction(
  token: string,
  action: unknown,
  conversationId: string,
) {
  return sendCustomerAgent(
    token,
    `__F15_ACTION__${JSON.stringify(action)}`,
    conversationId,
  );
}

export async function getCustomerConversation(
  token: string,
  conversationId: string,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/ai/conversations/${conversationId}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.message ||
        `Conversation request failed (${response.status})`,
    );
  }

  return payload.data as {
    _id: string;
    messages?: AgentMessage[];
    workflowState?: AgentResponse["workflow"];
  };
}
