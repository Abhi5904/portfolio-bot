export const MODELS = {
  OLLAMA: "qwen3:8b",
  OLLAMA_EMBED: "nomic-embed-text:latest",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

export const AI_DEFAULTS = {
  MAX_TOKENS: 1024,
  TEMPERATURE: 0.7,
} as const;

export const RETRIEVAL = {
  // Number of chunks to pull from the vector store per question.
  K: 6,
  // Minimum normalized similarity (0–1) for a chunk to count as relevant.
  // Below this, the question is treated as having no supporting context.
  MIN_SCORE: 0.5,
} as const;

// Fallback system prompt used when no prompt is configured in the admin panel.
export const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant for a personal portfolio website. You answer questions about the portfolio owner using ONLY the context provided below.

Rules:
- Answer strictly from the provided context. Do not invent facts.
- If the context does not contain the answer, say you can only answer questions about the portfolio owner's background, skills, projects, and experience, and invite the user to ask about those.
- Be concise, friendly, and professional. Use the same language as the user's question.`;
