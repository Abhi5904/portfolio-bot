import cors from 'cors';
import express, { Router } from 'express';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import 'dotenv/config';
import z3, { z, ZodError } from 'zod';
import IORedis from 'ioredis';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { timingSafeEqual } from 'crypto';
import 'bullmq';
import Anthropic from '@anthropic-ai/sdk';

// src/app.ts
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

// src/config/db.ts
var pool = new Pool({
  connectionString: env.DATABASE_URL
});
var adapter = new PrismaPg(pool);
var prisma = new PrismaClient({ adapter });
var DatabaseService = class _DatabaseService {
  static instance;
  client;
  constructor() {
    this.client = prisma;
  }
  static getInstance() {
    if (!_DatabaseService.instance) {
      _DatabaseService.instance = new _DatabaseService();
    }
    return _DatabaseService.instance;
  }
  getClient() {
    return this.client;
  }
  async connect() {
    try {
      await this.client.$connect();
      console.log("\u2705 Database connected successfully");
    } catch (error) {
      console.error("\u274C Database connection failed:", error);
      throw error;
    }
  }
  async disconnect() {
    try {
      await this.client.$disconnect();
      console.log("Database disconnected");
    } catch (error) {
      console.error("Error disconnecting from database:", error);
      throw error;
    }
  }
  async healthCheck() {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }
};
var databaseService = DatabaseService.getInstance();
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
var safeQuit = async (client) => {
  const activeStatuses = ["ready", "connecting", "reconnecting", "connect"];
  if (activeStatuses.includes(client.status)) {
    await client.quit();
  }
};

// src/shared/utils/async-handler.ts
var asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// src/shared/utils/app-error.ts
var AppError = class _AppError extends Error {
  statusCode;
  isOperational;
  timestamp;
  constructor(statusCode, message, isOperational = true, stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = (/* @__PURE__ */ new Date()).toISOString();
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
    Object.setPrototypeOf(this, _AppError.prototype);
  }
};
var InternalServerError = class extends AppError {
  constructor(message = "Internal Server Error") {
    super(500, message);
  }
};
var BaseValidator = class {
  validateBody(schema) {
    return schema;
  }
  validateQuery(schema) {
    return schema;
  }
  validateParams(schema) {
    return schema;
  }
  paginationQuery() {
    return z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(10)
    });
  }
};

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
function errorMiddleware(err, _req, res, _next) {
  const isDev = env.NODE_ENV === "development";
  if (err instanceof ZodError) {
    const response2 = {
      success: false,
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      })),
      ...isDev && { stack: err.stack }
    };
    res.status(400).json(response2);
    return;
  }
  if (err instanceof AppError) {
    const response2 = {
      success: false,
      message: err.message,
      ...isDev && { stack: err.stack }
    };
    res.status(err.statusCode).json(response2);
    return;
  }
  const message = isDev && err instanceof Error ? err.message : "Internal server error";
  const response = {
    success: false,
    message,
    ...isDev && err instanceof Error && { stack: err.stack }
  };
  res.status(500).json(response);
}
var notFoundMiddleware = (req, _res, next) => {
  const error = new AppError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

// src/shared/middleware/validation.middleware.ts
var validate = (schemas) => {
  return async (req, _res, next) => {
    try {
      req.validated = {
        body: void 0,
        query: void 0,
        params: void 0
      };
      if (schemas.body) {
        req.validated.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.validated.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.validated.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

// src/shared/middleware/logger.middleware.ts
var requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`;
    if (res.statusCode >= 500) {
      logger.error(line);
    } else if (res.statusCode >= 400) {
      logger.warn(line);
    } else {
      logger.info(line);
    }
  });
  next();
};
function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
var basicAuth = ({
  user,
  password,
  realm = "Restricted"
}) => {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (header?.startsWith("Basic ")) {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      const candidateUser = decoded.slice(0, separator);
      const candidatePass = decoded.slice(separator + 1);
      if (safeEqual(candidateUser, user) && safeEqual(candidatePass, password)) {
        next();
        return;
      }
    }
    res.set("WWW-Authenticate", `Basic realm="${realm}"`);
    res.status(401).send("Authentication required");
  };
};
new IORedis({
  ...baseOption,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// src/queues/index.ts
var queues = {};
var allQueues = () => Object.values(queues);

// src/queues/bull-board.ts
function mountBullBoard(app) {
  const path = env.BULL_BOARD_PATH;
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(path);
  createBullBoard({
    queues: allQueues().map((queue) => new BullMQAdapter(queue)),
    serverAdapter
  });
  const guards = [];
  if (env.BULL_BOARD_USER && env.BULL_BOARD_PASSWORD) {
    guards.push(
      basicAuth({
        user: env.BULL_BOARD_USER,
        password: env.BULL_BOARD_PASSWORD,
        realm: "Bull Board"
      })
    );
    logger.info(`\u{1F4CA} Bull Board mounted at ${path} (auth enabled)`);
  } else {
    logger.warn(`\u{1F4CA} Bull Board mounted at ${path} (no auth \u2014 local mode)`);
  }
  app.use(path, ...guards, serverAdapter.getRouter());
}

// src/ai/ai.constants.ts
var MODELS = {
  // Everyday chat model — good quality/cost balance for the portfolio bot.
  DEFAULT: "claude-sonnet-4-6"};
var AI_DEFAULTS = {
  MAX_TOKENS: 1024,
  TEMPERATURE: 0.7
};
var AnthropicProvider = class {
  name = "anthropic";
  client;
  constructor(apiKey = env.ANTHROPIC_API_KEY) {
    this.client = new Anthropic({ apiKey });
  }
  async chat(request) {
    const model = request.model ?? MODELS.DEFAULT;
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: request.maxTokens ?? AI_DEFAULTS.MAX_TOKENS,
        temperature: request.temperature ?? AI_DEFAULTS.TEMPERATURE,
        system: request.system,
        stop_sequences: request.stopSequences,
        messages: request.messages
      });
      const content = response.content.filter((block) => block.type === "text").map((block) => block.text).join("");
      return {
        content,
        model: response.model,
        stopReason: response.stop_reason,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };
    } catch (error) {
      logger.error("Anthropic chat request failed", this.describe(error));
      throw new InternalServerError(
        "Failed to generate a response from the language model"
      );
    }
  }
  async *stream(request) {
    const model = request.model ?? MODELS.DEFAULT;
    try {
      const events = await this.client.messages.create({
        model,
        max_tokens: request.maxTokens ?? AI_DEFAULTS.MAX_TOKENS,
        temperature: request.temperature ?? AI_DEFAULTS.TEMPERATURE,
        system: request.system,
        stop_sequences: request.stopSequences,
        messages: request.messages,
        stream: true
      });
      for await (const event of events) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { delta: event.delta.text, done: false };
        }
      }
      yield { delta: "", done: true };
    } catch (error) {
      logger.error("Anthropic stream request failed", this.describe(error));
      throw new InternalServerError(
        "Failed to stream a response from the language model"
      );
    }
  }
  describe(error) {
    return error instanceof Error ? error.message : String(error);
  }
};
var ConversationsValidation = class extends BaseValidator {
  list = {
    query: this.paginationQuery().extend({
      search: z3.string().optional()
    })
  };
};

// src/modules/conversations/conversations.routes.ts
var ConversationsRoutes = class {
  constructor(conversationsController2) {
    this.conversationsController = conversationsController2;
    this.router = Router();
    this.validation = new ConversationsValidation();
    this.initializeRoutes();
  }
  conversationsController;
  router;
  validation;
  initializeRoutes() {
    this.router.get(
      "/",
      validate(this.validation.list),
      this.conversationsController.list
    );
  }
};

// src/modules/conversations/conversations.controller.ts
var ConversationsController = class {
  constructor(conversationsService2) {
    this.conversationsService = conversationsService2;
  }
  conversationsService;
  list = asyncHandler(async (req, res) => {
    const result = await this.conversationsService.list(req.validated.query);
    res.json({ success: true, data: result });
  });
};

// src/modules/conversations/conversations.service.ts
var ConversationsService = class {
  async list(query) {
    const { limit, page, search } = query;
  }
};

// src/container.ts
new AnthropicProvider();
var conversationsService = new ConversationsService();
var conversationsController = new ConversationsController(
  conversationsService
);
var conversationsRoutes = new ConversationsRoutes(
  conversationsController
);

// src/routes.ts
var PRIVATE_ROUTES = [
  { path: "/conversations", router: conversationsRoutes.router }
];
var PUBLIC_ROUTES = [];
var Routes = class {
  API_PREFIX = "/api";
  API_VERSION = "/v1";
  API_PUBLIC_PREFIX = "/public";
  registerGroup(app, basePath, routes) {
    routes.forEach(({ path, router, middleware = [] }) => {
      app.use(
        `${this.API_PREFIX}${this.API_VERSION}${basePath}${path}`,
        ...middleware,
        router
      );
    });
  }
  register(app) {
    this.registerGroup(app, "", PRIVATE_ROUTES);
    this.registerGroup(app, this.API_PUBLIC_PREFIX, PUBLIC_ROUTES);
  }
};

// src/app.ts
var App = class {
  app;
  router;
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
    this.app.get("/", (_req, res) => {
      return res.send("Portfolio Bot Backend!!!!");
    });
    this.app.get("/health", async (_req, res) => {
      const databaseUp = await databaseService.healthCheck();
      let redisUp = false;
      try {
        redisUp = await redisConnection.ping() === "PONG";
      } catch {
        redisUp = false;
      }
      const healthy = databaseUp && redisUp;
      res.status(healthy ? 200 : 503).json({
        status: healthy ? "ok" : "degraded",
        services: {
          database: databaseUp ? "up" : "down",
          redis: redisUp ? "up" : "down"
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    mountBullBoard(this.app);
    this.router.register(this.app);
  }
  initializeErrorHandling() {
    this.app.use(notFoundMiddleware);
    this.app.use(errorMiddleware);
  }
  getApp() {
    return this.app;
  }
};

// src/server.ts
var Server = class {
  app;
  port;
  isShuttingDown = false;
  constructor() {
    this.app = new App();
    this.port = env.PORT;
  }
  async start() {
    try {
      await databaseService.connect();
      await redisConnection.ping();
      logger.info("\u2705 Redis verified");
      const databaseUp = await databaseService.healthCheck();
      if (!databaseUp) {
        throw new Error("Database health check failed");
      }
      logger.info("\u2705 Health check passed");
      this.app.getApp().listen(this.port, () => {
        logger.info("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
        logger.info(`\u{1F680} Server running on port ${this.port}`);
        logger.info(`\u{1F4E6} Environment: ${env.NODE_ENV}`);
        logger.info(`\u{1F310} URL: http://localhost:${this.port}`);
        logger.info(`\u{1F3E5} Health: http://localhost:${this.port}/health`);
        logger.info("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
      });
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error("\u274C Failed to start server", error);
      process.exit(1);
    }
  }
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      if (this.isShuttingDown) {
        return;
      }
      this.isShuttingDown = true;
      logger.info(`${signal} received. Starting graceful shutdown...`);
      try {
        await safeQuit(redisConnection);
        logger.info("\u2705 Redis disconnected");
        await databaseService.disconnect();
        logger.info("\u2705 Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        logger.error("\u274C Error during graceful shutdown", error);
        process.exit(1);
      }
    };
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("uncaughtException", (error) => {
      logger.error("\u274C Uncaught Exception", error);
      gracefulShutdown("UNCAUGHT_EXCEPTION");
    });
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("\u274C Unhandled Rejection", { promise: String(promise), reason: String(reason) });
      gracefulShutdown("UNHANDLED_REJECTION");
    });
  }
};
var server = new Server();
server.start();
//# sourceMappingURL=server.js.map
//# sourceMappingURL=server.js.map