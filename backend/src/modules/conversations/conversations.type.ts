import type { z } from "zod";
import type { ConversationsValidation } from "./conversations.validation";

export type ConversationsListQueryDTO = z.infer<
  InstanceType<typeof ConversationsValidation>["list"]["query"]
>;
