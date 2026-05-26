export const MODELS = {
  OLLAMA: "qwen3:8b",
  OLLAMA_EMBED: "nomic-embed-text:latest",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

export const AI_DEFAULTS = {
  MAX_TOKENS: 1024,
  TEMPERATURE: 0.7,
} as const;
