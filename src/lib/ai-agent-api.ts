import { API_BASE_URL } from "./config";

export type AgentAction = { tool: string; success: boolean; result?: unknown; error?: string; code?: string };
export type AgentResponse = { reply: string; actions: AgentAction[]; blocked: boolean };

export async function sendAiAgent(token: string, message: string) {
  const response = await fetch(`${API_BASE_URL}/api/ai/agent`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ message }), cache: "no-store" });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) throw new Error(payload?.message || `AI agent failed (${response.status})`);
  return payload.data as AgentResponse;
}
