import type { Conversation } from "@/types/chat";

/**
 * Placeholder conversation history for the chat sidebar.
 * Replace with data fetched per-visitor once persistence exists.
 */
export const mockConversations: Conversation[] = [
  { id: "c1", title: "What's your experience with React?", updatedAt: Date.now() - 1000 * 60 * 12 },
  { id: "c2", title: "Tell me about the portfolio bot project", updatedAt: Date.now() - 1000 * 60 * 60 * 3 },
  { id: "c3", title: "Are you available for freelance work?", updatedAt: Date.now() - 1000 * 60 * 60 * 26 },
  { id: "c4", title: "How do you approach testing?", updatedAt: Date.now() - 1000 * 60 * 60 * 50 },
];
