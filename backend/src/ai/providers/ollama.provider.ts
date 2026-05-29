import {
  type AIMessageChunk,
  type BaseMessage,
  type UsageMetadata,
} from "@langchain/core/messages";
import { ChatOllama } from "@langchain/ollama";

import { env } from "@/config";
import { logger } from "@/shared";
import { InternalServerError } from "@/shared/utils/app-error";

import { AI_DEFAULTS, MODELS } from "../ai.constants";
import type { StreamChunk } from "../ai.types";

export class OllamaProvider {
  public readonly name = "ollama";
  private readonly client: ChatOllama;

  constructor() {
    this.client = new ChatOllama({
      baseUrl: env.OLLAMA_BASE_URL,
      model: MODELS.OLLAMA,
      maxRetries: 2,
      temperature: AI_DEFAULTS.TEMPERATURE,
    });
  }

  async *stream(messages: BaseMessage[]): AsyncGenerator<StreamChunk> {
    try {
      const stream = await this.client.stream(messages);

      let usage: UsageMetadata | undefined;
      let responseMetadata: Record<string, unknown> = {};

      for await (const chunk of stream) {
        if (chunk.usage_metadata) {
          usage = chunk.usage_metadata;
        }
        if (
          chunk.response_metadata &&
          Object.keys(chunk.response_metadata).length > 0
        ) {
          responseMetadata = {
            ...responseMetadata,
            ...chunk.response_metadata,
          };
        }

        const delta = this.extractText(chunk);
        if (delta) {
          yield { delta, done: false };
        }
      }

      this.logCompletion(usage, responseMetadata);
      yield { delta: "", done: true };
    } catch (error) {
      console.log(error);
      logger.error(
        "Ollama stream request failed",
        error instanceof Error ? error.message : String(error)
      );
      throw new InternalServerError(
        "Failed to stream a response from the language model"
      );
    }
  }

  private extractText(chunk: AIMessageChunk): string {
    if (typeof chunk.content === "string") {
      return chunk.content;
    }
    return chunk.content
      .map((part) =>
        "text" in part && typeof part.text === "string" ? part.text : ""
      )
      .join("");
  }

  private logCompletion(
    usage: UsageMetadata | undefined,
    responseMetadata: Record<string, unknown>
  ): void {
    // Ollama reports durations in nanoseconds.
    const nsToMs = (ns: unknown): number | undefined =>
      typeof ns === "number" ? Math.round(ns / 1e6) : undefined;

    logger.info("Ollama stream completed", {
      model: responseMetadata["model"] ?? MODELS.OLLAMA,
      doneReason: responseMetadata["done_reason"],
      inputTokens: usage?.input_tokens,
      outputTokens: usage?.output_tokens,
      totalTokens: usage?.total_tokens,
      promptEvalCount: responseMetadata["prompt_eval_count"],
      evalCount: responseMetadata["eval_count"],
      totalDurationMs: nsToMs(responseMetadata["total_duration"]),
      loadDurationMs: nsToMs(responseMetadata["load_duration"]),
    });
  }
}

export const ollamaProvider = new OllamaProvider();
