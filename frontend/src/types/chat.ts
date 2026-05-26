/** Shared chat domain types used across hooks, services and components. */

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Epoch ms; used for ordering and display. */
  createdAt: number;
  /** Marks an assistant message that failed to generate. */
  error?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  /** Epoch ms of the last activity, for sidebar ordering. */
  updatedAt: number;
}
