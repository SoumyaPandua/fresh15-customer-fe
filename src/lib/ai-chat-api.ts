import { apiRequest } from "./http";

export type AiChatMessage = { role: "user" | "model"; text: string };
export type AiCartItem = { name: string; qty: number; price: number };
export type AiProduct = { id: string; name: string; price: number; mrp: number; stock: number; unit: string; image?: string | null };
export type AiChatResponse = { reply: string; products: AiProduct[]; model: string };

export async function askFresh15Assistant(input: {
  message: string;
  history?: AiChatMessage[];
  cart?: AiCartItem[];
  token?: string | null;
}) {
  const headers: Record<string, string> = {};
  if (input.token) headers.Authorization = `Bearer ${input.token}`;
  return apiRequest<AiChatResponse>("/api/ai/chat", {
    method: "POST",
    headers,
    body: {
      message: input.message,
      history: input.history ?? [],
      cart: input.cart ?? [],
    },
  });
}
