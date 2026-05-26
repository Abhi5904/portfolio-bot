import type { ConversationsListQueryDTO } from "./conversations.type";

export class ConversationsService {
  async list(query: ConversationsListQueryDTO) {
    const { limit, page, search } = query;
  }
}
