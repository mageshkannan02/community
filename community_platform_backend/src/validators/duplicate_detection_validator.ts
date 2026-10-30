import { z } from "zod";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const detectDuplicateQuerySchema = z.object({
  q: z.string().optional(),
  query: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  community_id: z
    .string()
    .optional()
    .transform((val) => (val && UUID_REGEX.test(val) ? val : undefined)),
  limit: z.coerce.number().int().min(1).max(20).default(5),
  threshold: z.coerce.number().min(0).max(1).default(0.20),
});

export const detectDuplicateBodySchema = z
  .object({
    query: z.string().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    community_id: z
      .string()
      .optional()
      .transform((val) => (val && UUID_REGEX.test(val) ? val : undefined)),
    limit: z.number().int().min(1).max(20).default(5),
    threshold: z.number().min(0).max(1).default(0.20),
  })
  .refine(
    (data) =>
      (data.query && data.query.trim().length > 0) ||
      (data.title && data.title.trim().length > 0),
    {
      message: "Either query or title is required",
      path: ["query"],
    }
  );
