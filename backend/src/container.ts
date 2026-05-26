import {
  ConversationsController,
  ConversationsRoutes,
  ConversationsService,
} from "./modules/conversations";
import {
  MessagesController,
  MessagesRoutes,
  MessagesService,
} from "./modules/messages";
import {
  SessionsController,
  SessionsRoutes,
  SessionsService,
} from "./modules/sessions";

export const conversationsService = new ConversationsService();
export const messagesService = new MessagesService();
export const sessionsService = new SessionsService();

export const messagesController = new MessagesController(messagesService);
export const sessionsController = new SessionsController(sessionsService);
export const conversationsController = new ConversationsController(
  conversationsService
);

export const messagesRoutes = new MessagesRoutes(messagesController);
export const sessionsRoutes = new SessionsRoutes(sessionsController);
export const conversationsRoutes = new ConversationsRoutes(
  conversationsController
);
