import type { Application, RequestHandler, Router } from "express";
import { requireSession } from "@/shared";
import {
  conversationsRoutes,
  messagesRoutes,
  sessionsRoutes,
} from "./container";

type RouteConfig = {
  path: string;
  router: Router;
  middleware?: RequestHandler[];
};

// Protected routes — add auth middleware here when ready
// e.g. { path: "/conversations", router: conversationsRoutes.router, middleware: [authMiddleware] }
const PRIVATE_ROUTES: RouteConfig[] = [
  { path: "/conversations", router: conversationsRoutes.router },
  {
    path: "/messages",
    router: messagesRoutes.router,
    middleware: [requireSession],
  },
];

// Public routes — no auth required
const PUBLIC_ROUTES: RouteConfig[] = [
  { path: "/sessions", router: sessionsRoutes.router },
];

export class Routes {
  readonly API_PREFIX = "/api";
  readonly API_VERSION = "/v1";
  readonly API_PUBLIC_PREFIX = "/public";

  private registerGroup(
    app: Application,
    basePath: string,
    routes: RouteConfig[]
  ): void {
    routes.forEach(({ path, router, middleware = [] }) => {
      app.use(
        `${this.API_PREFIX}${this.API_VERSION}${basePath}${path}`,
        ...middleware,
        router
      );
    });
  }

  register(app: Application): void {
    this.registerGroup(app, "", PRIVATE_ROUTES);
    this.registerGroup(app, this.API_PUBLIC_PREFIX, PUBLIC_ROUTES);
  }
}
