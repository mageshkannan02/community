import { Request, Response } from "express";
import { asyncHandler, ApiResponse } from "../utils";
import {
  semanticSearchQuerySchema,
  semanticSearchBodySchema,
  backfillEmbeddingsSchema,
} from "../validators/semantic_search_validator";
import * as semanticSearchService from "../services/semantic_search_service";
import * as embeddingService from "../services/embedding_service";

/**
 * Handle Semantic Knowledge Search for Discussions (GET and POST)
 */
export const handle_semantic_search = asyncHandler(async (req: Request, res: Response) => {
  // Support either GET query params or POST request body
  const isPost = req.method === "POST";
  const userId = (req as any).user?.user_id;

  let query: string = "";
  let community_id: string | undefined;
  let limit: number = 10;
  let threshold: number = 0.22;
  let weight_similarity: number = 0.70;
  let weight_feedback: number = 0.30;

  if (isPost) {
    const parsed = semanticSearchBodySchema.parse(req.body);
    query = parsed.query;
    community_id = parsed.community_id;
    limit = parsed.limit;
    threshold = parsed.threshold;
    weight_similarity = parsed.weight_similarity;
    weight_feedback = parsed.weight_feedback;
  } else {
    const parsed = semanticSearchQuerySchema.parse(req.query);
    query = (parsed.q || parsed.query || "").trim();
    community_id = parsed.community_id;
    limit = parsed.limit;
    threshold = parsed.threshold;
    weight_similarity = parsed.weight_similarity;
    weight_feedback = parsed.weight_feedback;
  }

  // Handle empty query edge case
  if (!query) {
    return ApiResponse.success(
      res,
      {
        query: "",
        total_matches: 0,
        results: [],
        model_info: null,
        status: "empty_query",
        message: "Search query cannot be empty. Please provide keywords or questions.",
      },
      "Empty search query provided",
      200
    );
  }

  const result = await semanticSearchService.searchDiscussionsSemantic({
    query,
    community_id,
    user_id: userId,
    limit,
    threshold,
    weight_similarity,
    weight_feedback,
  });

  return ApiResponse.success(
    res,
    result,
    result.status === "model_failure"
      ? "Semantic search service degraded, fallback results returned"
      : "Semantic search completed successfully"
  );
});

/**
 * Handle Backfill of Semantic Embeddings for Existing Discussions
 */
export const handle_backfill_embeddings = asyncHandler(async (req: Request, res: Response) => {
  const parsed = backfillEmbeddingsSchema.parse(req.body || req.query);
  const backfillResult = await embeddingService.backfillExistingDiscussions(parsed.batch_size);

  return ApiResponse.success(
    res,
    backfillResult,
    `Backfill processed ${backfillResult.processed} discussions successfully (${backfillResult.failed} failed)`
  );
});
