import {
  AIMessage,
  HumanMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { MessageRole } from "@prisma/client";

/** A plain domain message (e.g. a Prisma `Message` row). */
export interface NormalMessage {
  role: MessageRole;
  content: string;
}

export function toLangChainMessage(message: NormalMessage): BaseMessage {
  switch (message.role) {
    case MessageRole.USER:
      return new HumanMessage(message.content);
    case MessageRole.ASSISTANT:
      return new AIMessage(message.content);
    default: {
      // Exhaustive guard — adding a new MessageRole becomes a compile error.
      const unsupported: never = message.role;
      throw new Error(`Unsupported message role: ${String(unsupported)}`);
    }
  }
}
