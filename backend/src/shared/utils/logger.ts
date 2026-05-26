import { env } from "@/config/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Production hides debug noise; everywhere else logs everything.
const MIN_PRIORITY =
  env.NODE_ENV === "production" ? LEVEL_PRIORITY.info : LEVEL_PRIORITY.debug;

function format(level: LogLevel, message: string, meta?: unknown): string {
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${message}`;
  if (meta === undefined) {
    return line;
  }
  const detail = typeof meta === "string" ? meta : JSON.stringify(meta);
  return `${line} ${detail}`;
}

function emit(level: LogLevel, message: string, meta?: unknown): void {
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

export const logger = {
  debug: (message: string, meta?: unknown) => emit("debug", message, meta),
  info: (message: string, meta?: unknown) => emit("info", message, meta),
  warn: (message: string, meta?: unknown) => emit("warn", message, meta),
  error: (message: string, meta?: unknown) => emit("error", message, meta),
};
