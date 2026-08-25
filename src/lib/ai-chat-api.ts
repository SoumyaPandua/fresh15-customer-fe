import { apiRequest } from "./http";

export type AiMessage = { role: "user" | "assistant"; content: string; blocked?: boolean; createdAt?: string };
export type AiConversation = { _id: string; title: string; messages: AiMessage[]; messageCount: number; lastActivityAt: string; createdAt: string };
export type AiChatResponse = { conversationId: string; reply: string; blocked: boolean };

export function sendAiMessage(token: string, message: string, conversationId?: string) {
  return apiRequest<AiChatResponse>("/ai/chat", { method:"POST", headers:{Authorization:`Bearer ${token}`}, body:{message, conversationId} });
}
export function getAiConversations(token: string) {
  return apiRequest<Array<Pick<AiConversation,"_id"|"title"|"messageCount"|"lastActivityAt"|"createdAt">>>("/ai/conversations", {headers:{Authorization:`Bearer ${token}`}});
}
export function getAiConversation(token: string, id: string) {
  return apiRequest<AiConversation>(`/ai/conversations/${encodeURIComponent(id)}`, {headers:{Authorization:`Bearer ${token}`}});
}
