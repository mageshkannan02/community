import { Request, Response } from "express";
import { asyncHandler, ApiResponse } from "../utils";
import {
  detectDuplicateQuerySchema,
  detectDuplicateBodySchema,
} from "../validators/duplicate_detection_validator";
import * as duplicateDetectionService from "../services/duplicate_detection_service";

/**
 * Handle AI-Powered Duplicate Question Detection before publishing
 */
export const handle_detect_duplicates = asyncHandler(async (req: Request, res: Response) => {
  const isPost = req.method === "POST";
  const userId = (req as any).user?.user_id;

  let query: string = "";
  let content: string | undefined;
  let community_id: string | undefined;
  let limit: number = 5;
  let threshold: number = 0.20;

  if (isPost) {
    const parsed = detectDuplicateBodySchema.parse(req.body);
    query = (parsed.query || parsed.title || "").trim();
    content = parsed.content?.trim();
    community_id = parsed.community_id;
    limit = parsed.limit;
    threshold = parsed.threshold;
  } else {
    const parsed = detectDuplicateQuerySchema.parse(req.query);
    query = (parsed.query || parsed.title || parsed.q || "").trim();
    content = parsed.content?.trim();
    community_id = parsed.community_id;
    limit = parsed.limit;
    threshold = parsed.threshold;
  }

  // Handle empty query
  if (!query) {
    return ApiResponse.success(
      res,
      {
        query: "",
        is_duplicate_detected: false,
        highest_similarity: 0,
        total_matches: 0,
        duplicates: [],
        model_info: null,
        status: "empty_query",
        message: "Question query is required to evaluate duplicates.",
      },
      "Empty question query provided",
      200
    );
  }

  const result = await duplicateDetectionService.detectDuplicateQuestions({
    query,
    content,
    community_id,
    user_id: userId,
    limit,
    threshold,
  });

  return ApiResponse.success(
    res,
    result,
    result.is_duplicate_detected
      ? `Potential duplicates detected (${result.duplicates.length} matches)`
      : "No duplicate questions detected"
  );
});
