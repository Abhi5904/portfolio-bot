// ─── Queue names ──────────────────────────────────────────────────────────────
// Key = how you reference it in code, value = the string stored in Redis.
export const QUEUE_NAMES = {
  // EMAIL: "email",
  // CHAT: "chat",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Job names, grouped by the queue they run on ────────────────────────────────
// One queue can carry several job types; group them so a queue's jobs stay
// together and `JOB_NAMES.<QUEUE>.<JOB>` reads naturally.
export const JOB_NAMES = {
  // [QUEUE_NAMES.EMAIL]: {
  //   WELCOME: "welcome",
  //   RESET_PASSWORD: "reset-password",
  // },
  // [QUEUE_NAMES.CHAT]: {
  //   GENERATE_REPLY: "generate-reply",
  // },
} as const;
