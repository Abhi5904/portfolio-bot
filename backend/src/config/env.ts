import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // App
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(8000),

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
  CORS_ORIGIN: z
    .string()
    .default("*")
    .transform((value) =>
      value === "*"
        ? "*"
        : value
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean)
    ),
  CORS_CREDENTIALS: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  // Bull Board — leave user/password unset locally to skip auth;
  // set both in dev/prod to require basic auth.
  BULL_BOARD_PATH: z.string().default("/admin/queues"),
  BULL_BOARD_USER: z.string().optional(),
  BULL_BOARD_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
