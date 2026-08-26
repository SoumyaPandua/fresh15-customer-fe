import { API_BASE_URL } from "./config";

export type AgentAction = {
  tool: string;
  success: boolean;
  result?: unknown;
  error?: string;
  code?: string;
};

export type AgentConfirmation = {
  confirmationId: string;
  action: string;
  summary?: unknown;
};

export type AgentResponse = {
  conversationId: string;
  reply: string;
  actions: AgentAction[];
  blocked: boolean;
  confirmation?: AgentConfirmation | null;
};

export type AgentConfirmResponse = {
  reply: string;
  action: string;
  result?: unknown;
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
      payload?.message || `AI agent request failed (${response.status})`,
    );
  }

  return payload.data as T;
}

export function sendAiAgent(
  token: string,
  message: string,
  conversationId?: string,
) {
  return request<AgentResponse>(token, "/api/ai/agent", {
    message,
    conversationId,
  });
}

export function confirmAiAgent(
  token: string,
  conversationId: string,
  confirmationId: string,
) {
  return request<AgentConfirmResponse>(
    token,
    "/api/ai/agent/confirm",
    {
      conversationId,
      confirmationId,
    },
  );
}

export function declineAiAgent(
  token: string,
  conversationId: string,
  confirmationId: string,
) {
  return request<{ reply: string; blocked: boolean }>(
    token,
    "/api/ai/agent/decline",
    { conversationId, confirmationId },
  );
}
