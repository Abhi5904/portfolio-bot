import 'bullmq';
import { z } from 'zod';
import 'dotenv/config';
import 'crypto';
import IORedis from 'ioredis';

// src/queues/worker.ts
var envSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8e3),
  // Database — full Prisma connection URL
  DATABASE_URL: z.url("DATABASE_URL must be a valid URL"),
  // PostgreSQL — individual fields for direct pg / docker-compose usage
  POSTGRES_HOST: z.string().min(1, "POSTGRES_HOST is required"),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_USER: z.string().min(1, "POSTGRES_USER is required"),
  POSTGRES_PASSWORD: z.string().min(1, "POSTGRES_PASSWORD is required"),
  POSTGRES_DB: z.string().min(1, "POSTGRES_DB is required"),
  // Redis
  REDIS_HOST: z.string().min(1, "REDIS_HOST is required"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  // CORS — "*" or a comma-separated allow-list of origins
  CORS_ORIGIN: z.string().default("*").transform(
    (value) => value === "*" ? "*" : value.split(",").map((origin) => origin.trim()).filter(Boolean)
  ),
  CORS_CREDENTIALS: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  // Bull Board — leave user/password unset locally to skip auth;
  // set both in dev/prod to require basic auth.
  BULL_BOARD_PATH: z.string().default("/admin/queues"),
  BULL_BOARD_USER: z.string().optional(),
  BULL_BOARD_PASSWORD: z.string().optional(),
  // AI / LLM
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required")
});
var parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("\u274C Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}
var env = parsed.data;

// src/shared/utils/logger.ts
var LEVEL_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};
var MIN_PRIORITY = env.NODE_ENV === "production" ? LEVEL_PRIORITY.info : LEVEL_PRIORITY.debug;
function format(level, message, meta) {
  const line = `${(/* @__PURE__ */ new Date()).toISOString()} ${level.toUpperCase().padEnd(5)} ${message}`;
  if (meta === void 0) {
    return line;
  }
  const detail = typeof meta === "string" ? meta : JSON.stringify(meta);
  return `${line} ${detail}`;
}
function emit(level, message, meta) {
  if (LEVEL_PRIORITY[level] < MIN_PRIORITY) {
    return;
  }
  const line = format(level, message, meta);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}
var logger = {
  debug: (message, meta) => emit("debug", message, meta),
  info: (message, meta) => emit("info", message, meta),
  warn: (message, meta) => emit("warn", message, meta),
  error: (message, meta) => emit("error", message, meta)
};
var baseOption = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD
};
var redisConnection = new IORedis({
  ...baseOption,
  enableReadyCheck: true,
  connectTimeout: 1e4,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2e3),
  reconnectOnError: (err) => err.message.includes("READONLY"),
  lazyConnect: false
});
function attachListeners(client, name) {
  client.on("connect", () => console.log(`\u2705 ${name} connected`));
  client.on("ready", () => console.log(`\u2705 ${name} ready`));
  client.on("error", (err) => console.error(`\u274C ${name} error:`, err));
  client.on("close", () => console.log(`\u26A0\uFE0F  ${name} connection closed`));
  client.on("reconnecting", () => console.log(`\u{1F504} ${name} reconnecting...`));
}
attachListeners(redisConnection, "Redis");

// src/queues/connection.ts
var bullConnection = new IORedis({
  ...baseOption,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// src/queues/worker.ts
var workers = [
  // registerWorker(QUEUE_NAMES.EMAIL, async (job) => {
  //   switch (job.name) {
  //     case JOB_NAMES.EMAIL.WELCOME: return sendWelcome(job.data);
  //   }
  // }),
];
logger.info(`\u{1F6E0}  Worker process started \u2014 ${workers.length} worker(s) active`);
var shutdown = async (signal) => {
  logger.info(`${signal} received \u2014 closing workers...`);
  await Promise.all(workers.map((worker) => worker.close()));
  await bullConnection.quit();
  process.exit(0);
};
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
//# sourceMappingURL=worker.js.map
//# sourceMappingURL=worker.js.map