import IORedis from "ioredis";
import { env } from "./env";

export const baseOption = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
};

// ─── App Redis — YOUR IORedis instance for cache, sessions, rate limiting ─────
export const redisConnection = new IORedis({
  ...baseOption,
  enableReadyCheck: true,
  connectTimeout: 10000,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  reconnectOnError: (err: Error) => err.message.includes("READONLY"),
  lazyConnect: false,
});

function attachListeners(client: IORedis, name: string) {
  client.on("connect", () => console.log(`✅ ${name} connected`));
  client.on("ready", () => console.log(`✅ ${name} ready`));
  client.on("error", (err) => console.error(`❌ ${name} error:`, err));
  client.on("close", () => console.log(`⚠️  ${name} connection closed`));
  client.on("reconnecting", () => console.log(`🔄 ${name} reconnecting...`));
}

attachListeners(redisConnection, "Redis");

export const safeQuit = async (client: IORedis): Promise<void> => {
  const activeStatuses = ["ready", "connecting", "reconnecting", "connect"];
  if (activeStatuses.includes(client.status)) {
    await client.quit();
  }
};
