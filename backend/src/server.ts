import { App } from "./app";
import { env, databaseService, redisConnection, safeQuit } from "./config";
import { logger } from "./shared";

class Server {
  private app: App;
  private port: number;
  private isShuttingDown = false;

  constructor() {
    this.app = new App();
    this.port = env.PORT;
  }

  public async start(): Promise<void> {
    try {
      await databaseService.connect();

      await redisConnection.ping();
      logger.info("✅ Redis verified");

      // Only start accepting traffic once dependencies are confirmed healthy.
      const databaseUp = await databaseService.healthCheck();
      if (!databaseUp) {
        throw new Error("Database health check failed");
      }
      logger.info("✅ Health check passed");

      this.app.getApp().listen(this.port, () => {
        logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        logger.info(`🚀 Server running on port ${this.port}`);
        logger.info(`📦 Environment: ${env.NODE_ENV}`);
        logger.info(`🌐 URL: http://localhost:${this.port}`);
        logger.info(`🏥 Health: http://localhost:${this.port}/health`);
        logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      });

      this.setupGracefulShutdown();
    } catch (error) {
      logger.error("❌ Failed to start server", error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        return;
      }
      this.isShuttingDown = true;

      logger.info(`${signal} received. Starting graceful shutdown...`);
      try {
        await safeQuit(redisConnection);
        logger.info("✅ Redis disconnected");

        await databaseService.disconnect();
        logger.info("✅ Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        logger.error("❌ Error during graceful shutdown", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("uncaughtException", (error) => {
      logger.error("❌ Uncaught Exception", error);
      gracefulShutdown("UNCAUGHT_EXCEPTION");
    });
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("❌ Unhandled Rejection", { promise: String(promise), reason: String(reason) });
      gracefulShutdown("UNHANDLED_REJECTION");
    });
  }
}

const server = new Server();
server.start();
