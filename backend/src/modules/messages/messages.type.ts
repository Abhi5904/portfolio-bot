import type { z } from "zod";
import type { MessagesValidation } from "./messages.validation";

export type MessagesListQueryDTO = z.infer<
  InstanceType<typeof MessagesValidation>["list"]["query"]
>;

export type MessagesConversationIdParamsDTO = z.infer<
  InstanceType<typeof MessagesValidation>["conversationIdParams"]
>;

export type MessagesSendBodyDTO = z.infer<
  InstanceType<typeof MessagesValidation>["send"]["body"]
>;
