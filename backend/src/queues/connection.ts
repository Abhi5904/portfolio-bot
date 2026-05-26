import IORedis from "ioredis";
import { baseOption } from "@/config/redis";

// Dedicated Redis connection for BullMQ. Workers issue blocking commands, so
// BullMQ requires `maxRetriesPerRequest: null` — kept separate from the app's
// `redisConnection` (cache / sessions / rate limiting) which uses retries.
export const bullConnection = new IORedis({
  ...baseOption,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
