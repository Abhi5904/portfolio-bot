import cors from "cors";
import type { Application, Request, Response } from "express";
import express from "express";
import { databaseService, env, redisConnection } from "./config";
import { mountBullBoard } from "./queues/bull-board";
import { Routes } from "./routes";
import { errorMiddleware, notFoundMiddleware, requestLogger } from "./shared";

export class App {
  public app: Application;
  private router: Routes;
  constructor() {
    this.app = express();
    this.router = new Routes();

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    this.app.use(
      cors({ origin: env.CORS_ORIGIN, credentials: env.CORS_CREDENTIALS })
    );
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(requestLogger);
  }

  initializeRoutes() {
    this.app.get("/", (_req: Request, res: Response) => {
      return res.send("Portfolio Bot Backend!!!!");
    });

    this.app.get("/health", async (_req: Request, res: Response) => {
      const databaseUp = await databaseService.healthCheck();

      let redisUp = false;
      try {
        redisUp = (await redisConnection.ping()) === "PONG";
      } catch {
        redisUp = false;
      }

      const healthy = databaseUp && redisUp;
      res.status(healthy ? 200 : 503).json({
        status: healthy ? "ok" : "degraded",
        services: {
          database: databaseUp ? "up" : "down",
          redis: redisUp ? "up" : "down",
        },
        timestamp: new Date().toISOString(),
      });
    });

    mountBullBoard(this.app);
    this.router.register(this.app);
  }

  initializeErrorHandling() {
    this.app.use(notFoundMiddleware);
    this.app.use(errorMiddleware);
  }

  public getApp(): Application {
    return this.app;
  }
}
