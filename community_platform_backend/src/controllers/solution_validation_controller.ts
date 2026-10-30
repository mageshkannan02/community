import { Response, Request } from "express";
import { ApiResponse, asyncHandler, BadRequestError, UnauthorizedError } from "../utils";
import * as solutionValidationService from "../services/solution_validation_service";
import { notifySolutionVerified, notifySolutionUpvoted } from "../services/notification_service";
import {
  submitValidationReportSchema,
  confirmOpResolutionSchema,
  flagSolutionSchema,
} from "../validators/solution_validation_validator";
import { prisma } from "../config/prisma";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveUserId(req: Request): Promise<string> {
  let userId = (req as any).user?.user_id || (req as any).user?.id;
  if (!userId && req.headers["x-user-id"] && typeof req.headers["x-user-id"] === "string" && UUID_REGEX.test(req.headers["x-user-id"])) {
    userId = req.headers["x-user-id"];
  }
  if (!userId && req.body?.userId && typeof req.body.userId === "string" && UUID_REGEX.test(req.body.userId)) {
    userId = req.body.userId;
  }
  if (!userId && req.query?.userId && typeof req.query.userId === "string" && UUID_REGEX.test(req.query.userId)) {
    userId = req.query.userId;
  }

  if (userId && UUID_REGEX.test(userId)) {
    const userExists = await prisma.users.findUnique({ where: { id: userId }, select: { id: true } });
    if (userExists) return userExists.id;
  }

  throw new UnauthorizedError("User authentication is required.");
}

export const submit_solution_validation = asyncHandler(
  async (req: Request, res: Response) => {
    const replyId = String(req.params.id || "");
    if (!replyId || !UUID_REGEX.test(replyId)) {
      throw new BadRequestError("Valid reply ID is required.");
    }

    const userId = await resolveUserId(req);
    const parsedData = submitValidationReportSchema.parse(req.body);

    const result = await solutionValidationService.submitValidationReport(
      replyId,
      userId,
      parsedData
    );

    return ApiResponse.success(
      res,
      result,
      "Validation report submitted successfully."
    );
  }
);

export const get_solution_validations = asyncHandler(
  async (req: Request, res: Response) => {
    const replyId = String(req.params.id || "");
    if (!replyId || !UUID_REGEX.test(replyId)) {
      throw new BadRequestError("Valid reply ID is required.");
    }

    let requestingUserId = (req as any).user?.user_id || (req as any).user?.id;
    if (!requestingUserId && req.query?.userId && typeof req.query.userId === "string" && UUID_REGEX.test(req.query.userId)) {
      requestingUserId = req.query.userId;
    }

    const metrics = await solutionValidationService.getReplyValidationMetrics(
      replyId,
      requestingUserId
    );

    return ApiResponse.success(
      res,
      metrics,
      "Solution validation details retrieved successfully."
    );
  }
);

export const confirm_op_resolution = asyncHandler(
  async (req: Request, res: Response) => {
    const replyId = String(req.params.id || "");
    if (!replyId || !UUID_REGEX.test(replyId)) {
      throw new BadRequestError("Valid reply ID is required.");
    }

    const userId = await resolveUserId(req);
    const parsedData = confirmOpResolutionSchema.parse(req.body || {});

    const updatedReply = await solutionValidationService.confirmOpResolution(
      replyId,
      userId,
      parsedData
    );

    if (!parsedData.unconfirm) {
      notifySolutionVerified({ replyId, verifierId: userId }).catch((e) =>
        console.error("Error triggering solution verified notification:", e)
      );
    }

    return ApiResponse.success(
      res,
      updatedReply,
      parsedData.unconfirm
        ? "Solution resolution unconfirmed."
        : "Solution confirmed by original poster successfully."
    );
  }
);

export const toggle_solution_upvote = asyncHandler(
  async (req: Request, res: Response) => {
    const replyId = String(req.params.id || "");
    if (!replyId || !UUID_REGEX.test(replyId)) {
      throw new BadRequestError("Valid reply ID is required.");
    }

    const userId = await resolveUserId(req);
    const result = await solutionValidationService.toggleSolutionUpvote(
      replyId,
      userId
    );

    if (result.upvoted) {
      notifySolutionUpvoted({ replyId, voterId: userId }).catch((e) =>
        console.error("Error triggering solution upvoted notification:", e)
      );
    }

    return ApiResponse.success(
      res,
      result,
      result.upvoted ? "Solution upvoted." : "Solution upvote removed."
    );
  }
);

export const flag_solution_review = asyncHandler(
  async (req: Request, res: Response) => {
    const replyId = String(req.params.id || "");
    if (!replyId || !UUID_REGEX.test(replyId)) {
      throw new BadRequestError("Valid reply ID is required.");
    }

    const userId = await resolveUserId(req);
    const parsedData = flagSolutionSchema.parse(req.body);

    const flagged = await solutionValidationService.flagSolutionForReview(
      replyId,
      userId,
      parsedData.reason
    );

    return ApiResponse.success(
      res,
      flagged,
      "Solution flagged for review."
    );
  }
);

export const unflag_solution_review = asyncHandler(
  async (req: Request, res: Response) => {
    const replyId = String(req.params.id || "");
    if (!replyId || !UUID_REGEX.test(replyId)) {
      throw new BadRequestError("Valid reply ID is required.");
    }

    const unflagged = await solutionValidationService.unflagSolutionReview(replyId);

    return ApiResponse.success(
      res,
      unflagged,
      "Solution review status cleared."
    );
  }
);

export const get_solution_evaluations = asyncHandler(
  async (req: Request, res: Response) => {
    const rawId = req.params.id || req.params.discussionId || req.query.discussionId;
    const discussionId = rawId ? String(rawId) : undefined;

    const evaluations = await solutionValidationService.getDiscussionSolutionEvaluations(
      discussionId && UUID_REGEX.test(discussionId) ? discussionId : undefined
    );

    return ApiResponse.success(
      res,
      evaluations,
      "Solution evaluation metrics calculated successfully."
    );
  }
);
