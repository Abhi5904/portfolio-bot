import {
  ConversationsController,
  ConversationsRoutes,
  ConversationsService,
} from "./modules/conversations";
import {
  KnowledgeBaseController,
  KnowledgeBaseRoutes,
  KnowledgeBaseService,
} from "./modules/knowledge-base";
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
import { CloudinaryService } from "./shared/services";

// ─── Shared services ──────────────────────────────────────────────────────────
export const cloudinaryService = new CloudinaryService();

// ─── Services ─────────────────────────────────────────────────────────────────
export const conversationsService = new ConversationsService();
export const messagesService = new MessagesService();
export const sessionsService = new SessionsService();
export const knowledgeBaseService = new KnowledgeBaseService(cloudinaryService);

// ─── Controllers ──────────────────────────────────────────────────────────────
export const conversationsController = new ConversationsController(conversationsService);
export const messagesController = new MessagesController(messagesService);
export const sessionsController = new SessionsController(sessionsService);
export const knowledgeBaseController = new KnowledgeBaseController(knowledgeBaseService);

// ─── Routes ───────────────────────────────────────────────────────────────────
export const conversationsRoutes = new ConversationsRoutes(conversationsController);
export const messagesRoutes = new MessagesRoutes(messagesController);
export const sessionsRoutes = new SessionsRoutes(sessionsController);
export const knowledgeBaseRoutes = new KnowledgeBaseRoutes(knowledgeBaseController);
