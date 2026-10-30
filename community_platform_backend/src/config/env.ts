import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL environment variable is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET environment variable is required"),
  JWT_EXPIRES_IN: z.union([z.string(), z.number()]).default("1h"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET environment variable is required"),
  JWT_REFRESH_EXPIRES_IN: z.union([z.string(), z.number()]).default("7d"),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET_NAME: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  AWS_S3_ENDPOINT: z.string().optional(),
  AWS_CLOUDFRONT_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  EMBEDDING_PROVIDER: z.enum(["local", "openai", "gemini"]).default("local"),
  EMBEDDING_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("gemma3:1b"),
  OLLAMA_ENABLED: z.string().default("true"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment configuration");
}

export const env = {
  ..._env.data,
  AWS_S3_BUCKET_NAME: _env.data.AWS_S3_BUCKET_NAME || _env.data.S3_BUCKET || "community-platform-attachments",
};
