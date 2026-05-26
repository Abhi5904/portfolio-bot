import { Router } from "express";
import type { SessionsController } from "./sessions.controller";

export class SessionsRoutes {
  public router: Router;

  constructor(private sessionsController: SessionsController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // POST /sessions — bootstrap a visitor session (unauthenticated).
    this.router.post("/", this.sessionsController.create);
  }
}
