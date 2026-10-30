import { z } from "zod";

export const semanticSearchQuerySchema = z.object({
  q: z.string().optional(),
  query: z.string().optional(),
  community_id: z.string().uuid("Invalid community ID format").optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  threshold: z.coerce.number().min(0).max(1).default(0.22),
  weight_similarity: z.coerce.number().min(0).max(1).default(0.70),
  weight_feedback: z.coerce.number().min(0).max(1).default(0.30),
});

export const semanticSearchBodySchema = z.object({
  query: z.string().min(1, "Query is required").max(1000, "Query is too long"),
  community_id: z.string().uuid("Invalid community ID format").optional(),
  limit: z.number().int().min(1).max(50).default(10),
  threshold: z.number().min(0).max(1).default(0.22),
  weight_similarity: z.number().min(0).max(1).default(0.70),
  weight_feedback: z.number().min(0).max(1).default(0.30),
});

export const backfillEmbeddingsSchema = z.object({
  batch_size: z.coerce.number().int().min(1).max(500).default(50),
});
