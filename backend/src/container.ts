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
import {
  SettingsController,
  SettingsRoutes,
  SettingsService,
} from "./modules/settings";
import { CloudinaryService } from "./shared/services";

// ─── Shared services ──────────────────────────────────────────────────────────
export const cloudinaryService = new CloudinaryService();

// ─── Services ─────────────────────────────────────────────────────────────────
export const conversationsService = new ConversationsService();
export const sessionsService = new SessionsService();
export const knowledgeBaseService = new KnowledgeBaseService(cloudinaryService);
export const settingsService = new SettingsService();
export const messagesService = new MessagesService(settingsService);

// ─── Controllers ──────────────────────────────────────────────────────────────
export const conversationsController = new ConversationsController(conversationsService);
export const messagesController = new MessagesController(messagesService);
export const sessionsController = new SessionsController(sessionsService);
export const knowledgeBaseController = new KnowledgeBaseController(knowledgeBaseService);
export const settingsController = new SettingsController(settingsService);

// ─── Routes ───────────────────────────────────────────────────────────────────
export const conversationsRoutes = new ConversationsRoutes(conversationsController);
export const messagesRoutes = new MessagesRoutes(messagesController);
export const sessionsRoutes = new SessionsRoutes(sessionsController);
export const knowledgeBaseRoutes = new KnowledgeBaseRoutes(knowledgeBaseController);
export const settingsRoutes = new SettingsRoutes(settingsController);
