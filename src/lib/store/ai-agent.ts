import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getCustomerConversation,
  sendCustomerAgent,
  sendCustomerAgentAction,
  type AgentConfirmation,
  type AgentMessage,
  type AgentResponse,
  type AgentWidget,
} from "../ai-agent-api";

const INITIAL_MESSAGE: AgentMessage = {
  role: "assistant",
  content:
    "Hi! I’m Fresh15 Agent. I can find products, manage your cart and wishlist, and guide you through checkout.",
};

type Workflow = AgentResponse["workflow"] | null;

type AgentState = {
  open: boolean;
  hydrated: boolean;
  conversationId: string | null;
  messages: AgentMessage[];
  workflow: Workflow;
  widget: AgentWidget | null;
  confirmation: AgentConfirmation | null;
  payment: AgentResponse["payment"];
  loading: boolean;
  error: string | null;

  openAgent: () => void;
  closeAgent: () => void;
  clearConversation: () => void;
  hydrate: (token: string) => Promise<void>;
  sendMessage: (token: string, message: string) => Promise<AgentResponse>;
  sendAction: (token: string, action: unknown) => Promise<AgentResponse>;
};

export const useAiAgent = create<AgentState>()(
  persist(
    (set, get) => ({
      open: false,
      hydrated: false,
      conversationId: null,
      messages: [INITIAL_MESSAGE],
      workflow: null,
      widget: null,
      confirmation: null,
      payment: null,
      loading: false,
      error: null,

      openAgent: () => set({ open: true }),
      closeAgent: () => set({ open: false }),

      clearConversation: () =>
        set({
          conversationId: null,
          messages: [INITIAL_MESSAGE],
          workflow: null,
          widget: null,
          confirmation: null,
          payment: null,
          error: null,
        }),

      hydrate: async (token) => {
        const currentId = get().conversationId;

        if (!currentId) {
          set({ hydrated: true });
          return;
        }

        try {
          const conversation = await getCustomerConversation(
            token,
            currentId,
          );

          set({
            hydrated: true,
            messages:
              conversation.messages?.length
                ? conversation.messages
                : [INITIAL_MESSAGE],
            workflow:
              conversation.workflowState &&
              typeof conversation.workflowState === "object"
                ? (conversation.workflowState as Workflow)
                : null,
          });
        } catch {
          set({
            hydrated: true,
            conversationId: null,
            messages: [INITIAL_MESSAGE],
            workflow: null,
            widget: null,
            confirmation: null,
          });
        }
      },

      sendMessage: async (token, message) => {
        set({ loading: true, error: null });

        try {
          set({
            messages: [
              ...get().messages,
              { role: "user", content: message },
            ],
          });

          const response = await sendCustomerAgent(
            token,
            message,
            get().conversationId,
          );

          set({
            conversationId: response.conversationId,
            messages: [
              ...get().messages,
              {
                role: "assistant",
                content: response.reply,
              },
            ],
            workflow: response.workflow,
            widget: response.ui || null,
            confirmation: response.confirmation || null,
            payment: response.payment || null,
            loading: false,
          });

          return response;
        } catch (error) {
          const messageText =
            error instanceof Error
              ? error.message
              : "Fresh15 Agent is unavailable.";

          set({
            loading: false,
            error: messageText,
          });

          throw error;
        }
      },

      sendAction: async (token, action) => {
        set({ loading: true, error: null });

        try {
          const response = await sendCustomerAgentAction(
            token,
            action,
            get().conversationId || "",
          );

          set({
            conversationId: response.conversationId,
            messages: [
              ...get().messages,
              {
                role: "assistant",
                content: response.reply,
              },
            ],
            workflow: response.workflow,
            widget: response.ui || null,
            confirmation: response.confirmation || null,
            payment: response.payment || null,
            loading: false,
          });

          return response;
        } catch (error) {
          const messageText =
            error instanceof Error
              ? error.message
              : "Fresh15 Agent is unavailable.";

          set({
            loading: false,
            error: messageText,
          });

          throw error;
        }
      },
    }),
    {
      name: "fresh15-ai-agent",
      partialize: (state) => ({
        conversationId: state.conversationId,
        messages: state.messages,
        workflow: state.workflow,
      }),
    },
  ),
);
