import IORedis from "ioredis";
import { baseOption } from "@/config";

export class RedisPubSubService {
  private publisher: IORedis;

  constructor() {
    this.publisher = new IORedis({ ...baseOption });
  }

  async publish<T>(channel: string, payload: T): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(payload));
  }

  // Creates a dedicated subscriber connection (IORedis in subscribe mode cannot
  // be reused for other commands). Returns an async cleanup fn.
  async subscribe<T>(
    channel: string,
    onMessage: (payload: T) => void
  ): Promise<() => Promise<void>> {
    const subscriber = new IORedis({ ...baseOption });
    await subscriber.subscribe(channel);

    subscriber.on("message", (_ch, raw) => {
      onMessage(JSON.parse(raw) as T);
    });

    return async () => {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    };
  }

  async quit(): Promise<void> {
    await this.publisher.quit();
  }
}

export const redisPubSub = new RedisPubSubService();
