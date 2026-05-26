import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import type { Application, RequestHandler } from "express";
import { env } from "@/config";
import { basicAuth, logger } from "@/shared";
import { allQueues } from "./index";

// Mounts the Bull Board dashboard on a single endpoint (env.BULL_BOARD_PATH).
// Basic auth is enforced only when BULL_BOARD_USER + BULL_BOARD_PASSWORD are
// set (dev/prod); leave them unset locally for an open dashboard.
export function mountBullBoard(app: Application): void {
  const path = env.BULL_BOARD_PATH;

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(path);

  createBullBoard({
    queues: allQueues().map((queue) => new BullMQAdapter(queue)),
    serverAdapter,
  });

  const guards: RequestHandler[] = [];
  if (env.BULL_BOARD_USER && env.BULL_BOARD_PASSWORD) {
    guards.push(
      basicAuth({
        user: env.BULL_BOARD_USER,
        password: env.BULL_BOARD_PASSWORD,
        realm: "Bull Board",
      })
    );
    logger.info(`📊 Bull Board mounted at ${path} (auth enabled)`);
  } else {
    logger.warn(`📊 Bull Board mounted at ${path} (no auth — local mode)`);
  }

  app.use(path, ...guards, serverAdapter.getRouter());
}
