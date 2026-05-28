import type { Worker } from "bullmq";
import { logger } from "@/shared";
import { bullConnection } from "./connection";
import { register as registerKnowledgeBase } from "@/modules/knowledge-base";

// ─── Register all workers ─────────────────────────────────────────────────────
const workers: Worker[] = [registerKnowledgeBase()];

logger.info(`🛠  Worker process started — ${workers.length} worker(s) active`);

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received — closing workers...`);
  await Promise.all(workers.map((worker) => worker.close()));
  await bullConnection.quit();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
