import type { Application, RequestHandler, Router } from "express";
import { requireSession } from "@/shared";
import {
  conversationsRoutes,
  knowledgeBaseRoutes,
  messagesRoutes,
  sessionsRoutes,
} from "./container";

type RouteConfig = {
  path: string;
  router: Router;
  middleware?: RequestHandler[];
};

// Admin routes — per-route auth applied inside each router
// (mix of requireAdmin for CRUD + requireSseToken for SSE stream)
const PRIVATE_ROUTES: RouteConfig[] = [
  { path: "/admin/documents", router: knowledgeBaseRoutes.router },
];

// Visitor-facing routes
const PUBLIC_ROUTES: RouteConfig[] = [
  { path: "/sessions", router: sessionsRoutes.router },
  { path: "/conversations", router: conversationsRoutes.router, middleware: [requireSession] },
  { path: "/messages", router: messagesRoutes.router, middleware: [requireSession] },
];

export class Routes {
  readonly API_PREFIX = "/api";
  readonly API_VERSION = "/v1";
  readonly API_PUBLIC_PREFIX = "/public";

  private registerGroup(app: Application, basePath: string, routes: RouteConfig[]): void {
    routes.forEach(({ path, router, middleware = [] }) => {
      app.use(`${this.API_PREFIX}${this.API_VERSION}${basePath}${path}`, ...middleware, router);
    });
  }

  register(app: Application): void {
    this.registerGroup(app, "", PRIVATE_ROUTES);
    this.registerGroup(app, this.API_PUBLIC_PREFIX, PUBLIC_ROUTES);
  }
}
